# Sample Flask API

This repository provides a minimal Flask application with a couple of API endpoints and accompanying tests.

## Setup

Create and activate a virtual environment, then install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Running the app

```bash
python app.py
```

The service listens on `http://localhost:5000` and exposes:

- `GET /api/health` — returns `{ "status": "ok" }` for basic health checking.
- `POST /api/echo` — accepts JSON `{ "message": "..." }` and echoes it back; responds with HTTP 400 if `message` is missing or empty.

## Testing

Run the test suite with:

```bash
pytest
```

## Slack/OpenAI/GitHub bot

The repository also includes a Slack bot (`slack_bot.py`) that connects Slack, OpenAI, and GitHub so you can ask repository questions from Slack:

1. Create a Slack app with the **Slash Commands** feature and add a `/repo-ask` command.
2. Set the following environment variables:
   - `SLACK_BOT_TOKEN`
   - `SLACK_SIGNING_SECRET`
   - `GITHUB_TOKEN`
   - `OPENAI_API_KEY`
3. Start the bot (for example with `python -m slack_bot` after wiring it into your preferred process runner). The `build_app_from_env()` helper returns a configured `SlackGitHubBot` with handlers registered.

Users can run `/repo-ask owner/repo What does this project do?` in Slack. The bot fetches a handful of text-based files from the repository, builds an OpenAI prompt with that context, and replies in the channel with the generated answer.
