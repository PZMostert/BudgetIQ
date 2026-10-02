import { supabase } from "../lib/supabase";

export interface BudgetLimits {
  totalMonthly: number | null;
  categories: Record<string, number>;
}

const DEFAULT_LIMITS: BudgetLimits = { totalMonthly: null, categories: {} };

export async function getBudgetLimits(): Promise<BudgetLimits> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_LIMITS;

  const { data, error } = await supabase
    .from("budget_limits")
    .select("total_monthly, categories")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return DEFAULT_LIMITS;

  return {
    totalMonthly: data.total_monthly ?? null,
    categories: (data.categories as Record<string, number>) ?? {},
  };
}

export async function saveBudgetLimits(limits: BudgetLimits): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("budget_limits").upsert(
    {
      user_id: user.id,
      total_monthly: limits.totalMonthly,
      categories: limits.categories,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}