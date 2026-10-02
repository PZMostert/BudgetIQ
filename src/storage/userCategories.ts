import { supabase } from '../lib/supabase';
import { CATEGORY_COLORS } from '../services/categorizer';

export interface UserCategory {
  name: string;
  color: string;
}

/**
 * Fetch this user's custom (AI-created) categories from Supabase.
 * Built-in categories are NOT stored here — they always exist in
 * CATEGORY_COLORS. This only returns the extras.
 */
export async function getUserCategories(): Promise<UserCategory[]> {
  const { data, error } = await supabase
    .from('user_categories')
    .select('name, color')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch user categories:', error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Insert a new custom category for this user. Safe to call even if it
 * already exists (unique constraint on user_id+name) — duplicate errors
 * are swallowed since that just means another upload already created it.
 */
export async function addUserCategory(name: string, color: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('user_categories')
    .insert({ user_id: user.id, name, color });

  // Ignore unique-violation errors (category already exists for this user)
  if (error && error.code !== '23505') {
    console.error('Failed to save new category:', error.message);
  }
}

/**
 * Generates a readable, distinct-ish color for a brand-new category that
 * doesn't have one yet, deterministically based on its name so the same
 * new category always gets the same color even before it's persisted.
 */
export function generateCategoryColor(name: string): string {
  const palette = [
    '#f59e0b', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899',
    '#10b981', '#f43f5e', '#3b82f6', '#eab308', '#14b8a6',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

/**
 * Merges built-in colors with this user's custom category colors into a
 * single lookup map, for use in the pie chart, filters, and badges.
 */
export function buildCategoryColorMap(customCategories: UserCategory[]): Record<string, string> {
  const merged: Record<string, string> = { ...CATEGORY_COLORS };
  for (const c of customCategories) {
    merged[c.name] = c.color;
  }
  return merged;
}