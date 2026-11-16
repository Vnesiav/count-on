import { calendarMonthRange, endOfMonthIso, wibTodayIso } from "@/lib/domain/dates";

export const DEMO_EMAIL = "demo@counton.app";
export const DEMO_PASSWORD = "counton12";
export const DEMO_USER_ID = "demo-user";
export const DEMO_PARTNER_ID = "demo-partner";
export const DEMO_ROOM_ID = "demo-rumah";
export const DEMO_COOKIE = "count-on-demo";

const STORE_KEY = "count-on-demo-db";

type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;

function monthDates() {
  const today = wibTodayIso();
  const { from } = calendarMonthRange(today);
  return { today, from, deadline: endOfMonthIso(today) };
}

function seed(): Db {
  const { today, from, deadline } = monthDates();
  return {
    profiles: [
      { id: DEMO_USER_ID, display_name: "Demo", last_room_id: DEMO_ROOM_ID },
      { id: DEMO_PARTNER_ID, display_name: "Ayu", last_room_id: DEMO_ROOM_ID },
    ],
    rooms: [{ id: DEMO_ROOM_ID, name: "Rumah", owner_id: DEMO_USER_ID, created_at: from }],
    room_members: [
      { room_id: DEMO_ROOM_ID, user_id: DEMO_USER_ID },
      { room_id: DEMO_ROOM_ID, user_id: DEMO_PARTNER_ID },
    ],
    expenses: [
      {
        id: "e1",
        room_id: DEMO_ROOM_ID,
        created_by: DEMO_USER_ID,
        amount_idr: 45000,
        spent_on: today,
        store: "Warung Sederhana",
        note: "Makan siang",
        category: "makan",
        tag: "primer",
      },
      {
        id: "e2",
        room_id: DEMO_ROOM_ID,
        created_by: DEMO_PARTNER_ID,
        amount_idr: 22000,
        spent_on: from,
        store: "Gojek",
        note: null,
        category: "transport",
        tag: "primer",
      },
    ],
    savings_movements: [
      {
        id: "s1",
        room_id: DEMO_ROOM_ID,
        created_by: DEMO_USER_ID,
        kind: "setor",
        amount_idr: 1_200_000,
        moved_on: from,
        note: "Setoran awal",
      },
    ],
    savings_targets: [
      {
        room_id: DEMO_ROOM_ID,
        amount_idr: 3_000_000,
        deadline,
        created_at: `${from}T00:00:00.000Z`,
        updated_at: `${from}T00:00:00.000Z`,
      },
    ],
    invites: [],
  };
}

function load(): Db {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* ignore */
  }
  const db = seed();
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
  return db;
}

function save(db: Db) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
}

function match(row: Row, filters: [string, unknown][]) {
  return filters.every(([k, v]) => {
    if (Array.isArray(v)) return v.includes(row[k]);
    return row[k] === v;
  });
}

function newId() {
  return crypto.randomUUID();
}

class Query {
  private filters: [string, unknown][] = [];
  private mode: "list" | "maybe" | "single" = "list";
  private patch: Row | null = null;
  private inserting: Row[] | null = null;
  private deleting = false;

  constructor(private table: string) {}

  select() {
    return this;
  }

  eq(key: string, value: unknown) {
    this.filters.push([key, value]);
    return this;
  }

  in(key: string, values: unknown[]) {
    this.filters.push([key, values]);
    return this;
  }

  order() {
    return this;
  }

  maybeSingle() {
    this.mode = "maybe";
    return this;
  }

  single() {
    this.mode = "single";
    return this;
  }

  insert(payload: Row | Row[]) {
    this.inserting = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  update(patch: Row) {
    this.patch = patch;
    return this;
  }

  upsert(row: Row) {
    const db = load();
    const rows = db[this.table] ?? [];
    const key = "room_id";
    const idx = rows.findIndex((r) => r[key] === row[key]);
    if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
    else rows.push(row);
    db[this.table] = rows;
    save(db);
    return Promise.resolve({ data: row, error: null });
  }

  delete() {
    this.deleting = true;
    return this;
  }

  then<T>(
    resolve: (value: { data: unknown; error: null }) => T,
    reject?: (reason: unknown) => T,
  ) {
    return Promise.resolve(this.exec()).then(resolve, reject);
  }

  private exec() {
    const db = load();
    const rows = db[this.table] ?? [];

    if (this.inserting) {
      const created = this.inserting.map((row) => ({
        id: (row.id as string) ?? newId(),
        ...row,
      }));
      db[this.table] = [...rows, ...created];
      save(db);
      const data = this.mode === "list" ? created : created[0];
      return { data, error: null };
    }

    const found = rows.filter((row) => match(row, this.filters));

    if (this.patch) {
      for (const row of found) {
        Object.assign(row, this.patch);
      }
      save(db);
      return { data: found, error: null };
    }

    if (this.deleting) {
      db[this.table] = rows.filter((row) => !match(row, this.filters));
      save(db);
      return { data: null, error: null };
    }

    if (this.mode === "maybe") {
      return { data: found[0] ?? null, error: null };
    }
    if (this.mode === "single") {
      return { data: found[0] ?? null, error: null };
    }
    return { data: found, error: null };
  }
}

export function demoRooms() {
  return [
    { id: DEMO_ROOM_ID, name: "Rumah", owner_id: DEMO_USER_ID },
  ];
}

export function setDemoCookie() {
  document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}`;
}

export function clearDemoCookie() {
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`;
}

export function createDemoClient() {
  load();
  return {
    from(table: string) {
      return new Query(table);
    },
    async rpc(name: string, args: Record<string, string>) {
      const db = load();
      if (name === "create_room") {
        const id = newId();
        db.rooms.push({
          id,
          name: args.p_name,
          owner_id: DEMO_USER_ID,
        });
        db.room_members.push({ room_id: id, user_id: DEMO_USER_ID });
        save(db);
        return { data: id, error: null };
      }
      if (name === "kick_member") {
        db.room_members = db.room_members.filter(
          (r) =>
            !(r.room_id === args.p_room && r.user_id === args.p_user),
        );
        save(db);
        return { data: null, error: null };
      }
      if (name === "accept_invite") {
        return { data: null, error: { message: "Mode demo: undangan tidak aktif" } };
      }
      return { data: null, error: { message: `RPC ${name} tidak ada di demo` } };
    },
    auth: {
      async signOut() {
        clearDemoCookie();
      },
    },
    storage: {
      from() {
        return {
          async upload() {
            return { error: null };
          },
        };
      },
    },
  };
}

export function isDemoLogin(email: string, password: string) {
  return (
    email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD
  );
}
