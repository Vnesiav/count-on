"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORIES,
  categoryLabel,
  defaultTagFor,
  type CategoryId,
  type NeedTag,
} from "@/lib/domain/categories";
import {
  calendarMonthRange,
  daysBetweenInclusive,
  endOfMonthIso,
  remainingDaysInclusive,
  wibTodayIso,
} from "@/lib/domain/dates";
import { formatIdr } from "@/lib/domain/idr";
import { canWithdraw, savingsAdvice } from "@/lib/domain/savings";
import { parseReceiptText } from "@/lib/receipt-parse";
import {
  enqueue,
  readQueue,
  replaceQueue,
  wipeLocalFinance,
} from "@/lib/offline-queue";
import { createDemoClient } from "@/lib/demo";
import { createClient } from "@/lib/supabase/client";
import {
  ActionTile,
  CameraGlyph,
  CategoryIcon,
  PiggyGlyph,
  PlusGlyph,
  ReceiptGlyph,
  navGlyphs,
} from "@/components/icons";
import { Button, Card, Field } from "@/components/ui";

type Room = { id: string; name: string; owner_id: string };
type Member = { user_id: string; display_name: string };
type Expense = {
  id: string;
  amount_idr: number;
  spent_on: string;
  store: string | null;
  note: string | null;
  category: CategoryId;
  tag: NeedTag;
  created_by: string;
};
type Movement = {
  id: string;
  kind: "setor" | "tarik";
  amount_idr: number;
  moved_on: string;
  note: string | null;
  created_by: string;
};
type Target = { amount_idr: number; deadline: string; created_at: string };

type Tab = "beranda" | "riwayat" | "tambah" | "tabungan" | "ruang";

export function AppShell({
  userId,
  initialRooms,
  inviteToken,
  demo = false,
}: {
  userId: string;
  initialRooms: Room[];
  inviteToken?: string;
  demo?: boolean;
}) {
  const supabase = useMemo(
    () => (demo ? createDemoClient() : createClient()),
    [demo],
  );
  const router = useRouter();
  const [rooms, setRooms] = useState(initialRooms);
  const [roomId, setRoomId] = useState(initialRooms[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("beranda");
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [range, setRange] = useState(() => calendarMonthRange(wibTodayIso()));
  const [error, setError] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const today = wibTodayIso();

  const room = rooms.find((r) => r.id === roomId);
  const isOwner = room?.owner_id === userId;

  async function refreshRoom(id: string) {
    if (!id) return;
    const [{ data: mem }, { data: ex }, { data: mv }, { data: tg }] =
      await Promise.all([
        supabase.from("room_members").select("user_id").eq("room_id", id),
        supabase.from("expenses").select("*").eq("room_id", id).order("spent_on", { ascending: false }),
        supabase.from("savings_movements").select("*").eq("room_id", id).order("moved_on", { ascending: false }),
        supabase.from("savings_targets").select("*").eq("room_id", id).maybeSingle(),
      ]);
    const ids = (mem ?? []).map((row) => row.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] };

    setMembers(
      ids.map((uid) => ({
        user_id: uid,
        display_name:
          profiles?.find((p) => p.id === uid)?.display_name ?? "Anggota",
      })),
    );
    setExpenses((ex ?? []) as Expense[]);
    setMovements((mv ?? []) as Movement[]);
    setTarget((tg as Target | null) ?? null);
    await supabase.from("profiles").update({ last_room_id: id }).eq("id", userId);
  }

  useEffect(() => {
    void refreshRoom(roomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (!inviteToken) return;
    void (async () => {
      const { data, error: err } = await supabase.rpc("accept_invite", {
        p_token: inviteToken,
      });
      if (err) setError(err.message);
      else if (data) {
        router.replace("/app");
        router.refresh();
      }
    })();
  }, [inviteToken, router, supabase]);

  useEffect(() => {
    async function flush() {
      if (!navigator.onLine) return;
      const leftover = [];
      for (const item of readQueue()) {
        const table = item.type === "expense" ? "expenses" : "savings_movements";
        const { error: err } = await supabase.from(table).insert(item.payload);
        if (err) leftover.push(item);
      }
      replaceQueue(leftover);
      if (roomId) await refreshRoom(roomId);
    }
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const filtered = expenses.filter(
    (e) => e.spent_on >= range.from && e.spent_on <= range.to,
  );
  const spendTotal = filtered.reduce((s, e) => s + e.amount_idr, 0);
  const balance = movements.reduce(
    (s, m) => s + (m.kind === "setor" ? m.amount_idr : -m.amount_idr),
    0,
  );

  const advice = target
    ? savingsAdvice({
        targetIdr: target.amount_idr,
        balanceIdr: balance,
        remainingDays: remainingDaysInclusive(today, target.deadline),
        memberCount: Math.max(1, members.length),
        daysInPlan: daysBetweenInclusive(
          target.created_at.slice(0, 10),
          target.deadline,
        ),
        daysElapsedIncludingToday: daysBetweenInclusive(
          target.created_at.slice(0, 10),
          today,
        ),
      })
    : null;

  async function createRoom(e: FormEvent) {
    e.preventDefault();
    const { data, error: err } = await supabase.rpc("create_room", {
      p_name: newRoomName,
    });
    if (err) return setError(err.message);
    setNewRoomName("");
    router.refresh();
    if (data) setRoomId(data as string);
  }

  async function createInvite() {
    if (!room) return;
    const token = crypto.randomUUID().replace(/-/g, "");
    const expires = new Date(Date.now() + 7 * 86400_000).toISOString();
    const { error: err } = await supabase.from("invites").insert({
      room_id: room.id,
      token,
      expires_at: expires,
      created_by: userId,
    });
    if (err) return setError(err.message);
    const url = `${window.location.origin}/undang/${token}`;
    setInviteUrl(url);
    await navigator.clipboard.writeText(url).catch(() => undefined);
  }

  async function logout() {
    wipeLocalFinance();
    await supabase.auth.signOut();
    router.replace("/masuk");
  }

  if (!room) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-10">
        <h1 className="text-3xl font-semibold">Ruang pertama</h1>
        <p className="text-[#6B6560]">
          Buat ruang, atau buka tautan undangan setelah email terverifikasi.
        </p>
        <form onSubmit={createRoom} className="flex flex-col gap-3">
          <Field
            label="Nama ruang"
            required
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
          <Button type="submit">Buat ruang</Button>
        </form>
        {error ? <p className="text-[#D4A5A5]">{error}</p> : null}
        <Button tone="ghost" onClick={() => void logout()}>
          Keluar
        </Button>
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col pb-28">
      <header className="flex items-center justify-between px-5 pt-6">
        <label className="flex flex-col text-xs text-[#6B6560]">
          Ruang
          <select
            className="mt-1 min-h-11 rounded-2xl border-none bg-[#FFFBF8] px-3 text-base text-[#2F2C2A]"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <span className="text-sm font-medium text-[#7FA894]">Count On</span>
      </header>

      {error ? <p className="px-5 pt-3 text-sm text-[#D4A5A5]">{error}</p> : null}

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        {tab === "beranda" ? (
          <>
            <section className="rounded-[28px] bg-gradient-to-br from-[#7FA894] to-[#6B9A84] p-5 text-white shadow-[0_12px_30px_rgba(127,168,148,0.35)]">
              <p className="text-sm text-white/80">Saldo tabungan</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight">
                {formatIdr(balance)}
              </p>
              {advice ? (
                <p className="mt-3 text-sm text-white/85">
                  {advice.achieved
                    ? "Target tercapai."
                    : advice.overdue
                      ? `Tenggat lewat, kurang ${formatIdr(advice.remainingIdr)}.`
                      : `Setor ${formatIdr(advice.perDayIdr)}/hari · ${formatIdr(advice.perPersonPerDayIdr)}/orang`}
                </p>
              ) : (
                <p className="mt-3 text-sm text-white/85">Belum ada target aktif.</p>
              )}
            </section>
            <div className="grid grid-cols-4 gap-2">
              <ActionTile
                label="Tambah"
                color="#CDE3D6"
                onClick={() => setTab("tambah")}
              >
                <PlusGlyph />
              </ActionTile>
              <ActionTile
                label="Scan"
                color="#F3D6D6"
                onClick={() => setTab("tambah")}
              >
                <CameraGlyph />
              </ActionTile>
              <ActionTile
                label="Setor"
                color="#D6E4F0"
                onClick={() => setTab("tabungan")}
              >
                <PiggyGlyph />
              </ActionTile>
              <ActionTile
                label="Riwayat"
                color="#E8D9F0"
                onClick={() => setTab("riwayat")}
              >
                <ReceiptGlyph />
              </ActionTile>
            </div>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#6B6560]">Pengeluaran bulan ini</p>
                  <p className="mt-1 text-3xl font-semibold">{formatIdr(spendTotal)}</p>
                </div>
                <CategoryIcon category="belanja" size={52} />
              </div>
              <p className="mt-1 text-xs text-[#6B6560]">
                {range.from} → {range.to}
              </p>
            </Card>
          </>
        ) : null}

        {tab === "riwayat" ? (
          <History
            expenses={filtered}
            members={members}
            range={range}
            setRange={setRange}
            all={expenses}
            userId={userId}
            onSave={async (id, patch) => {
              const { error: err } = await supabase
                .from("expenses")
                .update(patch)
                .eq("id", id)
                .eq("created_by", userId);
              if (err) setError(err.message);
              else await refreshRoom(roomId);
            }}
          />
        ) : null}

        {tab === "tambah" ? (
          <ExpenseForm
            userId={userId}
            roomId={roomId}
            demo={demo}
            onSaved={() => {
              void refreshRoom(roomId);
              setTab("riwayat");
            }}
            onError={setError}
          />
        ) : null}

        {tab === "tabungan" ? (
          <SavingsPanel
            userId={userId}
            roomId={roomId}
            demo={demo}
            balance={balance}
            movements={movements}
            members={members}
            target={target}
            advice={advice}
            today={today}
            onChange={() => void refreshRoom(roomId)}
            onError={setError}
          />
        ) : null}

        {tab === "ruang" ? (
          <section className="flex flex-col gap-4">
            <Card>
              <p className="font-medium">Anggota ({members.length}/3)</p>
              <ul className="mt-3 space-y-2 text-sm">
                {members.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between">
                    <span>
                      {m.display_name}
                      {m.user_id === room.owner_id ? " · pemilik" : ""}
                    </span>
                    {isOwner && m.user_id !== userId ? (
                      <button
                        className="text-[#D4A5A5]"
                        onClick={async () => {
                          const { error: err } = await supabase.rpc("kick_member", {
                            p_room: roomId,
                            p_user: m.user_id,
                          });
                          if (err) setError(err.message);
                          else await refreshRoom(roomId);
                        }}
                      >
                        Keluarkan
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
            {isOwner ? (
              <Button onClick={() => void createInvite()}>Undang (salin tautan 7 hari)</Button>
            ) : (
              <Button
                tone="rose"
                onClick={async () => {
                  await supabase
                    .from("room_members")
                    .delete()
                    .eq("room_id", roomId)
                    .eq("user_id", userId);
                  router.refresh();
                }}
              >
                Keluar dari ruang
              </Button>
            )}
            {inviteUrl ? (
              <p className="break-all text-xs text-[#6B6560]">{inviteUrl}</p>
            ) : null}
            <form onSubmit={createRoom} className="flex flex-col gap-3">
              <Field
                label="Buat ruang lain"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                required
              />
              <Button tone="ghost" type="submit">
                Buat
              </Button>
            </form>
            {isOwner ? (
              <RenameRoom
                name={room.name}
                onSave={async (name) => {
                  await supabase.from("rooms").update({ name }).eq("id", roomId);
                  router.refresh();
                }}
              />
            ) : null}
            <Button tone="ghost" onClick={() => void logout()}>
              Keluar akun
            </Button>
          </section>
        ) : null}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 mx-auto flex max-w-md items-end justify-around border-t border-black/5 bg-[#FFFBF8]/95 px-3 pb-3 pt-2 backdrop-blur">
        {(
          [
            ["beranda", "Beranda"],
            ["riwayat", "Riwayat"],
            ["tambah", "Tambah"],
            ["tabungan", "Tabungan"],
            ["ruang", "Ruang"],
          ] as const
        ).map(([id, label]) => {
          const glyph = navGlyphs[id];
          const active = tab === id;
          if (id === "tambah") {
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="-mt-5 flex flex-col items-center gap-1"
              >
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#7FA894] text-white shadow-[0_8px_20px_rgba(127,168,148,0.45)]">
                  {glyph}
                </span>
                <span className="text-[10px] font-medium text-[#7FA894]">{label}</span>
              </button>
            );
          }
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-1 px-2 ${active ? "text-[#7FA894]" : "text-[#6B6560]"}`}
            >
              {glyph}
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function RenameRoom({
  name,
  onSave,
}: {
  name: string;
  onSave: (name: string) => Promise<void>;
}) {
  const [value, setValue] = useState(name);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(value);
      }}
    >
      <Field label="Nama ruang" value={value} onChange={(e) => setValue(e.target.value)} />
      <Button tone="ghost" type="submit">
        Simpan nama
      </Button>
    </form>
  );
}

function History({
  expenses,
  members,
  range,
  setRange,
  all,
  userId,
  onSave,
}: {
  expenses: Expense[];
  all: Expense[];
  members: Member[];
  range: { from: string; to: string };
  setRange: (r: { from: string; to: string }) => void;
  userId: string;
  onSave: (id: string, patch: Partial<Expense>) => Promise<void>;
}) {
  const [category, setCategory] = useState<CategoryId | "">("");
  const [tag, setTag] = useState<NeedTag | "">("");
  const name = (id: string) =>
    members.find((m) => m.user_id === id)?.display_name ?? "Anggota";
  const rows = expenses.filter((e) => {
    if (category && e.category !== category) return false;
    if (tag && e.tag !== tag) return false;
    return true;
  });
  const byCat = Object.fromEntries(
    CATEGORIES.map((c) => [
      c.id,
      rows.filter((e) => e.category === c.id).reduce((s, e) => s + e.amount_idr, 0),
    ]),
  );
  const byTag = {
    primer: rows.filter((e) => e.tag === "primer").reduce((s, e) => s + e.amount_idr, 0),
    sekunder: rows.filter((e) => e.tag === "sekunder").reduce((s, e) => s + e.amount_idr, 0),
  };
  const byPerson: Record<string, number> = {};
  for (const e of rows) {
    byPerson[e.created_by] = (byPerson[e.created_by] ?? 0) + e.amount_idr;
  }

  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Dari"
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
          />
          <Field
            label="Sampai"
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <select
            className="min-h-11 flex-1 rounded-2xl bg-[#F8F4EF] px-3"
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId | "")}
          >
            <option value="">Semua kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            className="min-h-11 flex-1 rounded-2xl bg-[#F8F4EF] px-3"
            value={tag}
            onChange={(e) => setTag(e.target.value as NeedTag | "")}
          >
            <option value="">Semua tag</option>
            <option value="primer">Primer</option>
            <option value="sekunder">Sekunder</option>
          </select>
        </div>
        <p className="mt-3 text-2xl font-semibold">
          {formatIdr(rows.reduce((s, e) => s + e.amount_idr, 0))}
        </p>
        <ul className="mt-2 space-y-1 text-sm text-[#6B6560]">
          {CATEGORIES.map((c) =>
            byCat[c.id] ? (
              <li key={c.id}>
                {c.label}: {formatIdr(byCat[c.id] as number)}
              </li>
            ) : null,
          )}
          <li>Primer: {formatIdr(byTag.primer)}</li>
          <li>Sekunder: {formatIdr(byTag.sekunder)}</li>
          {Object.entries(byPerson).map(([id, n]) => (
            <li key={id}>
              {name(id)}: {formatIdr(n)}
            </li>
          ))}
        </ul>
      </Card>
      <ul className="space-y-2">
        {rows.map((e) => (
          <li key={e.id}>
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <CategoryIcon category={e.category} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {e.store || categoryLabel(e.category)}
                  </p>
                  <p className="truncate text-xs text-[#6B6560]">
                    {categoryLabel(e.category)} · {e.tag} · {name(e.created_by)}
                  </p>
                </div>
                <p className="text-right font-semibold">{formatIdr(e.amount_idr)}</p>
              </div>
              {e.created_by === userId ? (
                <EditExpense expense={e} onSave={onSave} />
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
      {all.length === 0 ? (
        <p className="text-center text-[#6B6560]">Belum ada pengeluaran.</p>
      ) : null}
    </>
  );
}

function EditExpense({
  expense,
  onSave,
}: {
  expense: Expense;
  onSave: (id: string, patch: Partial<Expense>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(expense.amount_idr));
  const [date, setDate] = useState(expense.spent_on);
  const [store, setStore] = useState(expense.store ?? "");
  const [note, setNote] = useState(expense.note ?? "");
  const [category, setCategory] = useState(expense.category);
  const [tag, setTag] = useState(expense.tag);
  if (!open) {
    return (
      <button className="mt-3 text-sm text-[#7FA894]" onClick={() => setOpen(true)}>
        Sunting
      </button>
    );
  }
  return (
    <form
      className="mt-3 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(expense.id, {
          amount_idr: Number(amount),
          spent_on: date,
          store,
          note,
          category,
          tag,
        });
        setOpen(false);
      }}
    >
      <Field label="Jumlah" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Field label="Tanggal" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Field label="Toko" value={store} onChange={(e) => setStore(e.target.value)} />
      <select
        className="min-h-11 rounded-2xl bg-[#F8F4EF] px-3"
        value={category}
        onChange={(e) => {
          const next = e.target.value as CategoryId;
          setCategory(next);
          const d = defaultTagFor(next);
          if (d) setTag(d);
        }}
      >
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        className="min-h-11 rounded-2xl bg-[#F8F4EF] px-3"
        value={tag}
        onChange={(e) => setTag(e.target.value as NeedTag)}
      >
        <option value="primer">Primer</option>
        <option value="sekunder">Sekunder</option>
      </select>
      <Field label="Catatan" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button type="submit">Simpan</Button>
    </form>
  );
}

function ExpenseForm({
  userId,
  roomId,
  demo,
  onSaved,
  onError,
}: {
  userId: string;
  roomId: string;
  demo: boolean;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const supabase = useMemo(
    () => (demo ? createDemoClient() : createClient()),
    [demo],
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(wibTodayIso());
  const [store, setStore] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<CategoryId>("makan");
  const [tag, setTag] = useState<NeedTag>("primer");
  const [scanning, setScanning] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!defaultTagFor(category) && !tag) {
      onError("Pilih tag primer atau sekunder");
      return;
    }
    const payload = {
      room_id: roomId,
      created_by: userId,
      amount_idr: Number(amount),
      spent_on: date,
      store,
      note,
      category,
      tag,
    };
    if (!navigator.onLine) {
      enqueue({ type: "expense", roomId, payload });
      onSaved();
      return;
    }
    const { data, error } = await supabase
      .from("expenses")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      onError(error.message);
      return;
    }
    if (receiptFile && data?.id) {
      const path = `${roomId}/${data.id}`;
      await supabase.storage.from("receipts").upload(path, receiptFile, {
        upsert: true,
        contentType: receiptFile.type,
      });
      await supabase
        .from("expenses")
        .update({ receipt_path: path })
        .eq("id", data.id)
        .eq("created_by", userId);
    }
    onSaved();
  }

  async function onFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      onError("Foto maksimal 5 MB");
      return;
    }
    setReceiptFile(file);
    setScanning(true);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const { data } = await Tesseract.recognize(file, "ind+eng");
      const parsed = parseReceiptText(data.text);
      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.date) setDate(parsed.date);
      if (parsed.store) setStore(parsed.store);
    } catch {
      onError("Struk tidak terbaca. Isi manual, lalu konfirmasi.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-center gap-3 rounded-[28px] bg-[#FFFBF8] p-4 shadow-[0_8px_24px_rgba(47,44,42,0.05)]">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#F3D6D6]">
          <CameraGlyph />
        </span>
        <div>
          <p className="font-medium">Scan struk</p>
          <p className="text-xs text-[#6B6560]">
            {scanning ? "Membaca di perangkat…" : "Foto dulu, konfirmasi sebelum simpan"}
          </p>
        </div>
        <input
          className="hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
      </label>
      <Field
        label="Jumlah (IDR)"
        type="number"
        required
        min={1}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Field label="Tanggal" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      <Field label="Toko" value={store} onChange={(e) => setStore(e.target.value)} />
      <div>
        <p className="mb-2 text-sm text-[#6B6560]">Kategori</p>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategory(c.id);
                const d = defaultTagFor(c.id);
                if (d) setTag(d);
              }}
              className={`flex flex-col items-center gap-1 rounded-2xl py-2 ${category === c.id ? "ring-2 ring-[#7FA894]" : "bg-[#FFFBF8]"}`}
            >
              <CategoryIcon category={c.id} size={40} />
              <span className="text-[10px]">{c.label}</span>
            </button>
          ))}
        </div>
      </div>
      <label className="text-sm text-[#6B6560]">
        Tag
        <select
          required
          className="mt-1 min-h-12 w-full rounded-2xl bg-[#FFFBF8] px-4"
          value={tag}
          onChange={(e) => setTag(e.target.value as NeedTag)}
        >
          <option value="primer">Primer</option>
          <option value="sekunder">Sekunder</option>
        </select>
      </label>
      <Field label="Catatan" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button type="submit">Simpan</Button>
    </form>
  );
}

function SavingsPanel({
  userId,
  roomId,
  balance,
  movements,
  members,
  target,
  advice,
  today,
  demo,
  onChange,
  onError,
}: {
  userId: string;
  roomId: string;
  demo: boolean;
  balance: number;
  movements: Movement[];
  members: Member[];
  target: Target | null;
  advice: ReturnType<typeof savingsAdvice> | null;
  today: string;
  onChange: () => void;
  onError: (m: string) => void;
}) {
  const supabase = useMemo(
    () => (demo ? createDemoClient() : createClient()),
    [demo],
  );
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"setor" | "tarik">("setor");
  const [note, setNote] = useState("");
  const [targetAmount, setTargetAmount] = useState(String(target?.amount_idr ?? ""));
  const [deadline, setDeadline] = useState(target?.deadline ?? endOfMonthIso(today));
  const name = (id: string) =>
    members.find((m) => m.user_id === id)?.display_name ?? "Anggota";

  async function move(e: FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (kind === "tarik" && !canWithdraw(balance, n)) {
      onError("Saldo tidak cukup");
      return;
    }
    const payload = {
      room_id: roomId,
      created_by: userId,
      kind,
      amount_idr: n,
      moved_on: today,
      note,
    };
    if (!navigator.onLine) {
      enqueue({ type: "savings", roomId, payload });
      onChange();
      return;
    }
    const { error } = await supabase.from("savings_movements").insert(payload);
    if (error) onError(error.message);
    else {
      setAmount("");
      onChange();
    }
  }

  async function saveTarget(e: FormEvent) {
    e.preventDefault();
    const row = {
      room_id: roomId,
      amount_idr: Number(targetAmount),
      deadline,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("savings_targets").upsert(row);
    if (error) onError(error.message);
    else onChange();
  }

  return (
    <>
      <Card>
        <p className="text-sm text-[#6B6560]">Saldo</p>
        <p className="text-4xl font-semibold">{formatIdr(balance)}</p>
        {advice && target ? (
          <div className="mt-3 space-y-1 text-sm text-[#6B6560]">
            <p>
              Target {formatIdr(target.amount_idr)} sebelum {target.deadline}
            </p>
            <p>
              {advice.status === "depan"
                ? `Di depan ${formatIdr(advice.gapFromIdealIdr)}`
                : advice.status === "tertinggal"
                  ? `Tertinggal ${formatIdr(-advice.gapFromIdealIdr)}`
                  : "Sesuai jalur"}
            </p>
            {!advice.achieved && !advice.overdue ? (
              <>
                <p>Per hari {formatIdr(advice.perDayIdr)}</p>
                <p>Per minggu {formatIdr(advice.perWeekIdr)}</p>
                <p>Per orang per hari {formatIdr(advice.perPersonPerDayIdr)}</p>
              </>
            ) : null}
          </div>
        ) : null}
      </Card>
      <form onSubmit={move} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Button
            type="button"
            tone={kind === "setor" ? "primary" : "ghost"}
            onClick={() => setKind("setor")}
          >
            Setor
          </Button>
          <Button
            type="button"
            tone={kind === "tarik" ? "rose" : "ghost"}
            onClick={() => setKind("tarik")}
          >
            Tarik
          </Button>
        </div>
        <Field
          label="Jumlah"
          type="number"
          required
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Field label="Catatan" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button type="submit">Catat {kind}</Button>
      </form>
      <form onSubmit={saveTarget} className="flex flex-col gap-3">
        <p className="font-medium">Target aktif (satu per ruang)</p>
        <Field
          label="Jumlah target"
          type="number"
          required
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
        />
        <Field
          label="Tenggat"
          type="date"
          required
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <Button tone="ghost" type="button" onClick={() => setDeadline(endOfMonthIso(today))}>
          Akhir bulan ini
        </Button>
        <Button type="submit">Simpan target</Button>
      </form>
      <ul className="space-y-2">
        {movements.map((m) => (
          <li key={m.id} className="rounded-2xl bg-[#FFFBF8] px-4 py-3 text-sm">
            <span className={m.kind === "setor" ? "text-[#7FA894]" : "text-[#D4A5A5]"}>
              {m.kind}
            </span>{" "}
            {formatIdr(m.amount_idr)} · {m.moved_on} · {name(m.created_by)}
            {m.note ? ` · ${m.note}` : ""}
          </li>
        ))}
      </ul>
    </>
  );
}
