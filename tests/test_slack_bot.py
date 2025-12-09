from __future__ import annotations

from types import SimpleNamespace

import slack_bot


class FakeContent:
    def __init__(self, path: str, content: str | None = None, *, is_dir: bool = False) -> None:
        self.path = path
        self.type = "dir" if is_dir else "file"
        self.decoded_content = (content or "").encode()


class FakeRepo:
    def __init__(self) -> None:
        self.full_name = "acme/widgets"
        self.files: dict[str, FakeContent] = {
            "README.md": FakeContent("README.md", "Hello"),
            "src/app.py": FakeContent("src/app.py", "print('hi')"),
            "docs/notes.txt": FakeContent("docs/notes.txt", "Important"),
        }
        self.directories: dict[str, list[FakeContent]] = {
            "": [FakeContent("README.md"), FakeContent("src", is_dir=True), FakeContent("docs", is_dir=True)],
            "src": [FakeContent("src/app.py")],
            "docs": [FakeContent("docs/notes.txt")],
        }

    def get_contents(self, path: str = "", ref: str | None = None):  # noqa: ANN001
        if path in self.directories:
            return self.directories[path]
        return self.files[path]


class FakeOpenAIChat:
    def __init__(self) -> None:
        self.seen_messages: list[dict[str, str]] = []

    def completions(self):
        raise NotImplementedError

    def create(self, model: str, messages):  # type: ignore[override] # noqa: ANN001
        self.seen_messages.extend(messages)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="answer"))])


class FakeOpenAI:
    def __init__(self) -> None:
        self.chat = SimpleNamespace(completions=FakeOpenAIChat())


class FakeGitHub:
    def __init__(self, repo: FakeRepo) -> None:
        self.repo = repo

    def get_repo(self, full_name: str) -> FakeRepo:  # noqa: ANN001
        assert full_name == self.repo.full_name
        return self.repo


class DummySlackApp:
    def __init__(self) -> None:
        self.handlers: dict[str, object] = {}

    def command(self, name: str):  # noqa: ANN001
        def decorator(func):
            self.handlers[name] = func
            return func

        return decorator


class DummySlackClient:
    def __init__(self) -> None:
        self.messages: list[str] = []

    def respond(self, text: str) -> None:
        self.messages.append(text)


def test_gather_repo_context_collects_files_in_order():
    repo = FakeRepo()
    context = slack_bot.gather_repo_context(repo, max_files=2)
    assert "README.md" in context
    assert "src/app.py" in context
    assert "docs/notes.txt" not in context


def test_build_prompt_adds_question_and_context():
    context = "Repository: acme/widgets\nBranch: main\n\n# README.md\nHello"
    prompt = slack_bot.build_prompt("What is this?", context)
    assert "What is this?" in prompt
    assert "Repository: acme/widgets" in prompt


def test_answer_question_uses_clients():
    repo = FakeRepo()
    github = FakeGitHub(repo)
    openai = FakeOpenAI()
    slack_app = DummySlackApp()
    bot = slack_bot.SlackGitHubBot(slack_app, openai, github, model="test-model")

    response = bot.answer_question("What is up?", repo.full_name)

    assert response == "answer"
    assert any("What is up?" in msg["content"] for msg in openai.chat.completions.seen_messages)
