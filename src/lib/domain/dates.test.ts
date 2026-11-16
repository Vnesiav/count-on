import { describe, expect, it } from "vitest";
import { calendarMonthRange, remainingDaysInclusive } from "./dates";

describe("remainingDaysInclusive", () => {
  it("counts the deadline day", () => {
    expect(remainingDaysInclusive("2026-11-16", "2026-11-16")).toBe(1);
    expect(remainingDaysInclusive("2026-11-16", "2026-12-05")).toBe(20);
  });

  it("returns 0 when the deadline is already past", () => {
    expect(remainingDaysInclusive("2026-11-16", "2026-11-15")).toBe(0);
  });
});

describe("calendarMonthRange", () => {
  it("uses the WIB calendar month", () => {
    expect(calendarMonthRange("2026-11-16")).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    });
  });
});
