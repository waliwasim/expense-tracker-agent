export type Category =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Entertainment"
  | "Health"
  | "Other";

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  note: string;
  date: string; // YYYY-MM-DD
}

export interface Budgets {
  overall: number;
  Food: number;
  Transport: number;
  Shopping: number;
  Bills: number;
  Entertainment: number;
  Health: number;
  Other: number;
}
