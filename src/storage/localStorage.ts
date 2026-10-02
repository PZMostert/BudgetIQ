// Transactions are now stored in Supabase, not localStorage.
// This file re-exports from supabaseStorage for backward compatibility.
export { saveTransactions, getTransactions, clearTransactions } from './supabaseStorage';