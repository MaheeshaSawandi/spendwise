from .conftest import category_id, register


def add_tx(client, auth, category, amount, date, note=""):
    res = client.post(
        "/api/transactions",
        headers=auth,
        json={"category_id": category_id(client, auth, category), "amount": amount, "date": date, "note": note},
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_create_read_update_delete(client, auth):
    tx = add_tx(client, auth, "Food", 1250.50, "2026-10-05", "Lunch")
    assert tx["type"] == "expense"
    assert tx["amount"] == 1250.5
    assert tx["category"]["name"] == "Food"

    got = client.get(f"/api/transactions/{tx['id']}", headers=auth)
    assert got.status_code == 200

    updated = client.put(
        f"/api/transactions/{tx['id']}",
        headers=auth,
        json={"amount": 999, "note": "Dinner", "category_id": category_id(client, auth, "Salary")},
    ).json()
    assert updated["amount"] == 999
    assert updated["note"] == "Dinner"
    assert updated["type"] == "income"  # type follows the new category

    assert client.delete(f"/api/transactions/{tx['id']}", headers=auth).status_code == 204
    assert client.get(f"/api/transactions/{tx['id']}", headers=auth).status_code == 404


def test_invalid_amount_rejected(client, auth):
    res = client.post(
        "/api/transactions",
        headers=auth,
        json={"category_id": category_id(client, auth, "Food"), "amount": -5, "date": "2026-10-01"},
    )
    assert res.status_code == 422


def test_filters_and_pagination(client, auth):
    add_tx(client, auth, "Food", 100, "2026-09-30", "rice")
    add_tx(client, auth, "Food", 200, "2026-10-01", "kottu")
    add_tx(client, auth, "Transport", 300, "2026-10-15", "bus")
    add_tx(client, auth, "Salary", 50000, "2026-10-25", "october salary")

    october = client.get("/api/transactions?month=2026-10", headers=auth).json()
    assert october["total"] == 3
    assert october["items"][0]["note"] == "october salary"  # newest first

    expenses = client.get("/api/transactions?month=2026-10&type=expense", headers=auth).json()
    assert expenses["total"] == 2

    search = client.get("/api/transactions?search=KOTTU", headers=auth).json()
    assert search["total"] == 1

    page2 = client.get("/api/transactions?page=2&page_size=3", headers=auth).json()
    assert len(page2["items"]) == 1 and page2["total"] == 4


def test_users_cannot_see_each_others_data(client, auth):
    tx = add_tx(client, auth, "Food", 100, "2026-10-01")
    other = register(client, email="other@example.com")

    assert client.get(f"/api/transactions/{tx['id']}", headers=other).status_code == 404
    assert client.delete(f"/api/transactions/{tx['id']}", headers=other).status_code == 404
    assert client.get("/api/transactions", headers=other).json()["total"] == 0

    # can't use someone else's category either
    res = client.post(
        "/api/transactions",
        headers=other,
        json={"category_id": category_id(client, auth, "Food"), "amount": 1, "date": "2026-10-01"},
    )
    assert res.status_code == 404


def test_csv_export(client, auth):
    add_tx(client, auth, "Food", 450, "2026-10-03", "Tea, bun")
    res = client.get("/api/transactions/export.csv?month=2026-10", headers=auth)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    lines = res.text.strip().splitlines()
    assert lines[0] == "Date,Type,Category,Amount,Note"
    assert lines[1] == '2026-10-03,expense,Food,450.00,"Tea, bun"'
