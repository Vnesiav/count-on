import { describe, expect, it } from "vitest";
import { ceilToThousands, formatIdr } from "./idr";

describe("ceilToThousands", () => {
  it("rounds 90000 up to itself", () => {
    expect(ceilToThousands(90_000)).toBe(90_000);
  });

  it("rounds 90001 up to the next thousand", () => {
    expect(ceilToThousands(90_001)).toBe(91_000);
  });

  it("keeps zero at zero", () => {
    expect(ceilToThousands(0)).toBe(0);
  });
});

describe("formatIdr", () => {
  it("formats rupiah without decimals", () => {
    expect(formatIdr(1_800_000)).toBe("Rp1.800.000");
  });
});
