-- Count On schema. Run in the Supabase SQL editor after creating a project.
-- Enable storage bucket `receipts` (private).

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  last_room_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_last_room_id_fkey;
alter table public.profiles
  add constraint profiles_last_room_id_fkey
  foreign key (last_room_id) references public.rooms (id) on delete set null;

create table if not exists public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid not null references public.profiles (id)
);

do $$ begin
  create type public.expense_category as enum (
    'makan', 'transport', 'rumah', 'kesehatan', 'hiburan', 'belanja', 'lainnya'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.need_tag as enum ('primer', 'sekunder');
exception when duplicate_object then null; end $$;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  amount_idr integer not null check (amount_idr > 0),
  spent_on date not null,
  store text,
  note text,
  category public.expense_category not null,
  tag public.need_tag not null,
  receipt_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_movements (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  kind text not null check (kind in ('setor', 'tarik')),
  amount_idr integer not null check (amount_idr > 0),
  moved_on date not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.savings_targets (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  amount_idr integer not null check (amount_idr > 0),
  deadline date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_member(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room and user_id = auth.uid()
  );
$$;

create or replace function public.enforce_room_size()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.room_members where room_id = new.room_id) >= 3 then
    raise exception 'Ruang sudah penuh (maksimal 3 orang)';
  end if;
  return new;
end;
$$;

drop trigger if exists room_size_guard on public.room_members;
create trigger room_size_guard
before insert on public.room_members
for each row execute function public.enforce_room_size();

create or replace function public.prevent_owner_leave()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.rooms where id = old.room_id and owner_id = old.user_id) then
    raise exception 'Pemilik tidak bisa keluar dari ruang';
  end if;
  return old;
end;
$$;

drop trigger if exists owner_leave_guard on public.room_members;
create trigger owner_leave_guard
before delete on public.room_members
for each row execute function public.prevent_owner_leave();

create or replace function public.savings_balance(p_room uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(
    case when kind = 'setor' then amount_idr else -amount_idr end
  ), 0)
  from public.savings_movements
  where room_id = p_room;
$$;

create or replace function public.enforce_withdraw()
returns trigger
language plpgsql
as $$
declare bal integer;
begin
  if new.kind = 'tarik' then
    bal := public.savings_balance(new.room_id);
    if new.amount_idr > bal then
      raise exception 'Saldo tidak cukup';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists withdraw_guard on public.savings_movements;
create trigger withdraw_guard
before insert on public.savings_movements
for each row execute function public.enforce_withdraw();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.invites enable row level security;
alter table public.expenses enable row level security;
alter table public.savings_movements enable row level security;
alter table public.savings_targets enable row level security;

create policy "see fellow members" on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1
      from public.room_members me
      join public.room_members them on me.room_id = them.room_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );
create policy "update own profile" on public.profiles
  for update using (id = auth.uid());

create policy "see rooms as member" on public.rooms
  for select using (public.is_member(id) or owner_id = auth.uid());
create policy "owner insert room" on public.rooms
  for insert with check (owner_id = auth.uid());
create policy "owner rename" on public.rooms
  for update using (owner_id = auth.uid());

create policy "see members" on public.room_members
  for select using (public.is_member(room_id));
create policy "join self" on public.room_members
  for insert with check (user_id = auth.uid());
create policy "leave self" on public.room_members
  for delete using (user_id = auth.uid());

create policy "owner sees invites" on public.invites
  for select using (
    exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())
  );
create policy "owner creates invites" on public.invites
  for insert with check (
    created_by = auth.uid()
    and exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())
  );
create policy "owner updates invites" on public.invites
  for update using (
    exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())
  );

create policy "members read expenses" on public.expenses
  for select using (public.is_member(room_id));
create policy "members insert expenses" on public.expenses
  for insert with check (public.is_member(room_id) and created_by = auth.uid());
create policy "author update expenses" on public.expenses
  for update using (created_by = auth.uid());
create policy "author delete expenses" on public.expenses
  for delete using (created_by = auth.uid());

create policy "members read savings" on public.savings_movements
  for select using (public.is_member(room_id));
create policy "members insert savings" on public.savings_movements
  for insert with check (public.is_member(room_id) and created_by = auth.uid());
create policy "author update savings" on public.savings_movements
  for update using (created_by = auth.uid());

create policy "members read targets" on public.savings_targets
  for select using (public.is_member(room_id));
create policy "members write targets" on public.savings_targets
  for insert with check (public.is_member(room_id));
create policy "members update targets" on public.savings_targets
  for update using (public.is_member(room_id));

-- Invites are accepted through this function so the token never needs a public read policy.
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk';
  end if;

  select * into inv from public.invites where token = p_token for update;
  if not found then
    raise exception 'Undangan tidak valid';
  end if;
  if inv.used_at is not null then
    raise exception 'Undangan sudah dipakai';
  end if;
  if inv.expires_at < now() then
    raise exception 'Undangan kedaluwarsa';
  end if;
  if exists (select 1 from public.room_members where room_id = inv.room_id and user_id = auth.uid()) then
    raise exception 'Kamu sudah anggota ruang ini';
  end if;

  insert into public.room_members (room_id, user_id) values (inv.room_id, auth.uid());
  update public.invites set used_at = now() where id = inv.id;
  update public.profiles set last_room_id = inv.room_id where id = auth.uid();
  return inv.room_id;
end;
$$;

create or replace function public.create_room(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare rid uuid;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk';
  end if;
  insert into public.rooms (name, owner_id) values (p_name, auth.uid()) returning id into rid;
  insert into public.room_members (room_id, user_id) values (rid, auth.uid());
  update public.profiles set last_room_id = rid where id = auth.uid();
  return rid;
end;
$$;

create or replace function public.kick_member(p_room uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.rooms where id = p_room and owner_id = auth.uid()) then
    raise exception 'Hanya pemilik yang bisa mengeluarkan anggota';
  end if;
  if p_user = auth.uid() then
    raise exception 'Pemilik tidak bisa dikeluarkan';
  end if;
  delete from public.room_members where room_id = p_room and user_id = p_user;
end;
$$;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "members read receipts"
on storage.objects for select
using (
  bucket_id = 'receipts'
  and public.is_member((split_part(name, '/', 1))::uuid)
);

create policy "authors upload receipts"
on storage.objects for insert
with check (
  bucket_id = 'receipts'
  and public.is_member((split_part(name, '/', 1))::uuid)
);

grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.create_room(text) to authenticated;
grant execute on function public.kick_member(uuid, uuid) to authenticated;
grant execute on function public.savings_balance(uuid) to authenticated;
