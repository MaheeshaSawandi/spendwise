// Small wrapper around fetch() that adds the login token and handles errors.
import type {
  Budget,
  Category,
  MonthSummary,
  Transaction,
  TransactionPage,
  TrendPoint,
  TxType,
  User,
} from "./types";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const TOKEN_KEY = "spendwise_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// FastAPI returns errors as {detail: "..."} or {detail: [{msg: "..."}]} for validation errors
function errorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running?");
  }

  if (res.status === 401 && token) {
    tokenStore.clear();
    window.dispatchEvent(new Event("spendwise:logout"));
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, errorMessage(body, `Request failed (${res.status})`));
  }
  return res;
}

async function json<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await request(path, options);
  return res.status === 204 ? (undefined as T) : res.json();
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export interface TxFilters {
  month?: string;
  type?: TxType | "";
  category_id?: number | "";
  search?: string;
  page?: number;
  page_size?: number;
}

export interface TxInput {
  category_id: number;
  amount: number;
  date: string;
  note: string;
}

export const api = {
  // auth
  login: (email: string, password: string) =>
    json<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (full_name: string, email: string, password: string) =>
    json<{ access_token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ full_name, email, password }),
    }),
  me: () => json<User>("/api/auth/me"),

  // categories
  categories: () => json<Category[]>("/api/categories"),
  createCategory: (data: { name: string; type: TxType; color: string }) =>
    json<Category>("/api/categories", { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (id: number, data: { name?: string; color?: string }) =>
    json<Category>(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCategory: (id: number) => json<void>(`/api/categories/${id}`, { method: "DELETE" }),

  // transactions
  transactions: (f: TxFilters) => json<TransactionPage>(`/api/transactions${qs({ ...f })}`),
  createTransaction: (data: TxInput) =>
    json<Transaction>("/api/transactions", { method: "POST", body: JSON.stringify(data) }),
  updateTransaction: (id: number, data: Partial<TxInput>) =>
    json<Transaction>(`/api/transactions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTransaction: (id: number) => json<void>(`/api/transactions/${id}`, { method: "DELETE" }),
  exportCsv: async (f: TxFilters) => {
    const params = { month: f.month, type: f.type, category_id: f.category_id, search: f.search };
    const res = await request(`/api/transactions/export.csv${qs(params)}`);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${f.month || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // budgets
  budgets: (month: string) => json<Budget[]>(`/api/budgets${qs({ month })}`),
  setBudget: (category_id: number, month: string, amount: number) =>
    json<Budget>("/api/budgets", { method: "PUT", body: JSON.stringify({ category_id, month, amount }) }),
  deleteBudget: (id: number) => json<void>(`/api/budgets/${id}`, { method: "DELETE" }),

  // reports
  summary: (month: string) => json<MonthSummary>(`/api/reports/summary${qs({ month })}`),
  trend: (months: number, end_month: string) =>
    json<TrendPoint[]>(`/api/reports/trend${qs({ months, end_month })}`),
};
