from .conftest import category_id
from .test_transactions import add_tx


def test_category_crud(client, auth):
    res = client.post("/api/categories", headers=auth, json={"name": "Gym", "type": "expense", "color": "#123abc"})
    assert res.status_code == 201
    cat = res.json()

    dup = client.post("/api/categories", headers=auth, json={"name": "gym", "type": "expense"})
    assert dup.status_code == 409

    renamed = client.put(f"/api/categories/{cat['id']}", headers=auth, json={"name": "Fitness"}).json()
    assert renamed["name"] == "Fitness"

    assert client.delete(f"/api/categories/{cat['id']}", headers=auth).status_code == 204


def test_cannot_delete_category_in_use(client, auth):
    add_tx(client, auth, "Food", 100, "2026-10-01")
    res = client.delete(f"/api/categories/{category_id(client, auth, 'Food')}", headers=auth)
    assert res.status_code == 409


def test_budget_upsert(client, auth):
    food = category_id(client, auth, "Food")
    first = client.put("/api/budgets", headers=auth, json={"category_id": food, "month": "2026-10", "amount": 20000})
    assert first.status_code == 200
    second = client.put("/api/budgets", headers=auth, json={"category_id": food, "month": "2026-10", "amount": 25000})
    assert second.json()["id"] == first.json()["id"]  # updated, not duplicated
    assert second.json()["amount"] == 25000

    budgets = client.get("/api/budgets?month=2026-10", headers=auth).json()
    assert len(budgets) == 1

    salary = category_id(client, auth, "Salary")
    bad = client.put("/api/budgets", headers=auth, json={"category_id": salary, "month": "2026-10", "amount": 1})
    assert bad.status_code == 400


def test_month_summary(client, auth):
    add_tx(client, auth, "Salary", 80000, "2026-10-01")
    add_tx(client, auth, "Food", 15000, "2026-10-05")
    add_tx(client, auth, "Food", 5000, "2026-10-20")
    add_tx(client, auth, "Transport", 4000, "2026-10-07")
    add_tx(client, auth, "Food", 99999, "2026-09-30")  # other month, ignored
    client.put("/api/budgets", headers=auth,
               json={"category_id": category_id(client, auth, "Food"), "month": "2026-10", "amount": 18000})
    client.put("/api/budgets", headers=auth,
               json={"category_id": category_id(client, auth, "Health"), "month": "2026-10", "amount": 3000})

    s = client.get("/api/reports/summary?month=2026-10", headers=auth).json()
    assert s["income"] == 80000
    assert s["expense"] == 24000
    assert s["balance"] == 56000

    by_name = {c["name"]: c for c in s["by_category"]}
    assert by_name["Food"]["total"] == 20000
    assert by_name["Food"]["budget"] == 18000  # over budget
    assert by_name["Health"]["total"] == 0  # budget but no spending yet
    assert by_name["Health"]["budget"] == 3000


def test_trend(client, auth):
    add_tx(client, auth, "Salary", 1000, "2025-12-15")
    add_tx(client, auth, "Food", 300, "2026-01-02")
    add_tx(client, auth, "Food", 200, "2026-02-28")

    trend = client.get("/api/reports/trend?months=3&end_month=2026-02", headers=auth).json()
    assert [p["month"] for p in trend] == ["2025-12", "2026-01", "2026-02"]
    assert trend[0] == {"month": "2025-12", "income": 1000, "expense": 0}
    assert trend[2]["expense"] == 200
