// Category used to be a strict union of hardcoded values. It's now a plain
// string because the AI categorizer can create new, user-specific categories
// on the fly (e.g. "Transfers", "Pet Care") when none of the existing ones
// fit a transaction. BUILT_IN_CATEGORIES below preserves the original list,
// used to seed colors and as the baseline set before any AI-created extras.
export type Category = string;

export const BUILT_IN_CATEGORIES = [
  "Transfer In",
  "Savings",
  "Rent",
  "Utilities",
  "Internet & Subscriptions",
  "Insurance",
  "Gym",
  "Fuel",
  "Groceries",
  "Food & Dining",
  "Clothing & Beauty",
  "Health & Pharmacy",
  "Shopping",
  "Airtime & Data",
  "Parking",
  "Bank Fees",
  "Family",
  "Entertainment",
  "Travel",
  "Other",
] as const;

export interface Transaction {
  date: string;
  amount: number;
  description: string;
  category: Category;
}