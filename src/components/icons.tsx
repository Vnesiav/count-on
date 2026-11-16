import type { ReactNode } from "react";
import type { CategoryId } from "@/lib/domain/categories";
import { categoryChip } from "@/lib/domain/categories";

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[46%] w-[46%]"
    >
      {children}
    </svg>
  );
}

const CATEGORY_GLYPH: Record<CategoryId, ReactNode> = {
  makan: (
    <Glyph>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </Glyph>
  ),
  transport: (
    <Glyph>
      <circle cx="18.5" cy="17.5" r="2.5" />
      <circle cx="5.5" cy="17.5" r="2.5" />
      <path d="M15 6h2l3 6v5h-3" />
      <path d="M5 17H3v-5l3-6h6v11H8" />
    </Glyph>
  ),
  rumah: (
    <Glyph>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10.5V20h14v-9.5" />
    </Glyph>
  ),
  kesehatan: (
    <Glyph>
      <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10Z" />
    </Glyph>
  ),
  hiburan: (
    <Glyph>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M10 10v4l4-2-4-2Z" />
    </Glyph>
  ),
  belanja: (
    <Glyph>
      <path d="M6 7h15l-1.5 9h-12L5 4H2" />
      <circle cx="9" cy="20" r="1.2" />
      <circle cx="18" cy="20" r="1.2" />
    </Glyph>
  ),
  lainnya: (
    <Glyph>
      <circle cx="6" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" />
    </Glyph>
  ),
};

export function CategoryIcon({
  category,
  size = 44,
}: {
  category: CategoryId;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `${categoryChip(category)}66`,
        color: "#2F2C2A",
      }}
    >
      {CATEGORY_GLYPH[category]}
    </span>
  );
}

export function ActionTile({
  label,
  color,
  children,
  onClick,
}: {
  label: string;
  color: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-3xl bg-[#FFFBF8] px-1 py-4 shadow-[0_8px_24px_rgba(47,44,42,0.05)]"
    >
      <span
        className="inline-flex h-14 w-14 items-center justify-center rounded-full text-[#2F2C2A]"
        style={{ background: color }}
      >
        {children}
      </span>
      <span className="text-[11px] font-medium text-[#2F2C2A]">{label}</span>
    </button>
  );
}

export function MiniIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      {children}
    </svg>
  );
}

export const navGlyphs = {
  beranda: (
    <MiniIcon>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </MiniIcon>
  ),
  riwayat: (
    <MiniIcon>
      <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </MiniIcon>
  ),
  tambah: (
    <MiniIcon>
      <path d="M12 5v14M5 12h14" />
    </MiniIcon>
  ),
  tabungan: (
    <MiniIcon>
      <path d="M19 8a7 7 0 1 0 0 8" />
      <circle cx="11" cy="12" r="7" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
    </MiniIcon>
  ),
  ruang: (
    <MiniIcon>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M3 19c.5-3 3-5 6-5s5.5 2 6 5" />
      <path d="M14 14.5c1.8 0 4 1.2 4.5 3.5" />
    </MiniIcon>
  ),
};

export function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function CameraGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function PiggyGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M19 8a7 7 0 1 0 0 8" />
      <circle cx="11" cy="12" r="7" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

export function ReceiptGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}
