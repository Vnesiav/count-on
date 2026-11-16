const WIB = "Asia/Jakarta";

export function wibTodayIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function parseIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function remainingDaysInclusive(todayIso: string, deadlineIso: string): number {
  const diff = Math.round((parseIso(deadlineIso) - parseIso(todayIso)) / 86_400_000);
  return diff < 0 ? 0 : diff + 1;
}

export function daysBetweenInclusive(fromIso: string, toIso: string): number {
  const diff = Math.round((parseIso(toIso) - parseIso(fromIso)) / 86_400_000);
  return diff < 0 ? 0 : diff + 1;
}

export function calendarMonthRange(todayIso: string): { from: string; to: string } {
  const [y, m] = todayIso.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return {
    from: `${y}-${mm}-01`,
    to: `${y}-${mm}-${String(last).padStart(2, "0")}`,
  };
}

export function endOfMonthIso(todayIso: string): string {
  return calendarMonthRange(todayIso).to;
}
