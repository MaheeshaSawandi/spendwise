import { useState, type FormEvent } from "react";
import { api, type TxInput } from "../api";
import { today } from "../format";
import type { Category, Transaction, TxType } from "../types";

interface Props {
  categories: Category[];
  existing?: Transaction; // when set, the form edits instead of creating
  onSaved: () => void;
  onCancel: () => void;
}

export default function TransactionForm({ categories, existing, onSaved, onCancel }: Props) {
  const [type, setType] = useState<TxType>(existing?.type ?? "expense");
  const options = categories.filter((c) => c.type === type);
  const [categoryId, setCategoryId] = useState<number | "">(existing?.category.id ?? options[0]?.id ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [date, setDate] = useState(existing?.date ?? today());
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function changeType(t: TxType) {
    setType(t);
    setCategoryId(categories.find((c) => c.type === t)?.id ?? "");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!categoryId) return setError("Please choose a category");
    if (!(value > 0)) return setError("Amount must be greater than 0");

    const data: TxInput = { category_id: categoryId, amount: Math.round(value * 100) / 100, date, note };
    setSaving(true);
    setError("");
    try {
      if (existing) await api.updateTransaction(existing.id, data);
      else await api.createTransaction(data);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="segmented">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={type === t ? `active ${t}` : ""}
            onClick={() => changeType(t)}
          >
            {t === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      <label>
        Amount (LKR)
        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          autoFocus
          required
        />
      </label>

      <label>
        Category
        <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} required>
          {options.length === 0 && <option value="">No {type} categories yet</option>}
          {options.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label>
        Date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <label>
        Note <span className="muted">(optional)</span>
        <input value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Lunch with friends" />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : existing ? "Save changes" : "Add transaction"}
        </button>
      </div>
    </form>
  );
}
