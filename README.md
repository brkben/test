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
