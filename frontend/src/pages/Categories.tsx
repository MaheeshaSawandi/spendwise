import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import MonthPicker from "../components/MonthPicker";
import { currentMonth } from "../format";
import type { Budget, Category, TxType } from "../types";

const COLORS = ["#f97316", "#3b82f6", "#ef4444", "#a855f7", "#eab308", "#ec4899", "#16a34a", "#0d9488", "#64748b"];

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCategories = useCallback(
    () => api.categories().then(setCategories).catch((e) => setError(e.message)),
    []
  );
  const loadBudgets = useCallback(
    () => api.budgets(month).then(setBudgets).catch((e) => setError(e.message)),
    [month]
  );
  useEffect(() => void loadCategories(), [loadCategories]);
  useEffect(() => void loadBudgets(), [loadBudgets]);

  async function run(action: () => Promise<unknown>, success?: string) {
    setError("");
    setMessage("");
    try {
      await action();
      if (success) setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const expenseCats = categories.filter((c) => c.type === "expense");

  return (
    <div className="page">
      <div className="page-head">
        <h1>Categories & Budgets</h1>
      </div>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <section className="grid-2">
        {(["expense", "income"] as const).map((type) => (
          <CategoryList
            key={type}
            type={type}
            categories={categories.filter((c) => c.type === type)}
            onAdd={(name, color) =>
              run(async () => {
                await api.createCategory({ name, type, color });
                await loadCategories();
              }, `Added “${name}”`)
            }
            onRename={(c, name) =>
              run(async () => {
                await api.updateCategory(c.id, { name });
                await loadCategories();
              })
            }
            onDelete={(c) =>
              confirm(`Delete category “${c.name}”?`) &&
              run(async () => {
                await api.deleteCategory(c.id);
                await Promise.all([loadCategories(), loadBudgets()]);
              }, `Deleted “${c.name}”`)
            }
          />
        ))}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Monthly budgets</h2>
          <MonthPicker value={month} onChange={setMonth} />
        </div>
        <p className="muted">Set a spending limit for each expense category. The dashboard shows how close you are.</p>
        <div className="budget-grid">
          {expenseCats.map((c) => (
            <BudgetInput
              key={`${c.id}-${month}`}
              category={c}
              budget={budgets.find((b) => b.category.id === c.id)}
              onSave={(amount) =>
                run(async () => {
                  await api.setBudget(c.id, month, amount);
                  await loadBudgets();
                }, `Budget for ${c.name} saved`)
              }
              onClear={(b) =>
                run(async () => {
                  await api.deleteBudget(b.id);
                  await loadBudgets();
                }, `Budget for ${c.name} removed`)
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}

interface ListProps {
  type: TxType;
  categories: Category[];
  onAdd: (name: string, color: string) => void;
  onRename: (c: Category, name: string) => void;
  onDelete: (c: Category) => void;
}

function CategoryList({ type, categories, onAdd, onRename, onDelete }: ListProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[categories.length % COLORS.length]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), color);
    setName("");
  }

  return (
    <div className="card">
      <h2>{type === "expense" ? "Expense categories" : "Income categories"}</h2>
      <ul className="cat-list">
        {categories.map((c) => (
          <li key={c.id}>
            <span className="dot" style={{ background: c.color }} />
            <span className="grow">{c.name}</span>
            <button
              className="btn btn-small"
              onClick={() => {
                const newName = prompt("New name", c.name)?.trim();
                if (newName && newName !== c.name) onRename(c, newName);
              }}
            >
              Rename
            </button>
            <button className="btn btn-small btn-danger" onClick={() => onDelete(c)}>Delete</button>
          </li>
        ))}
      </ul>
      <form className="inline-form" onSubmit={submit}>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Colour" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${type} category`} maxLength={50} />
        <button className="btn btn-primary">Add</button>
      </form>
    </div>
  );
}

interface BudgetProps {
  category: Category;
  budget?: Budget;
  onSave: (amount: number) => void;
  onClear: (b: Budget) => void;
}

function BudgetInput({ category, budget, onSave, onClear }: BudgetProps) {
  const [value, setValue] = useState(budget ? String(budget.amount) : "");
  useEffect(() => setValue(budget ? String(budget.amount) : ""), [budget]);

  return (
    <form
      className="budget-item"
      onSubmit={(e) => {
        e.preventDefault();
        const amount = Number(value);
        if (amount > 0) onSave(Math.round(amount * 100) / 100);
      }}
    >
      <span><span className="dot" style={{ background: category.color }} />{category.name}</span>
      <div className="inline-form">
        <input type="number" min="0.01" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="No limit" />
        <button className="btn btn-small btn-primary">Save</button>
        {budget && (
          <button type="button" className="btn btn-small" onClick={() => onClear(budget)}>Clear</button>
        )}
      </div>
    </form>
  );
}
