import { supabase } from "../lib/supabase";

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  allocated: number;
  monthlyContribution: number;
  createdAt: string;
  color: string;
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    target: Number(row.target),
    allocated: Number(row.allocated),
    monthlyContribution: Number(row.monthly_contribution),
    createdAt: row.created_at,
    color: row.color,
  }));
}

export async function upsertSavingsGoal(goal: SavingsGoal): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("savings_goals").upsert(
    {
      id: goal.id,
      user_id: user.id,
      name: goal.name,
      emoji: goal.emoji,
      target: goal.target,
      allocated: goal.allocated,
      monthly_contribution: goal.monthlyContribution,
      created_at: goal.createdAt,
      color: goal.color,
    },
    { onConflict: "id,user_id" }
  );
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("savings_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
}