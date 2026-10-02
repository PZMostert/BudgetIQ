import Papa from "papaparse";
import type { Transaction } from "../types";
import { categorizeTransaction } from "./categorizer";

export type DetectedBank =
  | "fnb"
  | "standard_bank"
  | "nedbank"
  | "absa"
  | "discovery"
  | "capitec"
  | "unknown";

export interface ParseResult {
  transactions: Transaction[];
  bank: DetectedBank;
  error?: string;
  warning?: string;
}

const trimKeys = (obj: Record<string, string>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const k of Object.keys(obj)) out[k.trim()] = obj[k];
  return out;
};

const findCol = (obj: Record<string, string>, candidates: string[]): string | undefined => {
  const lower = candidates.map(c => c.toLowerCase());
  return Object.keys(obj).find(k => lower.includes(k.toLowerCase().trim()));
};

const parseAmount = (raw: string): number => {
  const cleaned      = raw.trim();
  const trailingMinus = cleaned.endsWith("-");
  const normalized   = cleaned.replace(/[^0-9.-]/g, "");
  const val          = parseFloat(normalized);
  if (isNaN(val)) return NaN;
  return trailingMinus ? -Math.abs(val) : val;
};

const cleanDesc = (raw: string): string => raw.replace(/\s+/g, " ").trim();

function makeT(date: string, description: string, amount: number): Transaction {
  return { date, description, amount, category: categorizeTransaction(description) } as Transaction;
}

function detectBank(headers: string[]): DetectedBank {
  const h = headers.map(h => h.trim().toLowerCase());
  if (h.some(c => c.includes("tranlistno")) ||
      (h.some(c => c.includes("debits(r)")) && h.some(c => c.includes("credits(r)")))) return "nedbank";
  if (h.some(c => c.includes("money in")) || h.some(c => c.includes("money out"))) return "capitec";
  if (h.some(c => c.includes("posting date")) && h.some(c => c.includes("transaction date"))) return "capitec";
  if (h.some(c => c.includes("payments")) && h.some(c => c.includes("deposits"))) return "standard_bank";
  if (h.some(c => c === "debit") && h.some(c => c === "credit") && !h.some(c => c === "amount")) return "discovery";
  if (h.some(c => c.includes("transaction description"))) return "absa";
  if (h.some(c => c === "amount") && h.some(c => c === "description")) return "fnb";
  if (h.some(c => c === "amount")) return "fnb";
  return "unknown";
}

function parseFNB(row: Record<string, string>): Transaction | null {
  const descKey = findCol(row, ["Description", "description"]);
  const amtKey  = findCol(row, ["Amount", "amount"]);
  const dateKey = findCol(row, ["Date", "date"]);
  if (!descKey || !amtKey) return null;
  const rawAmt  = (row[amtKey] ?? "").trim();
  const rawDesc = (row[descKey] ?? "").trim();
  if (!rawAmt || !rawDesc) return null;
  const amount  = parseAmount(rawAmt);
  if (isNaN(amount)) return null;
  return makeT(dateKey ? (row[dateKey] ?? "").trim() : "", cleanDesc(rawDesc), amount);
}

function parseABSA(row: Record<string, string>): Transaction | null {
  const dateKey = findCol(row, ["Date", "date"]);
  const descKey = findCol(row, ["Transaction Description", "Description", "description", "Narrative"]);
  const amtKey  = findCol(row, ["Amount", "amount"]);
  if (!descKey || !amtKey) return null;
  const rawAmt  = (row[amtKey] ?? "").trim();
  const rawDesc = (row[descKey] ?? "").trim();
  if (!rawAmt || !rawDesc) return null;
  const amount  = parseFloat(rawAmt.replace(/R/gi, "").replace(/\s/g, ""));
  if (isNaN(amount)) return null;
  return makeT(dateKey ? (row[dateKey] ?? "").trim() : "", cleanDesc(rawDesc), amount);
}

function parseNedbank(row: Record<string, string>): Transaction | null {
  const dateKey   = findCol(row, ["Date", "date"]);
  const descKey   = findCol(row, ["Description", "description", "NarrativeDescription", "Narrative"]);
  const debitKey  = findCol(row, ["Debits(R)", "Debit", "debit", "Debits"]);
  const creditKey = findCol(row, ["Credits(R)", "Credit", "credit", "Credits"]);
  if (!descKey) return null;
  const rawDesc   = (row[descKey] ?? "").trim();
  if (!rawDesc || rawDesc.toLowerCase().includes("openingbalance")) return null;
  const rawDebit  = debitKey  ? (row[debitKey]  ?? "").trim() : "";
  const rawCredit = creditKey ? (row[creditKey] ?? "").trim() : "";
  let amount = 0;
  if (rawDebit  && rawDebit  !== "" && rawDebit  !== "0") amount = -Math.abs(parseAmount(rawDebit));
  else if (rawCredit && rawCredit !== "" && rawCredit !== "0") amount = Math.abs(parseAmount(rawCredit));
  if (isNaN(amount)) return null;
  return makeT(dateKey ? (row[dateKey] ?? "").trim() : "", cleanDesc(rawDesc), amount);
}

function parseStandardBank(row: Record<string, string>): Transaction | null {
  const dateKey    = findCol(row, ["Date", "date", "Transaction Date"]);
  const descKey    = findCol(row, ["Description", "description", "Narrative"]);
  const paymentKey = findCol(row, ["Payments", "payments", "Debit Amount", "Debit"]);
  const depositKey = findCol(row, ["Deposits", "deposits", "Credit Amount", "Credit"]);
  if (!descKey) return null;
  const rawDesc    = (row[descKey] ?? "").trim();
  if (!rawDesc || rawDesc.toLowerCase().includes("opening balance")) return null;
  const rawPayment = paymentKey ? (row[paymentKey] ?? "").trim() : "";
  const rawDeposit = depositKey ? (row[depositKey] ?? "").trim() : "";
  let amount = 0;
  if (rawPayment && rawPayment !== "" && rawPayment !== "0") {
    const p = parseAmount(rawPayment); amount = p > 0 ? -p : p;
  } else if (rawDeposit && rawDeposit !== "" && rawDeposit !== "0") {
    amount = Math.abs(parseAmount(rawDeposit));
  }
  if (isNaN(amount)) return null;
  return makeT(dateKey ? (row[dateKey] ?? "").trim() : "", cleanDesc(rawDesc), amount);
}

function parseDiscovery(row: Record<string, string>): Transaction | null {
  const dateKey   = findCol(row, ["Date", "date", "Transaction Date"]);
  const descKey   = findCol(row, ["Description", "description", "Merchant"]);
  const debitKey  = findCol(row, ["Debit", "debit"]);
  const creditKey = findCol(row, ["Credit", "credit"]);
  if (!descKey) return null;
  const rawDesc   = (row[descKey] ?? "").trim();
  if (!rawDesc) return null;
  const rawDebit  = debitKey  ? (row[debitKey]  ?? "").trim() : "";
  const rawCredit = creditKey ? (row[creditKey] ?? "").trim() : "";
  let amount = 0;
  if (rawDebit  && rawDebit  !== "" && rawDebit  !== "0") amount = -Math.abs(parseAmount(rawDebit));
  else if (rawCredit && rawCredit !== "" && rawCredit !== "0") amount = Math.abs(parseAmount(rawCredit));
  if (isNaN(amount)) return null;
  return makeT(dateKey ? (row[dateKey] ?? "").trim() : "", cleanDesc(rawDesc), amount);
}

function parseCapitec(row: Record<string, string>): Transaction | null {
  const dateKey     = findCol(row, ["Transaction Date", "Posting Date", "Date", "date"]);
  const descKey     = findCol(row, ["Description", "description"]);
  const moneyInKey  = findCol(row, ["Money In (R)", "Money In", "money in", "Credit", "Credits"]);
  const moneyOutKey = findCol(row, ["Money Out (R)", "Money Out", "money out", "Debit", "Debits"]);
  if (!descKey) return null;
  const rawDesc     = (row[descKey] ?? "").trim();
  if (!rawDesc) return null;
  const rawIn       = moneyInKey  ? (row[moneyInKey]  ?? "").trim() : "";
  const rawOut      = moneyOutKey ? (row[moneyOutKey] ?? "").trim() : "";
  let amount = 0;
  if (rawOut && rawOut !== "" && rawOut !== "0") amount = -Math.abs(parseAmount(rawOut));
  else if (rawIn && rawIn !== "" && rawIn !== "0") amount = Math.abs(parseAmount(rawIn));
  if (isNaN(amount)) return null;
  return makeT(dateKey ? (row[dateKey] ?? "").trim() : "", cleanDesc(rawDesc), amount);
}

export const BANK_INFO: Record<DetectedBank, { name: string; warning?: string }> = {
  fnb:           { name: "FNB" },
  standard_bank: { name: "Standard Bank" },
  nedbank:       { name: "Nedbank" },
  absa: {
    name: "ABSA",
    warning: "ABSA only supports CSV export for credit card accounts. For cheque/savings accounts, download your PDF statement and convert it using getmycsv.com, then upload here.",
  },
  discovery: {
    name: "Discovery Bank",
    warning: "To export from Discovery Bank: open the app → select your account → tap the 3-dot menu → Smart Search → export as CSV or Excel (save as CSV).",
  },
  capitec: {
    name: "Capitec",
    warning: "Capitec does not offer a native CSV export. Download your PDF statement from the Capitec app, convert it using getmycsv.com or convertbanktoexcel.com, then upload the CSV here.",
  },
  unknown: {
    name: "Unknown bank",
    warning: "We couldn't detect your bank format automatically. We'll try to parse it anyway — if results look wrong, upgrade to Pro for AI-powered parsing that works with any bank worldwide.",
  },
};

const KNOWN_HEADER_COLS = [
  "date", "description", "amount", "balance",
  "debit", "credit", "debits", "credits",
  "payments", "deposits", "tranlistno",
  "transaction date", "posting date",
  "money in", "money out",
  "transaction description",
  "debits(r)", "credits(r)",
];

function isRealHeaderRow(line: string): boolean {
  const lower = line.replace(/"/g, "").toLowerCase().trim();
  if (!lower) return false;
  if (lower.startsWith("account")) return false;
  return KNOWN_HEADER_COLS.some(col => lower.includes(col));
}

function stripMetadata(text: string): string {
  const normalised = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines      = normalised.split("\n");
  const headerIdx  = lines.findIndex(line => isRealHeaderRow(line));
  if (headerIdx === -1) return normalised;
  return lines
    .slice(headerIdx)
    .filter(line => line.replace(/[\t\s]/g, "").length > 0)
    .join("\n");
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawText = e.target?.result as string;
      if (!rawText) { resolve({ transactions: [], bank: "unknown", error: "Could not read file." }); return; }

      const cleanText = stripMetadata(rawText);

      Papa.parse(cleanText, {
        header: true,
        skipEmptyLines: true,
        delimiter: "",
        complete: (results) => {
          const raw = results.data as Record<string, string>[];
          if (!raw || raw.length === 0) {
            resolve({ transactions: [], bank: "unknown", error: "No rows found. Make sure this is a valid CSV export from your bank." });
            return;
          }

          const headers = Object.keys(raw[0]).map(k => k.trim());
          const bank    = detectBank(headers);
          const info    = BANK_INFO[bank];
          const rowParser =
            bank === "fnb"           ? parseFNB :
            bank === "absa"          ? parseABSA :
            bank === "nedbank"       ? parseNedbank :
            bank === "standard_bank" ? parseStandardBank :
            bank === "discovery"     ? parseDiscovery :
            bank === "capitec"       ? parseCapitec :
            parseFNB;

          const transactions: Transaction[] = [];
          for (const rawRow of raw) {
            const t = rowParser(trimKeys(rawRow));
            if (t) transactions.push(t);
          }

          console.log(`[BudgetIQ] Bank: ${info.name} | Parsed: ${transactions.length} transactions`);

          if (transactions.length === 0) {
            resolve({ transactions: [], bank, error: `Detected ${info.name} format but couldn't read any transactions.`, warning: info.warning });
            return;
          }
          resolve({ transactions, bank, warning: info.warning });
        },
        error: (err: Error) => {
          resolve({ transactions: [], bank: "unknown", error: "Failed to parse the file: " + err.message });
        },
      });
    };
    reader.onerror = () => { resolve({ transactions: [], bank: "unknown", error: "Failed to read the file." }); };
    reader.readAsText(file);
  });
}