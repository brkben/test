import json

import pytest

from app import create_app


@pytest.fixture()
def client():
    app = create_app()
    app.config.update(TESTING=True)
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_echo_success(client):
    response = client.post(
        "/api/echo",
        data=json.dumps({"message": "Hello"}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 200
    assert response.get_json() == {"message": "Hello"}


def test_echo_missing_message(client):
    response = client.post(
        "/api/echo",
        data=json.dumps({}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "message is required"}
