from __future__ import annotations

from flask import Flask, jsonify, request


def create_app() -> Flask:
    app = Flask(__name__)

    @app.get("/api/health")
    def health() -> tuple[dict[str, str], int]:
        return {"status": "ok"}, 200

    @app.post("/api/echo")
    def echo() -> tuple[dict[str, str], int]:
        payload = request.get_json(silent=True) or {}
        message = payload.get("message", "")
        if not message:
            return {"error": "message is required"}, 400
        return jsonify({"message": message}), 200

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
