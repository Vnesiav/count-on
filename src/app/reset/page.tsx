"use client";

import { FormEvent, useEffect, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { Button, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function ResetPage() {
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setRecovery(window.location.hash.includes("type=recovery"));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setDone(true);
  }

  if (recovery) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5">
        <h1 className="text-3xl font-semibold">Kata sandi baru</h1>
        {done ? (
          <p>Sandi diganti. Silakan masuk lagi.</p>
        ) : (
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field
              label="Kata sandi baru"
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit">Simpan</Button>
          </form>
        )}
      </main>
    );
  }

  return <AuthForm mode="reset" />;
}
