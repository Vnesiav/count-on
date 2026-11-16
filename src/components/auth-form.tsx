"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  isDemoLogin,
  setDemoCookie,
} from "@/lib/demo";
import { createClient } from "@/lib/supabase/client";
import { Button, Field } from "@/components/ui";

export function AuthForm({
  mode,
}: {
  mode: "masuk" | "daftar" | "reset";
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "masuk" && isDemoLogin(email, password)) {
        setDemoCookie();
        router.replace("/app");
        router.refresh();
        return;
      }
      const supabase = createClient();
      if (mode === "masuk") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/app");
        router.refresh();
      } else if (mode === "daftar") {
        const origin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: `${origin}/app`,
          },
        });
        if (error) throw error;
        setMessage(
          "Cek email untuk verifikasi sebelum membuat atau gabung ruang.",
        );
      } else {
        const origin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/reset`,
        });
        if (error) throw error;
        setMessage("Tautan reset sandi sudah dikirim ke email.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div>
        <p className="text-sm tracking-wide text-[#7FA894]">COUNT ON</p>
        <h1 className="mt-1 text-3xl font-semibold">
          {mode === "masuk"
            ? "Masuk"
            : mode === "daftar"
              ? "Buat akun"
              : "Reset sandi"}
        </h1>
        <p className="mt-2 text-[#6B6560]">
          Catat bersama, hitung bersama.
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "daftar" ? (
          <Field
            label="Nama tampilan"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        ) : null}
        <Field
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== "reset" ? (
          <Field
            label="Kata sandi"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "daftar" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Sebentar…" : mode === "masuk" ? "Masuk" : mode === "daftar" ? "Daftar" : "Kirim tautan"}
        </Button>
      </form>
      {message ? <p className="text-sm text-[#D4A5A5]">{message}</p> : null}
      {mode === "masuk" ? (
        <p className="rounded-2xl bg-[#FFFBF8] p-4 text-sm text-[#6B6560]">
          Akun dummy: <span className="text-[#2F2C2A]">{DEMO_EMAIL}</span>
          <br />
          Sandi: <span className="text-[#2F2C2A]">{DEMO_PASSWORD}</span>
        </p>
      ) : null}
      <nav className="flex flex-col gap-2 text-sm text-[#6B6560]">
        {mode !== "masuk" ? (
          <Link href="/masuk" className="text-[#7FA894]">
            Sudah punya akun? Masuk
          </Link>
        ) : null}
        {mode !== "daftar" ? (
          <Link href="/daftar" className="text-[#7FA894]">
            Belum punya akun? Daftar
          </Link>
        ) : null}
        {mode !== "reset" ? (
          <Link href="/reset" className="text-[#7FA894]">
            Lupa kata sandi
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
