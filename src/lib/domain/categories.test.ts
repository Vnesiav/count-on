import { describe, expect, it } from "vitest";
import { CATEGORIES, defaultTagFor } from "./categories";

describe("categories", () => {
  it("keeps the shared MVP list short", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([
      "makan",
      "transport",
      "rumah",
      "kesehatan",
      "hiburan",
      "belanja",
      "lainnya",
    ]);
  });

  it("defaults transport to primer and hiburan to sekunder", () => {
    expect(defaultTagFor("transport")).toBe("primer");
    expect(defaultTagFor("hiburan")).toBe("sekunder");
  });

  it("requires a manual tag for makan and lainnya", () => {
    expect(defaultTagFor("makan")).toBeNull();
    expect(defaultTagFor("lainnya")).toBeNull();
  });
});
