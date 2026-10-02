import { supabase } from '../lib/supabase';
import type { Transaction } from '../types';

export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Delete existing, then insert fresh
  await supabase.from('transactions').delete().eq('user_id', user.id);

  if (transactions.length === 0) return;

  const rows = transactions.map(t => ({
    user_id: user.id,
    date: t.date,
    description: t.description,
    amount: t.amount,
    category: t.category,
  }));

  const { error } = await supabase.from('transactions').insert(rows);
  if (error) console.error('Failed to save transactions:', error);
}

export async function getTransactions(): Promise<Transaction[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) {
    console.error('Failed to load transactions:', error);
    return [];
  }

  return (data ?? []).map(row => ({
    date: row.date,
    description: row.description,
    amount: Number(row.amount),
    category: row.category,
  }));
}

export async function clearTransactions(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('transactions').delete().eq('user_id', user.id);
}