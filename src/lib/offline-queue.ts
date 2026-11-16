const KEY = "count-on-offline-queue";

export type QueuedCreate =
  | {
      type: "expense";
      roomId: string;
      payload: Record<string, unknown>;
    }
  | {
      type: "savings";
      roomId: string;
      payload: Record<string, unknown>;
    };

export function readQueue(): QueuedCreate[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QueuedCreate[];
  } catch {
    return [];
  }
}

export function enqueue(item: QueuedCreate) {
  const next = [...readQueue(), item];
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function replaceQueue(items: QueuedCreate[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function wipeLocalFinance() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  const keys = Object.keys(localStorage).filter((k) => k.startsWith("count-on-"));
  keys.forEach((k) => localStorage.removeItem(k));
  if ("caches" in window) {
    void caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n.startsWith("count-on"))
          .map((n) => caches.delete(n)),
      ),
    );
  }
}
