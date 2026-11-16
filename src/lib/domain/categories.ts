export type CategoryId =
  | "makan"
  | "transport"
  | "rumah"
  | "kesehatan"
  | "hiburan"
  | "belanja"
  | "lainnya";

export type NeedTag = "primer" | "sekunder";

export const CATEGORIES: {
  id: CategoryId;
  label: string;
  chip: string;
  defaultTag: NeedTag | null;
}[] = [
  { id: "makan", label: "Makan", chip: "#E7C27A", defaultTag: null },
  { id: "transport", label: "Transport", chip: "#8FB8C9", defaultTag: "primer" },
  { id: "rumah", label: "Rumah", chip: "#A8C5B5", defaultTag: "primer" },
  { id: "kesehatan", label: "Kesehatan", chip: "#C5B4D9", defaultTag: "primer" },
  { id: "hiburan", label: "Hiburan", chip: "#E8B4B4", defaultTag: "sekunder" },
  { id: "belanja", label: "Belanja", chip: "#E8C4B0", defaultTag: "sekunder" },
  { id: "lainnya", label: "Lainnya", chip: "#D4CFC7", defaultTag: null },
];

export function defaultTagFor(category: CategoryId): NeedTag | null {
  return CATEGORIES.find((c) => c.id === category)?.defaultTag ?? null;
}

export function categoryChip(category: CategoryId): string {
  return CATEGORIES.find((c) => c.id === category)?.chip ?? "#D4CFC7";
}

export function categoryLabel(category: CategoryId): string {
  return CATEGORIES.find((c) => c.id === category)?.label ?? category;
}
