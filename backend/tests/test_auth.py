from .conftest import register


def test_register_creates_user_and_default_categories(client):
    headers = register(client)
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == "maheesha@example.com"

    cats = client.get("/api/categories", headers=headers).json()
    assert {"Salary", "Food", "Transport"} <= {c["name"] for c in cats}


def test_duplicate_email_rejected(client):
    register(client)
    res = client.post(
        "/api/auth/register",
        json={"email": "MAHEESHA@example.com", "password": "secret123", "full_name": "X"},
    )
    assert res.status_code == 409


def test_login_success_and_wrong_password(client):
    register(client)
    ok = client.post("/api/auth/login", json={"email": "maheesha@example.com", "password": "secret123"})
    assert ok.status_code == 200
    assert ok.json()["access_token"]

    bad = client.post("/api/auth/login", json={"email": "maheesha@example.com", "password": "wrongpass"})
    assert bad.status_code == 401


def test_short_password_rejected(client):
    res = client.post(
        "/api/auth/register", json={"email": "a@example.com", "password": "123", "full_name": "A"}
    )
    assert res.status_code == 422


def test_protected_routes_need_token(client):
    assert client.get("/api/transactions").status_code == 401
    bad = {"Authorization": "Bearer not-a-real-token"}
    assert client.get("/api/transactions", headers=bad).status_code == 401
