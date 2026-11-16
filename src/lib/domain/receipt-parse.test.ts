import { describe, expect, it } from "vitest";
import { parseReceiptText } from "../receipt-parse";

describe("parseReceiptText", () => {
  it("picks the largest rupiah-looking total and a date", () => {
    const parsed = parseReceiptText(
      "Alfamart Sudirman\n16/11/2026\nIndomie 3500\nTotal Rp 27.500",
    );
    expect(parsed.amount).toBe(27500);
    expect(parsed.date).toBe("2026-11-16");
    expect(parsed.store)?.toMatch(/Alfamart/i);
  });
});
