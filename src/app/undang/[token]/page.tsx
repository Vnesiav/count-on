import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UndangPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createServerSupabase();
  if (!supabase) redirect("/masuk");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/masuk`);

  const { data: memberships } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", user.id);
  const ids = (memberships ?? []).map((row) => row.room_id);
  const { data: rooms } =
    ids.length > 0
      ? await supabase.from("rooms").select("id, name, owner_id").in("id", ids)
      : { data: [] };

  return (
    <AppShell
      userId={user.id}
      initialRooms={rooms ?? []}
      inviteToken={token}
    />
  );
}
