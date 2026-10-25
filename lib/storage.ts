import { Expense, Budgets } from "./types";

const EXPENSES_KEY = "expenses_pkr";
const BUDGETS_KEY = "budgets_pkr";

export function loadExpenses(): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(EXPENSES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]) {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function loadBudgets(): Budgets {
  if (typeof window === "undefined") {
    return {
      overall: 50000,
      Food: 15000,
      Transport: 8000,
      Shopping: 5000,
      Bills: 10000,
      Entertainment: 4000,
      Health: 3000,
      Other: 5000,
    };
  }
  try {
    const raw = localStorage.getItem(BUDGETS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    overall: 50000,
    Food: 15000,
    Transport: 8000,
    Shopping: 5000,
    Bills: 10000,
    Entertainment: 4000,
    Health: 3000,
    Other: 5000,
  };
}

export function saveBudgets(budgets: Budgets) {
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}
