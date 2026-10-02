const BUDGET_KEY = "budgetiq_budgets";

export interface BudgetLimits {
  totalMonthly: number | null;
  categories: Record<string, number>;
}

const DEFAULT: BudgetLimits = {
  totalMonthly: null,
  categories: {},
};

export function getBudgetLimits(): BudgetLimits {
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    return raw ? JSON.parse(raw) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function saveBudgetLimits(limits: BudgetLimits): void {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(limits));
}