import { useCallback, useEffect, useState } from "react";
import { api, type TxFilters } from "../api";
import Modal from "../components/Modal";
import TransactionForm from "../components/TransactionForm";
import { currentMonth, dateLabel, formatMoney } from "../format";
import type { Category, Transaction, TransactionPage, TxType } from "../types";

const PAGE_SIZE = 15;

export default function Transactions() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<TxFilters>({ month: currentMonth(), type: "", category_id: "", search: "", page: 1 });
  const [search, setSearch] = useState(""); // typed text, applied after a short pause
  const [data, setData] = useState<TransactionPage | null>(null);
  const [editing, setEditing] = useState<Transaction | "new" | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .transactions({ ...filters, page_size: PAGE_SIZE })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [filters]);

  useEffect(() => {
    api.categories().then(setCategories).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  // Debounce the search box so we don't call the API on every key press
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.search === search ? f : { ...f, search, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [search]);

  const update = (patch: Partial<TxFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  async function remove(tx: Transaction) {
    if (!confirm(`Delete this ${tx.type} of ${formatMoney(tx.amount)}?`)) return;
    try {
      await api.deleteTransaction(tx.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const shownCategories = categories.filter((c) => !filters.type || c.type === filters.type);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Transactions</h1>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => api.exportCsv(filters).catch((e) => setError(e.message))}>
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setEditing("new")}>+ Add transaction</button>
        </div>
      </div>

      <div className="card filters">
        <label>
          Month
          <input type="month" value={filters.month} onChange={(e) => update({ month: e.target.value })} />
        </label>
        <label>
          Type
          <select value={filters.type} onChange={(e) => update({ type: e.target.value as TxType | "", category_id: "" })}>
            <option value="">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </label>
        <label>
          Category
          <select
            value={filters.category_id}
            onChange={(e) => update({ category_id: e.target.value ? Number(e.target.value) : "" })}
          >
            <option value="">All</option>
            {shownCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="grow">
          Search notes
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. lunch" />
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card table-card">
        {data && data.items.length === 0 ? (
          <p className="empty">No transactions match these filters.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Note</th>
                <th className="num">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((t) => (
                <tr key={t.id}>
                  <td>{dateLabel(t.date)}</td>
                  <td>
                    <span className="dot" style={{ background: t.category.color }} />
                    {t.category.name}
                  </td>
                  <td className="muted">{t.note || "—"}</td>
                  <td className={`num ${t.type}`}>
                    {t.type === "expense" ? "−" : "+"}{formatMoney(t.amount)}
                  </td>
                  <td className="row-actions">
                    <button className="btn btn-small" onClick={() => setEditing(t)}>Edit</button>
                    <button className="btn btn-small btn-danger" onClick={() => remove(t)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="pager">
          <button className="btn btn-ghost" disabled={filters.page === 1} onClick={() => update({ page: (filters.page ?? 1) - 1 })}>
            ‹ Previous
          </button>
          <span className="muted">Page {filters.page} of {totalPages} · {data.total} transactions</span>
          <button className="btn btn-ghost" disabled={filters.page === totalPages} onClick={() => update({ page: (filters.page ?? 1) + 1 })}>
            Next ›
          </button>
        </div>
      )}

      {editing && (
        <Modal title={editing === "new" ? "Add transaction" : "Edit transaction"} onClose={() => setEditing(null)}>
          <TransactionForm
            categories={categories}
            existing={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
