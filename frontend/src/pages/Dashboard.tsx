import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import MonthPicker from "../components/MonthPicker";
import { currentMonth, dateLabel, formatMoney, monthLabel } from "../format";
import type { MonthSummary, Transaction, TrendPoint } from "../types";

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    Promise.all([api.summary(month), api.trend(6, month), api.transactions({ month, page_size: 5 })])
      .then(([s, t, r]) => {
        setSummary(s);
        setTrend(t);
        setRecent(r.items);
      })
      .catch((e) => setError(e.message));
  }, [month]);

  const expenses = summary?.by_category.filter((c) => c.type === "expense" && c.total > 0) ?? [];
  const budgeted = summary?.by_category.filter((c) => c.budget) ?? [];
  const tooltipMoney = (v: unknown) => formatMoney(Number(v));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Dashboard</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      {error && <p className="error">{error}</p>}

      <section className="stats">
        <div className="stat">
          <span className="stat-label">Income</span>
          <span className="stat-value income">{formatMoney(summary?.income ?? 0)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Expenses</span>
          <span className="stat-value expense">{formatMoney(summary?.expense ?? 0)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Balance</span>
          <span className={`stat-value ${(summary?.balance ?? 0) < 0 ? "expense" : ""}`}>
            {formatMoney(summary?.balance ?? 0)}
          </span>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <h2>Spending by category</h2>
          {expenses.length === 0 ? (
            <Empty text={`No expenses in ${monthLabel(month)} yet.`} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expenses} dataKey="total" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {expenses.map((c) => (
                    <Cell key={c.category_id} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipMoney} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2>Last 6 months</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trend.map((p) => ({ ...p, label: monthLabel(p.month, true) }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} width={60} tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
              <Tooltip formatter={tooltipMoney} />
              <Legend />
              <Bar dataKey="income" name="Income" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <h2>Budgets</h2>
            <Link to="/categories">Set budgets →</Link>
          </div>
          {budgeted.length === 0 ? (
            <Empty text="No budgets set for this month." />
          ) : (
            <ul className="budget-list">
              {budgeted.map((c) => {
                const pct = Math.min(100, (c.total / c.budget!) * 100);
                const over = c.total > c.budget!;
                return (
                  <li key={c.category_id}>
                    <div className="budget-row">
                      <span><span className="dot" style={{ background: c.color }} />{c.name}</span>
                      <span className={over ? "expense" : "muted"}>
                        {formatMoney(c.total)} / {formatMoney(c.budget!)}
                      </span>
                    </div>
                    <div className="progress">
                      <div className={`progress-bar ${over ? "over" : pct > 80 ? "warn" : ""}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Recent transactions</h2>
            <Link to="/transactions">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <Empty text="Nothing here yet. Add your first transaction!" />
          ) : (
            <ul className="tx-list">
              {recent.map((t) => (
                <li key={t.id}>
                  <span className="dot" style={{ background: t.category.color }} />
                  <div className="tx-main">
                    <span>{t.note || t.category.name}</span>
                    <small className="muted">{t.category.name} · {dateLabel(t.date)}</small>
                  </div>
                  <span className={t.type}>{t.type === "expense" ? "−" : "+"}{formatMoney(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}
