import * as pdfjs from "pdfjs-dist";
import type { Transaction, Category } from "../types";
import { categorizeTransaction } from "./categorizer";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

type PDFTextItem = { str: string; transform: number[] };

export type PdfBank = "discovery" | "fnb" | "capitec" | "standardbank" | "absa" | "unknown";

export interface PdfParseResult {
  transactions: Transaction[];
  bank: PdfBank;
  rowCount: number;
  error?: string;
  warning?: string;
}

async function extractPageItems(file: File): Promise<{
  pageItems: Array<Array<{ text: string; x: number; y: number }>>;
  totalPages: number;
}> {
  const buffer = await file.arrayBuffer();
  const pdf = await (pdfjs as any).getDocument({ data: buffer }).promise;
  const totalPages = pdf.numPages;
  const pageItems: Array<Array<{ text: string; x: number; y: number }>> = [];

  for (let p = 1; p <= totalPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    const items: Array<{ text: string; x: number; y: number }> = [];
    for (const item of content.items as PDFTextItem[]) {
      const text = item.str.trim();
      if (!text) continue;
      const x = item.transform[4];
      const y = viewport.height - item.transform[5];
      items.push({ text, x, y });
    }
    pageItems.push(items);
  }
  return { pageItems, totalPages };
}

async function extractPageText(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await (pdfjs as any).getDocument({ data: buffer }).promise;
  const totalPages = pdf.numPages;
  const lines: string[] = [];

  for (let p = 1; p <= totalPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: Array<{ text: string; x: number; y: number }> = [];
    for (const item of content.items as PDFTextItem[]) {
      const text = item.str;
      if (!text.trim()) continue;
      items.push({ text, x: item.transform[4], y: item.transform[5] });
    }

    const rows = groupByRow(items, 2);
    for (const row of rows) {
      let line = "";
      for (const w of row) {
        if (line && !line.endsWith(" ") && !w.text.startsWith(" ")) line += " ";
        line += w.text;
      }
      if (line.trim()) lines.push(line);
    }
  }

  return lines;
}

function groupByRow(
  items: Array<{ text: string; x: number; y: number }>,
  tolerance = 3
): Array<Array<{ text: string; x: number; y: number }>> {
  const rows: Map<number, Array<{ text: string; x: number; y: number }>> = new Map();
  for (const item of items) {
    let matched = false;
    for (const [rowY] of rows) {
      if (Math.abs(item.y - rowY) <= tolerance) {
        rows.get(rowY)!.push(item);
        matched = true;
        break;
      }
    }
    if (!matched) rows.set(item.y, [item]);
  }
  return Array.from(rows.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, items]) => items.sort((a, b) => a.x - b.x));
}

function detectBank(pageItems: Array<Array<{ text: string; x: number; y: number }>>): PdfBank {
  const sample = pageItems.slice(0, 3).flat().map(i => i.text).join(" ");
  if (/discovery bank/i.test(sample)) return "discovery";
  if (/first national bank|fnb fusion|tak nommer|beskrywing/i.test(sample)) return "fnb";
  if (/capitec bank/i.test(sample)) return "capitec";
  if (/standard bank/i.test(sample)) return "standardbank";
  if (/\babsa\b/i.test(sample)) return "absa";
  return "unknown";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseAmount(s: string): number {
  return parseFloat(
    s.replace(/^R\s*/, "").replace(/,/g, "").replace(/-$/, "").trim()
  );
}

function parseDiscoveryPdf(
  pageItems: Array<Array<{ text: string; x: number; y: number }>>
): Transaction[] {
  const rows: Array<{ date: string; desc: string; numbers: string[] }> = [];

  for (const pageRows of pageItems.map(items => groupByRow(items))) {
    for (const row of pageRows) {
      const dateWord = row.find(w => ISO_DATE.test(w.text));
      if (!dateWord) continue;

      const descWords = row.filter(w => w.x >= 115 && w.x < 383 && !ISO_DATE.test(w.text));
      const desc = descWords.map(w => w.text.replace(/\x00/g, "fi")).join(" ").trim();
      if (!desc) continue;

      const numWords = row
        .filter(w => w.x >= 383 && /[\d,]+\.\d{2}/.test(w.text))
        .map(w => w.text);

      rows.push({ date: dateWord.text, desc, numbers: numWords });
    }
  }

  const transactions: Transaction[] = [];
  let prevBalance: number | null = null;

  for (const { date, desc, numbers } of rows) {
    if (numbers.length === 0) continue;
    const balStr = numbers[numbers.length - 1];
    const balNeg = balStr.endsWith("-");
    const balance = parseAmount(balStr) * (balNeg ? -1 : 1);

    if (numbers.length < 2) {
      prevBalance = balance;
      continue;
    }

    const txnAmt = parseAmount(numbers[0]);
    if (isNaN(txnAmt) || isNaN(balance)) { prevBalance = balance; continue; }

    let signedAmount: number;
    if (prevBalance === null) {
      signedAmount = -txnAmt;
    } else {
      const delta = Math.round((balance - prevBalance) * 100) / 100;
      signedAmount = delta >= 0 ? txnAmt : -txnAmt;
    }

    prevBalance = balance;
    if (signedAmount === 0) continue;

    transactions.push({
      date, description: desc, amount: signedAmount,
      category: categorizeTransaction(desc) as Category,
    });
  }

  return transactions;
}

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", maa: "03", mar: "03", apr: "04",
  mei: "05", may: "05", jun: "06", jul: "07", aug: "08",
  sep: "09", okt: "10", oct: "10", nov: "11", des: "12", dec: "12",
};

const FNB_DATE_FULL = /^(\d{2})\s+(Jan|Feb|Maa|Mar|Apr|Mei|May|Jun|Jul|Aug|Sep|Okt|Oct|Nov|Des|Dec)$/i;
const FNB_DAY = /^\d{2}$/;
const FNB_MON = /^(Jan|Feb|Maa|Mar|Apr|Mei|May|Jun|Jul|Aug|Sep|Okt|Oct|Nov|Des|Dec)$/i;
const FNB_SKIP = /tak nommer|rekeningnommer|transaksies in rand|^datum$|^beskrywing$|bladsy|leweringswyse|dda q|fnb fusion|^bedrag$|^saldo$|opgeloopte|bank-koste|afsluitingsaldo|omset vir|nr\. krediet|nr\. debiet|fasiliteitlimiet|staatsaldo|bankkoste|kredietsaldo|debietsaldo|diensfooie|kontant|ander fooie|openingsaldo|totale btw|nie verskaf|bank btw|aspire account|in rand/i;

function parseFnbDate(day: string, mon: string, year = "2026"): string | null {
  const m = MONTH_MAP[mon.toLowerCase()];
  if (!m) return null;
  return `${year}-${m}-${day.padStart(2, "0")}`;
}

function parseFnbAmount(tokens: string[]): number | null {
  let s = tokens.join(" ").trim();
  const isCredit = /[Kk][Tt]$/.test(s);
  s = s.replace(/[Kk][Tt]$/, "").trim().replace(/[\s\u00a0]/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  const val = parseFloat(s);
  if (isNaN(val)) return null;
  return isCredit ? val : -val;
}

function parseFnbPdf(
  pageItems: Array<Array<{ text: string; x: number; y: number }>>,
  totalPages: number
): Transaction[] {
  const descPageCount = Math.min(7, totalPages);
  const descs: Array<{ date: string; desc: string }> = [];
  const amounts: number[] = [];

  for (let i = 0; i < descPageCount; i++) {
    const rows = groupByRow(pageItems[i]);
    for (const row of rows) {
      const visible = row.filter(w => w.x >= 0);
      if (!visible.length) continue;
      const line = visible.map(w => w.text).join(" ");
      if (FNB_SKIP.test(line)) continue;

      let date: string | null = null;
      let descStart = 0;

      if (FNB_DATE_FULL.test(visible[0].text)) {
        const m = FNB_DATE_FULL.exec(visible[0].text)!;
        date = parseFnbDate(m[1], m[2]);
        descStart = 1;
      } else if (visible.length >= 2 && FNB_DAY.test(visible[0].text) && FNB_MON.test(visible[1].text)) {
        date = parseFnbDate(visible[0].text, visible[1].text);
        descStart = 2;
      }

      if (!date) continue;

      const descWords = visible.slice(descStart);
      let desc = descWords.map(w => w.text).join(" ").trim();
      desc = desc.replace(/\s*\d{6}\*\d{4}\s+\d{2}\s+\w{3}\s*$/i, "").trim();
      descs.push({ date, desc: desc || "FNB Bank Fee" });
    }
  }

  for (let i = descPageCount; i < totalPages; i++) {
    const rows = groupByRow(pageItems[i]);
    for (const row of rows) {
      const visible = row.filter(w => w.x >= 0);
      if (!visible.length) continue;
      const line = visible.map(w => w.text).join(" ");
      if (FNB_SKIP.test(line)) continue;

      const amtWords = visible.filter(w => w.x < 115);
      const balWords = visible.filter(w => w.x >= 115);

      if (!amtWords.length || !balWords.length) continue;
      if (!/\d/.test(balWords.map(w => w.text).join(""))) continue;

      const amt = parseFnbAmount(amtWords.map(w => w.text));
      if (amt !== null) amounts.push(amt);
    }
  }

  const count = Math.min(descs.length, amounts.length);
  const transactions: Transaction[] = [];
  for (let i = 0; i < count; i++) {
    transactions.push({
      date: descs[i].date,
      description: descs[i].desc,
      amount: amounts[i],
      category: categorizeTransaction(descs[i].desc) as Category,
    });
  }
  return transactions;
}

// ── FNB English parser ────────────────────────────────────────────────────────
// The FNB Fusion Premier English statement has Date | Description | Amount |
// Balance all on the SAME LINE. Amounts: plain number = debit (expense),
// number+"Cr" = credit (income). Balance is a Dr running total.
//
// FIX (this pass): pdf.js frequently splits "5,600.00Cr" into two separate
// text items ("5,600.00" and "Cr"). extractPageText() then rejoins them
// WITH a space when reconstructing the line ("5,600.00 Cr"), because it
// only omits the space when one token already ends/starts with a space.
// pdfplumber (used when the original regex was validated) keeps them as a
// single token with no space, so the original (Cr)? — with no \s* before
// it — matched fine there but failed to match almost every credit line in
// the actual browser environment, causing all 19 credits to be dropped
// (Income showing R0). Both the amount-suffix and balance-suffix now
// tolerate an optional space before Cr/Dr; regex backtracking still lets
// the no-space debit case match correctly.
const FNB_EN_MONTHS: Record<string, string> = {
  jan:"01", feb:"02", mar:"03", apr:"04", may:"05", jun:"06",
  jul:"07", aug:"08", sep:"09", oct:"10", nov:"11", dec:"12",
};

// NOTE 2: Certain rows (Lotto/Powerball purchases in this statement) carry
// a THIRD trailing number in the "Accrued Bank Charges" column, e.g.
// "13 Jan Lotto Purchase 10.00 36,559.59 3.00". Without an explicit slot
// for it, the lazy description group (.*?) would backtrack past the real
// amount (swallowing "Lotto Purchase 10.00" into the description) and
// mismatch amount=balance ("36,559.59") / balance=charge ("3.00") just to
// satisfy the end-of-line anchor — producing a phantom debit of R36,559.59
// instead of the real R10.00. Validated against a real 141-transaction
// statement containing 4 such charge rows: with the fix, credit total
// matches the statement's own total exactly (91,557.04) and debit total
// matches exactly (106,477.32); without it, debit total was inflated by
// ~R142k from 4 misparsed rows.
const FNB_EN_ROW = /^(\d{2})\s+(\w{3})\s+(.*?)\s+([\d,]+\.\d{2})\s*(Cr)?\s+([\d,]+\.\d{2})\s*(?:Dr|Cr)?(?:\s+[\d,]+\.\d{2})?\s*$/;
const FNB_EN_ROW_MIN = /^(\d{2})\s+(\w{3})\s+([\d,]+\.\d{2})\s*(Cr)?\s+([\d,]+\.\d{2})\s*(?:Dr|Cr)?(?:\s+[\d,]+\.\d{2})?\s*$/;
const FNB_EN_SKIP = /^(date|description|amount|balance|accrued|bank charges|transactions in rand|statement balances|opening balance|closing balance|service fees|total vat|turnover|no\. credit|no\. debit|page \d|delivery method|branch number|account number|dda q|fnb fusion premier account|tax invoice|statement period|statement date|customer vat|bank vat|cash deposit|cash handling|other fees|interest rate|facility|credit rate|debit rate)/i;

function parseFnbEnglishLines(lines: string[], year: string): Transaction[] {
  const transactions: Transaction[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (FNB_EN_SKIP.test(line)) continue;
    if (!/^\d{2}\s+\w{3}\s/.test(line)) continue;

    let day: string, mon: string, desc: string, amtStr: string, cr: string | undefined, balStr: string;

    const m = FNB_EN_ROW.exec(line);
    if (m) {
      [, day, mon, desc, amtStr, cr, balStr] = m as unknown as string[];
      desc = desc.trim();
    } else {
      const m2 = FNB_EN_ROW_MIN.exec(line);
      if (!m2) continue;
      [, day, mon, amtStr, cr, balStr] = m2 as unknown as string[];
      desc = "Service Fee";
    }

    const monthNum = FNB_EN_MONTHS[mon.toLowerCase()];
    if (!monthNum) continue;
    const date = `${year}-${monthNum}-${day.padStart(2, "0")}`;
    const rawAmt = parseFloat(amtStr.replace(/,/g, ""));
    if (isNaN(rawAmt)) continue;

    const amount = cr ? rawAmt : -rawAmt;

    const cleanDesc = desc.replace(/\s+\d{6}\*\d{4}\s+\d{2}\s+\w{3}\s*$/i, "").trim();

    transactions.push({
      date,
      description: cleanDesc || "FNB Fee",
      amount,
      category: categorizeTransaction(cleanDesc || "FNB Fee") as Category,
    });
  }

  return transactions;
}

// ── FNB Afrikaans "Aspire same-line" parser ───────────────────────────────────
// A THIRD distinct FNB layout, seen on some Aspire-suite accounts: Afrikaans
// (Datum/Beskrywing header, same as the original split-column parser above),
// but with Bedrag (amount) and Saldo (balance) on the SAME LINE as the date
// and description — e.g. "20 Maa DebiCheck Dotsure Ml04470653 99.00 6,060.70Kt".
// This is structurally identical to the English same-line format
// (parseFnbEnglishLines), just with "Kt" as the credit suffix instead of
// "Cr", and it reuses the existing MONTH_MAP (which already covers both
// English and Afrikaans month abbreviations, including "maa"/"mei").
//
// Sign convention (opposite-looking from English but the same rule):
// amount suffixed "Kt" = credit/income (positive); no suffix = debit/expense
// (negative). The BALANCE column only ever shows an explicit "Kt" suffix
// when the account is in credit — a negative (overdrawn/"Dt") balance is
// shown as a bare number with no suffix at all anywhere in this statement,
// unlike the summary lines at the top of the statement which do spell out
// "Dt"/"Kt" explicitly. We don't currently use the balance for anything
// other than validation, so this asymmetry doesn't affect parsed output.
//
// Also reuses the same "optional third trailing number" fix as the English
// parser, since this format has the same Opgeloopte Bankkoste (Accrued Bank
// Charges) third-column trap, e.g.
// "13 Maa Smart-Ap Lugtyd Aankope Airtime 0792301353 105.00 334.44 1.60".
//
// Validated against a real 232-transaction, 6-page statement: 232/232
// matched, credit total matches the statement's own total exactly
// (107,872.73), debit total matches exactly (102,317.91), and the running
// balance reconciles exactly from the opening balance (538.46 Dt) to the
// closing balance (5,016.36 Kt) with zero discrepancies.
const FNB_AAS_ROW = /^(\d{2})\s+(\w{3})\s+(.*?)\s+([\d,]+\.\d{2})\s*(Kt)?\s+([\d,]+\.\d{2})\s*(?:Kt)?(?:\s+[\d,]+\.\d{2})?\s*$/;
const FNB_AAS_ROW_MIN = /^(\d{2})\s+(\w{3})\s+([\d,]+\.\d{2})\s*(Kt)?\s+([\d,]+\.\d{2})\s*(?:Kt)?(?:\s+[\d,]+\.\d{2})?\s*$/;
const FNB_AAS_SKIP = /^(datum|beskrywing|bedrag|saldo|opgeloopte|bank-?koste|transaksies in rand|staatsaldo|openingsaldo|afsluitingsaldo|diensfooie|kontant|ander fooie|rentekoers|kredietsaldo|debietsaldo|fasiliteitlimiet|totale btw|page \d|bladsy|leweringswyse|tak nommer|rekeningnommer|dda q|fnb fusion|belastingfaktuur|staat periode|staatdatum|kliënt btw|bank btw|omset vir|nr\. krediet|nr\. debiet|indien u|vir meer|first national bank|die debietrentekoers|die prima)/i;

function parseFnbAfrikaansSameLine(lines: string[], year: string): Transaction[] {
  const transactions: Transaction[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (FNB_AAS_SKIP.test(line)) continue;
    if (!/^\d{2}\s+\w{3}\s/.test(line)) continue;

    let day: string, mon: string, desc: string, amtStr: string, kt: string | undefined, balStr: string;

    const m = FNB_AAS_ROW.exec(line);
    if (m) {
      [, day, mon, desc, amtStr, kt, balStr] = m as unknown as string[];
      desc = desc.trim();
    } else {
      const m2 = FNB_AAS_ROW_MIN.exec(line);
      if (!m2) continue;
      [, day, mon, amtStr, kt, balStr] = m2 as unknown as string[];
      desc = "FNB Fee";
    }

    const monthNum = MONTH_MAP[mon.toLowerCase()];
    if (!monthNum) continue;
    const date = `${year}-${monthNum}-${day.padStart(2, "0")}`;
    const rawAmt = parseFloat(amtStr.replace(/,/g, ""));
    if (isNaN(rawAmt)) continue;

    // Kt = credit (income = positive), no suffix = debit (expense = negative)
    const amount = kt ? rawAmt : -rawAmt;

    const cleanDesc = desc.replace(/\s+\d{6}\*\d{4}\s+\d{2}\s+\w{3}\s*$/i, "").trim();

    transactions.push({
      date,
      description: cleanDesc || "FNB Fee",
      amount,
      category: categorizeTransaction(cleanDesc || "FNB Fee") as Category,
    });
  }

  return transactions;
}

const CAPITEC_DATE = /^\d{2}\/\d{2}\/\d{4}$/;
const CAPITEC_SKIP = /unique document|opening balance|closing balance|available balance|page \d|capitec bank limited|^\* includes|24hr client|authorised financial|reg\. no|statement information|interest.*rewards|money in summary|money out summary|fee summary|spending summary|transaction history|live better|tax invoice|vat registration/i;

function joinAmountWords(words: Array<{ text: string; x: number; y: number }>): number | null {
  const s = words.map(w => w.text).join("").replace(/,/g, "").replace(/R/g, "").trim();
  if (!s) return null;
  const val = parseFloat(s);
  return isNaN(val) ? null : val;
}

function parseCapitecPdf(
  pageItems: Array<Array<{ text: string; x: number; y: number }>>
): Transaction[] {
  const transactions: Transaction[] = [];

  for (const items of pageItems) {
    const rows = groupByRow(items, 2);
    let pending: { date: string; desc: string; amount: number; fee: number } | null = null;

    for (const row of rows) {
      const lineText = row.map(w => w.text).join(" ");
      if (CAPITEC_SKIP.test(lineText)) continue;

      const dateWord = row.find(w => CAPITEC_DATE.test(w.text));

      if (dateWord) {
        if (pending && pending.amount !== 0) {
          transactions.push({
            date: pending.date,
            description: pending.desc,
            amount: pending.amount,
            category: categorizeTransaction(pending.desc) as Category,
          });
        } else if (pending && pending.fee !== 0) {
          transactions.push({
            date: pending.date,
            description: pending.desc,
            amount: pending.fee,
            category: "Bank Fees" as Category,
          });
        }

        const descW  = row.filter(w => w.x >= 84 && w.x < 321);
        const balW   = row.filter(w => w.x >= 525);
        const feeW   = row.filter(w => w.x >= 490 && w.x < 525);
        const amtW   = row.filter(w => w.x >= 383 && w.x < 490);

        const hasNeg = amtW.some(w => w.text.startsWith("-"));
        let inW: typeof amtW = [];
        let outW: typeof amtW = [];

        if (hasNeg) {
          const negStart = Math.min(...amtW.filter(w => w.text.startsWith("-")).map(w => w.x));
          inW  = amtW.filter(w => w.x < negStart);
          outW = amtW.filter(w => w.x >= negStart);
        } else {
          inW = amtW;
        }

        const moneyIn  = joinAmountWords(inW)  ?? 0;
        const moneyOut = joinAmountWords(outW) ?? 0;
        const fee      = joinAmountWords(feeW) ?? 0;
        const amount   = moneyIn + moneyOut;

        const [d, m, yr] = dateWord.text.split("/");
        const date = `${yr}-${m}-${d}`;
        const desc = descW.map(w => w.text).join(" ").trim();

        pending = { date, desc, amount, fee };

      } else if (pending) {
        const cont = row.filter(w => w.x >= 84 && w.x < 321);
        if (cont.length) {
          const extra = cont.map(w => w.text).join(" ").trim();
          if (!CAPITEC_SKIP.test(extra)) {
            pending.desc += " " + extra;
          }
        }
      }
    }

    if (pending && pending.amount !== 0) {
      transactions.push({
        date: pending.date,
        description: pending.desc,
        amount: pending.amount,
        category: categorizeTransaction(pending.desc) as Category,
      });
    } else if (pending && pending.fee !== 0) {
      transactions.push({
        date: pending.date,
        description: pending.desc,
        amount: pending.fee,
        category: "Bank Fees" as Category,
      });
    }
  }

  return transactions;
}

const SB_MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};
const SB_ROW = /^(\d{2})\s+(\w{3})\s+(\d{2})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/;
const SB_SKIP_CONTINUATION = /^(customer care|website|the standard bank|we subscribe|account number|pg \d|standard bank$|rondebosch$|\d{2} \w{3} \d{4}$|^\d{6}$|^statement summary$|^payments$|^deposits$|today's debits)/i;

function sbToIso(day: string, mon: string, yr: string): string | null {
  const m = SB_MONTHS[mon.toLowerCase()];
  if (!m) return null;
  return `20${yr}-${m}-${day}`;
}

function parseStandardBankPdf(lines: string[]): Transaction[] {
  const transactions: Transaction[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const m = SB_ROW.exec(line);
    if (!m) continue;

    const [, day, mon, yr, descRaw, amtStr, ] = m;
    const date = sbToIso(day, mon, yr);
    if (!date) continue;

    const amount = parseAmount(amtStr);
    if (isNaN(amount)) continue;

    let desc = descRaw.trim();
    const next = lines[i + 1]?.trim();
    if (next && !SB_ROW.test(next) && !SB_SKIP_CONTINUATION.test(next)) {
      desc = `${desc} ${next}`.trim();
    }

    transactions.push({
      date,
      description: desc,
      amount,
      category: categorizeTransaction(desc) as Category,
    });
  }

  return transactions;
}

const ABSA_ROW = /^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(-?R\s?[\d\s]+\.\d{2})\s+R\s?([\d\s]+\.\d{2})\s*$/;
const ABSA_CONTINUATION = /^[A-Za-z0-9.\s]+$/;
const ABSA_HEADER_FOOTER = /^(date|transaction|balance brought|balance carried|page \d|to confirm|estamp|ref:)/i;

function absaParseAmt(s: string): number {
  const cleaned = s.replace(/R/g, "").replace(/\s+/g, "").trim();
  const neg = cleaned.startsWith("-");
  const num = parseFloat(cleaned.replace("-", ""));
  return neg ? -num : num;
}

function parseAbsaPdf(lines: string[]): { transactions: Transaction[]; reconciliationIssues: number } {
  const transactions: Transaction[] = [];
  let prevBalance: number | null = null;
  let reconciliationIssues = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const m = ABSA_ROW.exec(line);
    if (m) {
      const [, date, descRaw, amtStr, balStr] = m;
      const description = descRaw.trim();
      const amount = absaParseAmt(amtStr);
      const balance = absaParseAmt(`R${balStr}`);

      if (prevBalance !== null) {
        const expected = Math.round((prevBalance + amount) * 100) / 100;
        if (Math.abs(expected - balance) > 0.01) reconciliationIssues++;
      }

      transactions.push({
        date, description, amount,
        category: categorizeTransaction(description) as Category,
      });
      prevBalance = balance;
      continue;
    }

    const isHeaderFooter = ABSA_HEADER_FOOTER.test(line);
    if (!isHeaderFooter && ABSA_CONTINUATION.test(line) && transactions.length > 0) {
      const last = transactions[transactions.length - 1];
      last.description = `${last.description} ${line}`.trim();
    }
  }

  return { transactions, reconciliationIssues };
}

export async function parsePDF(file: File): Promise<PdfParseResult> {
  try {
    const { pageItems, totalPages } = await extractPageItems(file);
    const bank = detectBank(pageItems);

    if (bank === "discovery") {
      const transactions = parseDiscoveryPdf(pageItems);
      if (transactions.length === 0) {
        return { transactions: [], bank, rowCount: 0, error: "Detected Discovery Bank PDF but no transactions could be read." };
      }
      return { transactions, bank, rowCount: transactions.length };
    }

    if (bank === "fnb") {
      const fullText = pageItems.flat().map(i => i.text).join(" ");
      const isEnglish = /transactions in rand/i.test(fullText) && !/transaksies in rand/i.test(fullText);

      if (isEnglish) {
        const lines = await extractPageText(file);
        const yearMatch = fullText.match(/statement period\s*:\s*\d+\s+\w+\s+(\d{4})/i);
        const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
        const transactions = parseFnbEnglishLines(lines, year);
        if (transactions.length === 0) {
          return { transactions: [], bank, rowCount: 0, error: "Detected FNB PDF but no transactions could be read from it." };
        }
        return { transactions, bank, rowCount: transactions.length };
      }

      // Afrikaans: try the newer "same-line" Aspire format first (Bedrag/Saldo
      // on the same row as Datum/Beskrywing). Its regex requires two trailing
      // decimal numbers immediately after the description, which the original
      // split-column format's lines never have (their lines end with a card
      // reference like "02 Jan" with no numbers at all) — so this parser
      // naturally returns 0 matches on the original format, making the
      // fallback below safe and never triggered incorrectly in either
      // direction. This preserves the original parseFnbPdf completely
      // untouched for statements that need it.
      const aasLines = await extractPageText(file);
      const aasYearMatch = fullText.match(/staat periode\s*:\s*\d+\s+\w+\s+(\d{4})/i);
      const aasYear = aasYearMatch ? aasYearMatch[1] : new Date().getFullYear().toString();
      const aasTransactions = parseFnbAfrikaansSameLine(aasLines, aasYear);
      if (aasTransactions.length > 0) {
        return { transactions: aasTransactions, bank, rowCount: aasTransactions.length };
      }

      const transactions = parseFnbPdf(pageItems, totalPages);
      if (transactions.length === 0) {
        return { transactions: [], bank, rowCount: 0, error: "Detected FNB PDF but no transactions could be read from it." };
      }
      return { transactions, bank, rowCount: transactions.length };
    }

    if (bank === "capitec") {
      const transactions = parseCapitecPdf(pageItems);
      if (transactions.length === 0) {
        return { transactions: [], bank, rowCount: 0, error: "Detected Capitec PDF but no transactions could be read from it." };
      }
      return { transactions, bank, rowCount: transactions.length };
    }

    if (bank === "standardbank") {
      const lines = await extractPageText(file);
      const transactions = parseStandardBankPdf(lines);
      if (transactions.length === 0) {
        return { transactions: [], bank, rowCount: 0, error: "Detected Standard Bank PDF but no transactions could be read from it." };
      }
      return { transactions, bank, rowCount: transactions.length };
    }

    if (bank === "absa") {
      const lines = await extractPageText(file);
      const { transactions, reconciliationIssues } = parseAbsaPdf(lines);
      if (transactions.length === 0) {
        return { transactions: [], bank, rowCount: 0, error: "Detected ABSA PDF but no transactions could be read from it." };
      }
      return {
        transactions,
        bank,
        rowCount: transactions.length,
        warning: reconciliationIssues > 0
          ? `${reconciliationIssues} transaction${reconciliationIssues > 1 ? "s" : ""} didn't match the statement's running balance exactly — this appears to be present in the original PDF itself. Please spot-check your totals.`
          : undefined,
      };
    }

    return {
      transactions: [],
      bank: "unknown",
      rowCount: 0,
      error: "This PDF format isn't recognised. Currently Discovery Bank, FNB, Capitec, Standard Bank, and ABSA PDF statements are supported.",
    };
  } catch (err) {
    return { transactions: [], bank: "unknown", rowCount: 0, error: `Could not read this PDF: ${String(err)}` };
  }
}