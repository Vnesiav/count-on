import { describe, expect, it } from "vitest";
import { canWithdraw, savingsAdvice } from "./savings";

describe("savingsAdvice", () => {
  it("matches the PRD example for 3 people and 20 days left", () => {
    const advice = savingsAdvice({
      targetIdr: 3_000_000,
      balanceIdr: 1_200_000,
      remainingDays: 20,
      memberCount: 3,
      daysInPlan: 30,
      daysElapsedIncludingToday: 11,
    });

    expect(advice.remainingIdr).toBe(1_800_000);
    expect(advice.perDayIdr).toBe(90_000);
    expect(advice.perWeekIdr).toBe(630_000);
    expect(advice.perPersonPerDayIdr).toBe(30_000);
    expect(advice.status).toBe("depan");
  });

  it("uses remaining target as weekly amount when fewer than 7 days left", () => {
    const advice = savingsAdvice({
      targetIdr: 100_000,
      balanceIdr: 0,
      remainingDays: 3,
      memberCount: 2,
      daysInPlan: 10,
      daysElapsedIncludingToday: 8,
    });

    expect(advice.perWeekIdr).toBe(advice.remainingIdr);
  });

  it("zeros recommendations when the target is already met", () => {
    const advice = savingsAdvice({
      targetIdr: 1_000_000,
      balanceIdr: 1_000_000,
      remainingDays: 5,
      memberCount: 2,
      daysInPlan: 10,
      daysElapsedIncludingToday: 6,
    });

    expect(advice.remainingIdr).toBe(0);
    expect(advice.perDayIdr).toBe(0);
    expect(advice.perWeekIdr).toBe(0);
    expect(advice.perPersonPerDayIdr).toBe(0);
    expect(advice.achieved).toBe(true);
  });

  it("marks overdue when the deadline passed before the target", () => {
    const advice = savingsAdvice({
      targetIdr: 500_000,
      balanceIdr: 100_000,
      remainingDays: 0,
      memberCount: 2,
      daysInPlan: 10,
      daysElapsedIncludingToday: 11,
    });

    expect(advice.overdue).toBe(true);
    expect(advice.remainingIdr).toBe(400_000);
  });

  it("rejects a withdrawal larger than the balance", () => {
    expect(canWithdraw(100, 150)).toBe(false);
    expect(canWithdraw(100, 100)).toBe(true);
  });
});
