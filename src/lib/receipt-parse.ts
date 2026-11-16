export function parseReceiptText(text: string): {
  amount: number | null;
  date: string | null;
  store: string | null;
} {
  const amount = parseAmount(text);
  const date = parseDate(text);
  const store = parseStore(text);
  return { amount, date, store };
}

function parseAmount(text: string): number | null {
  const lines = text.split(/\n+/);
  const candidates: number[] = [];
  const re =
    /(?:rp|idr)?\s*([0-9]{1,3}(?:[.\s][0-9]{3})+|[0-9]{4,})(?:[.,][0-9]{2})?/gi;
  for (const line of lines) {
    if (!/(total|jumlah|grand|bayar|rp)/i.test(line) && !re.test(line)) {
      continue;
    }
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(line))) {
      const digits = match[1].replace(/[.\s]/g, "");
      const n = Number(digits);
      if (n >= 1000 && n <= 100_000_000) candidates.push(n);
    }
  }
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

function parseDate(text: string): string | null {
  const dmy = text.match(
    /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/,
  );
  if (!dmy) return null;
  let y = Number(dmy[3]);
  if (y < 100) y += 2000;
  const m = String(dmy[2]).padStart(2, "0");
  const d = String(dmy[1]).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseStore(text: string): string | null {
  const line = text
    .split(/\n/)
    .map((l) => l.trim())
    .find((l) => l.length >= 3 && /[a-zA-Z]/.test(l));
  return line ? line.slice(0, 80) : null;
}
