import { supabase } from '../lib/supabase';
import { BUILT_IN_CATEGORIES } from '../types';
import {
  getUserCategories,
  addUserCategory,
  generateCategoryColor,
} from '../storage/userCategories';

const AI_MAP_KEY = 'budgetiq_ai_category_map';

export function saveAICategoryMap(map: Record<string, string>): void {
  localStorage.setItem(AI_MAP_KEY, JSON.stringify(map));
}

export function getAICategoryMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(AI_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function clearAICategoryMap(): void {
  localStorage.removeItem(AI_MAP_KEY);
}

function cleanDescription(d: string): string {
  return d
    .trim()
    // Remove card reference numbers like 405769*1416
    .replace(/\d{6}\*\d{4}/g, "")
    // Remove date suffixes like "23 MAY", "01 APR"
    .replace(/\d{2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/gi, "")
    // Remove transaction IDs like DCRE3272103
    .replace(/[A-Z]{2,4}\d{7,}/g, "")
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    .trim();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * AI categorizer — calls the Supabase Edge Function which proxies Claude API.
 * Only works for Pro users. The API key never touches the browser.
 *
 * Handles any number of unique descriptions by batching requests in chunks
 * of 50 and merging the results into a single map keyed by ORIGINAL
 * (uncleaned) description, so Dashboard lookups via aiMap[t.description]
 * work correctly.
 *
 * The AI is given the user's current category list (built-ins + any custom
 * ones they've already created) and may either reuse one or propose a new
 * category when nothing fits. Any genuinely new category it proposes gets
 * persisted to Supabase (per-user) so it shows up in future categorizations,
 * filters, and the pie chart.
 */
export async function aiCategorize(
  descriptions: string[],
  onProgress?: (done: number, total: number) => void
): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) throw new Error('Not authenticated');

  // De-dupe on the ORIGINAL description, but keep a cleaned version to send to the AI
  const uniqueOriginals = [...new Set(descriptions.map(d => d.trim()).filter(Boolean))];

  if (uniqueOriginals.length === 0) return {};

  // Load current category list: built-ins + this user's existing custom ones
  const customCategories = await getUserCategories();
  const existingCategories = [
    ...BUILT_IN_CATEGORIES,
    ...customCategories.map(c => c.name),
  ];
  // Track categories created during this run too, so a name proposed in
  // batch 1 isn't redundantly re-proposed (and re-inserted) in batch 2.
  const knownCategories = new Set(existingCategories);

  const batches = chunk(uniqueOriginals, 50);
  const finalMap: Record<string, string> = {};
  let done = 0;

  for (const batch of batches) {
    // cleaned -> original, so we can map the AI's response (keyed by cleaned text) back
    const cleanedToOriginal = new Map<string, string>();
    const cleanedBatch: string[] = [];

    for (const original of batch) {
      const cleaned = cleanDescription(original) || original;
      cleanedToOriginal.set(cleaned, original);
      cleanedBatch.push(cleaned);
    }

    const response = await fetch(
      `https://eeuscsetaywjbqnjubvv.supabase.co/functions/v1/ai-categorize`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          descriptions: cleanedBatch,
          existingCategories: Array.from(knownCategories),
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'AI categorization failed' }));
      throw new Error(err.error ?? 'AI categorization failed');
    }

    const { categoryMap, newCategories } = await response.json();

    // categoryMap is keyed by cleaned description — map it back to the original
    for (const [cleaned, category] of Object.entries(categoryMap ?? {})) {
      const original = cleanedToOriginal.get(cleaned);
      if (original) {
        finalMap[original] = category as string;
      }
    }

    // Persist any genuinely new categories the AI proposed in this batch
    if (Array.isArray(newCategories)) {
      for (const name of newCategories) {
        if (!name || knownCategories.has(name)) continue;
        knownCategories.add(name);
        const color = generateCategoryColor(name);
        await addUserCategory(name, color);
      }
    }

    done += batch.length;
    onProgress?.(done, uniqueOriginals.length);
  }

  return finalMap;
}