export type TxType = "income" | "expense";

export interface User {
  id: number;
  email: string;
  full_name: string;
}

export interface Category {
  id: number;
  name: string;
  type: TxType;
  color: string;
}

export interface Transaction {
  id: number;
  type: TxType;
  amount: number;
  date: string; // YYYY-MM-DD
  note: string;
  category: Category;
}

export interface TransactionPage {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface Budget {
  id: number;
  month: string;
  amount: number;
  category: Category;
}

export interface CategoryTotal {
  category_id: number;
  name: string;
  color: string;
  type: TxType;
  total: number;
  budget: number | null;
}

export interface MonthSummary {
  month: string;
  income: number;
  expense: number;
  balance: number;
  by_category: CategoryTotal[];
}

export interface TrendPoint {
  month: string;
  income: number;
  expense: number;
}
