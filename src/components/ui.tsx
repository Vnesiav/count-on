import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] bg-[#FFFBF8] p-5 shadow-[0_8px_30px_rgba(47,44,42,0.06)] ${className}`}
    >
      {children}
    </section>
  );
}

export function Button({
  children,
  tone = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "rose" | "ghost";
}) {
  const tones = {
    primary: "bg-[#7FA894] text-white",
    rose: "bg-[#D4A5A5] text-white",
    ghost: "bg-transparent text-[#2F2C2A] border border-black/10",
  };
  return (
    <button
      className={`min-h-12 rounded-2xl px-5 text-base font-medium disabled:opacity-50 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-[#6B6560]">
      {label}
      <input
        className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 text-base text-[#2F2C2A] outline-none focus:border-[#7FA894]"
        {...props}
      />
    </label>
  );
}
