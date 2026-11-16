import { ceilToThousands } from "./idr";

export type PathStatus = "sesuai" | "depan" | "tertinggal";

export type SavingsAdvice = {
  remainingIdr: number;
  perDayIdr: number;
  perWeekIdr: number;
  perPersonPerDayIdr: number;
  status: PathStatus;
  gapFromIdealIdr: number;
  achieved: boolean;
  overdue: boolean;
};

export function canWithdraw(balanceIdr: number, amountIdr: number): boolean {
  return amountIdr > 0 && amountIdr <= balanceIdr;
}

export function savingsAdvice(input: {
  targetIdr: number;
  balanceIdr: number;
  remainingDays: number;
  memberCount: number;
  daysInPlan: number;
  daysElapsedIncludingToday: number;
}): SavingsAdvice {
  const remainingIdr = Math.max(0, input.targetIdr - input.balanceIdr);
  const achieved = remainingIdr === 0;
  const overdue = !achieved && input.remainingDays === 0;
  const members = Math.max(1, input.memberCount);

  let perDayIdr = 0;
  let perWeekIdr = 0;
  let perPersonPerDayIdr = 0;

  if (!achieved && !overdue && input.remainingDays > 0) {
    perDayIdr = ceilToThousands(remainingIdr / input.remainingDays);
    perWeekIdr =
      input.remainingDays < 7 ? remainingIdr : perDayIdr * 7;
    perPersonPerDayIdr = ceilToThousands(perDayIdr / members);
  }

  const elapsed = Math.min(
    input.daysInPlan,
    Math.max(1, input.daysElapsedIncludingToday),
  );
  const plan = Math.max(1, input.daysInPlan);
  const ideal = Math.round((input.targetIdr * elapsed) / plan);
  const gapFromIdealIdr = input.balanceIdr - ideal;

  let status: PathStatus = "sesuai";
  if (achieved || gapFromIdealIdr > 0) status = "depan";
  else if (gapFromIdealIdr < 0) status = "tertinggal";

  if (Math.abs(gapFromIdealIdr) < 1000 && !achieved && !overdue) {
    status = "sesuai";
  }

  return {
    remainingIdr,
    perDayIdr,
    perWeekIdr,
    perPersonPerDayIdr,
    status,
    gapFromIdealIdr,
    achieved,
    overdue,
  };
}
