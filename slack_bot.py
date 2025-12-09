from __future__ import annotations

import os
from typing import Iterable, Sequence

from github import Github, Repository
from openai import OpenAI
from slack_bolt import App

ALLOWED_EXTENSIONS: Sequence[str] = (".md", ".txt", ".py", ".js", ".ts", ".json", ".yaml", ".yml")


def _read_file_content(repo: Repository.Repository, content_path: str, max_chars: int) -> str:
    file_content = repo.get_contents(content_path)
    if file_content.type != "file":
        return ""
    decoded = file_content.decoded_content.decode("utf-8", errors="ignore")
    if len(decoded) > max_chars:
        return decoded[:max_chars] + "\n...\n[truncated]"
    return decoded


def gather_repo_context(
    repo: Repository.Repository,
    *,
    max_files: int = 5,
    max_chars_per_file: int = 4000,
    allowed_extensions: Iterable[str] = ALLOWED_EXTENSIONS,
    branch: str = "main",
) -> str:
    allowed = set(allowed_extensions)
    files_collected: list[str] = []
    context_sections: list[str] = []

    def _walk(path: str = "") -> None:
        nonlocal files_collected, context_sections
        if len(files_collected) >= max_files:
            return
        contents = repo.get_contents(path, ref=branch)
        for entry in contents:
            if len(files_collected) >= max_files:
                break
            if entry.type == "dir":
                _walk(entry.path)
            elif any(entry.path.lower().endswith(ext) for ext in allowed):
                files_collected.append(entry.path)
                body = _read_file_content(repo, entry.path, max_chars_per_file)
                context_sections.append(f"# {entry.path}\n{body}")

    _walk("")
    header = f"Repository: {repo.full_name}\nBranch: {branch}"
    if not context_sections:
        return header + "\n(No readable files found)"
    return header + "\n\n" + "\n\n".join(context_sections)


def build_prompt(question: str, repo_context: str) -> str:
    intro = "You are a helpful engineering assistant. Use the repository context to answer the question succinctly."
    return f"{intro}\n\n{repo_context}\n\nQuestion: {question}\nAnswer:"


class SlackGitHubBot:
    def __init__(
        self,
        slack_app: App,
        openai_client: OpenAI,
        github_client: Github,
        *,
        model: str = "gpt-4o-mini",
    ) -> None:
        self.slack_app = slack_app
        self.openai_client = openai_client
        self.github_client = github_client
        self.model = model

    def register_handlers(self) -> None:
        @self.slack_app.command("/repo-ask")
        def handle_repo_ask(ack, respond, command):  # type: ignore[no-redef]
            ack()
            text: str = command.get("text", "").strip()
            if not text:
                respond("Please provide a repository and a question: `owner/repo What does this do?`")
                return
            parts = text.split(maxsplit=1)
            if len(parts) != 2:
                respond("Usage: `/repo-ask owner/repo What does this do?`")
                return
            repo_name, question = parts
            respond("Working on it... this may take a moment.")
            try:
                answer = self.answer_question(question, repo_name)
            except Exception as exc:  # noqa: BLE001
                respond(f"I couldn't process that request: {exc}")
                return
            respond(answer)

    def answer_question(self, question: str, repo_full_name: str, *, branch: str = "main") -> str:
        repo = self.github_client.get_repo(repo_full_name)
        context = gather_repo_context(repo, branch=branch)
        prompt = build_prompt(question, context)
        completion = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
        )
        message = completion.choices[0].message.content
        return message or "I wasn't able to generate a response."


def build_app_from_env() -> SlackGitHubBot:
    slack_token = os.environ["SLACK_BOT_TOKEN"]
    slack_signing_secret = os.environ["SLACK_SIGNING_SECRET"]
    github_token = os.environ["GITHUB_TOKEN"]
    openai_api_key = os.environ["OPENAI_API_KEY"]

    slack_app = App(token=slack_token, signing_secret=slack_signing_secret)
    openai_client = OpenAI(api_key=openai_api_key)
    github_client = Github(github_token)

    bot = SlackGitHubBot(slack_app, openai_client, github_client)
    bot.register_handlers()
    return bot


if __name__ == "__main__":
    bot = build_app_from_env()
    port = int(os.environ.get("PORT", "3000"))
    bot.slack_app.start(port=port)
