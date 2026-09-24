export type StatementDateFormat = "auto" | "mdy" | "dmy";

export type ParsedStatementRow = {
  merchant: string;
  amount: number;
  currency: string;
  transaction_date: string;
};

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const NON_TRANSACTION_TERMS = [
  "amount due",
  "available credit",
  "closing balance",
  "credit limit",
  "minimum payment",
  "new balance",
  "opening balance",
  "payment received",
  "previous balance",
  "statement balance",
  "total credits",
  "total debits",
  "total payments",
];

function isoDate(year: number, month: number, day: number) {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fourDigitYear(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const numeric = Number(value);
  return value.length === 2 ? 2000 + numeric : numeric;
}

function parseDateToken(token: string, format: StatementDateFormat, fallbackYear: number) {
  const value = token.trim().replace(/,$/, "");
  const iso = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dayFirstName = value.match(/^(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{2,4}))?$/);
  if (dayFirstName) {
    return isoDate(
      fourDigitYear(dayFirstName[3], fallbackYear),
      MONTHS[dayFirstName[2].toLowerCase()] ?? 0,
      Number(dayFirstName[1]),
    );
  }

  const monthFirstName = value.match(/^([A-Za-z]{3,9})\s+(\d{1,2})(?:,?\s+(\d{2,4}))?$/);
  if (monthFirstName) {
    return isoDate(
      fourDigitYear(monthFirstName[3], fallbackYear),
      MONTHS[monthFirstName[1].toLowerCase()] ?? 0,
      Number(monthFirstName[2]),
    );
  }

  const numeric = value.match(/^(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?$/);
  if (!numeric) return null;
  const first = Number(numeric[1]);
  const second = Number(numeric[2]);
  const year = fourDigitYear(numeric[3], fallbackYear);
  const dayFirst = format === "dmy" || (format === "auto" && first > 12);
  return dayFirst ? isoDate(year, second, first) : isoDate(year, first, second);
}

function inferredYear(text: string, requestedYear?: number) {
  if (requestedYear && requestedYear >= 2000 && requestedYear <= 2100) return requestedYear;
  const years = Array.from(text.matchAll(/\b(20\d{2})\b/g), (match) => Number(match[1]));
  return years.at(-1) ?? new Date().getUTCFullYear();
}

function currencyFromToken(token: string | undefined, fallback: string) {
  const value = token?.toUpperCase();
  if (!value || value === "$") return fallback;
  if (value === "S$") return "SGD";
  if (value === "US$") return "USD";
  if (value === "A$") return "AUD";
  if (value === "C$") return "CAD";
  if (value === "£") return "GBP";
  if (value === "€") return "EUR";
  return /^[A-Z]{3}$/.test(value) ? value : fallback;
}

const DATE_AT_START = /^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?|\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{2,4})?|[A-Za-z]{3,9}\s+\d{1,2}(?:,?\s+\d{2,4})?)\s+(.+)$/;
const TRAILING_AMOUNT = /(?:^|\s)(?:(US\$|S\$|A\$|C\$|[A-Z]{3}|[$£€])\s*)?(\(?-?\d+(?:,\d{3})*(?:\.\d{2})\)?)(?:\s*(CR|DR))?\s*$/i;

function parseTransactionLine(line: string, format: StatementDateFormat, year: number, defaultCurrency: string) {
  const clean = line.replace(/\s+/g, " ").trim();
  const dateMatch = clean.match(DATE_AT_START);
  if (!dateMatch) return null;
  const transactionDate = parseDateToken(dateMatch[1], format, year);
  if (!transactionDate) return null;

  let remainder = dateMatch[2].trim();
  const secondDate = remainder.match(DATE_AT_START);
  if (secondDate && parseDateToken(secondDate[1], format, year)) remainder = secondDate[2].trim();

  const amountMatch = remainder.match(TRAILING_AMOUNT);
  if (!amountMatch) return null;
  const rawAmount = amountMatch[2];
  const credit = rawAmount.startsWith("-") || rawAmount.startsWith("(") || amountMatch[3]?.toUpperCase() === "CR";
  if (credit) return null;

  const merchant = remainder.slice(0, amountMatch.index).replace(/\s+/g, " ").trim().replace(/[-–—|]+$/, "").trim();
  if (merchant.length < 2 || NON_TRANSACTION_TERMS.some((term) => merchant.toLowerCase().includes(term))) return null;
  const amount = Number(rawAmount.replace(/[(),]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    merchant,
    amount: Math.round(amount * 100) / 100,
    currency: currencyFromToken(amountMatch[1], defaultCurrency),
    transaction_date: transactionDate,
  } satisfies ParsedStatementRow;
}

export function parseStatementText(text: string, options: {
  dateFormat?: StatementDateFormat;
  defaultCurrency?: string;
  statementYear?: number;
} = {}) {
  const dateFormat = options.dateFormat ?? "auto";
  const defaultCurrency = (options.defaultCurrency ?? "USD").toUpperCase();
  const year = inferredYear(text, options.statementYear);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows: ParsedStatementRow[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    let parsed: ParsedStatementRow | null = null;
    let consumed = 0;
    for (let extra = 0; extra < 3 && index + extra < lines.length; extra += 1) {
      parsed = parseTransactionLine(lines.slice(index, index + extra + 1).join(" "), dateFormat, year, defaultCurrency);
      if (parsed) {
        consumed = extra;
        break;
      }
    }
    if (parsed) {
      rows.push(parsed);
      index += consumed;
    }
  }

  if (!rows.length) {
    throw new Error("No card transactions could be read from this PDF. If it is a scanned statement, export a text-based PDF or use CSV until OCR is connected.");
  }
  return rows;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

export function parseStatementCsv(csv: string, defaultCurrency = "USD") {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV must include a header row and at least one transaction");
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().replaceAll(" ", "_"));
  const find = (...names: string[]) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const merchantIndex = find("merchant", "vendor", "description");
  const amountIndex = find("amount", "total");
  const dateIndex = find("transaction_date", "date", "posted_date");
  const currencyIndex = find("currency");
  if (merchantIndex < 0 || amountIndex < 0 || dateIndex < 0) throw new Error("CSV headers must include merchant, amount, and date");

  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    const amount = Number(values[amountIndex]?.replace(/[$,]/g, ""));
    const rawDate = values[dateIndex];
    const parsed = new Date(rawDate);
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
    if (!values[merchantIndex] || !Number.isFinite(amount) || !parsedDate) throw new Error(`Invalid data on CSV row ${rowIndex + 2}`);
    return {
      merchant: values[merchantIndex],
      amount: Math.abs(Math.round(amount * 100) / 100),
      currency: (currencyIndex >= 0 ? values[currencyIndex] : defaultCurrency).toUpperCase() || defaultCurrency,
      transaction_date: parsedDate,
    } satisfies ParsedStatementRow;
  });
}

export async function parseStatementPdf(data: Uint8Array, options: {
  dateFormat?: StatementDateFormat;
  defaultCurrency?: string;
  statementYear?: number;
} = {}) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(data, { maxImageSize: 16_777_216 });
  const destroy = async () => {
    if ("destroy" in pdf && typeof pdf.destroy === "function") await pdf.destroy();
  };
  if (pdf.numPages > 30) {
    await destroy();
    throw new Error("Statement PDFs are limited to 30 pages");
  }
  try {
    const extracted = await Promise.race([
      extractText(pdf, { mergePages: true }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("PDF parsing timed out")), 15_000)),
    ]);
    const text = Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text;
    return { rows: parseStatementText(text, options), pageCount: extracted.totalPages };
  } finally {
    await destroy();
  }
}
