import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DEMO_COOKIE, DEMO_USER_ID, demoRooms } from "@/lib/demo";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const jar = await cookies();
  if (jar.get(DEMO_COOKIE)?.value === "1") {
    return (
      <AppShell userId={DEMO_USER_ID} initialRooms={demoRooms()} demo />
    );
  }

  const supabase = await createServerSupabase();
  if (!supabase) redirect("/masuk");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: memberships } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", user.id);

  const ids = (memberships ?? []).map((row) => row.room_id);
  const { data: rooms } =
    ids.length > 0
      ? await supabase.from("rooms").select("id, name, owner_id").in("id", ids)
      : { data: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("last_room_id")
    .eq("id", user.id)
    .maybeSingle();

  const ordered = [...(rooms ?? [])].sort((a, b) => {
    if (a.id === profile?.last_room_id) return -1;
    if (b.id === profile?.last_room_id) return 1;
    return 0;
  });

  return <AppShell userId={user.id} initialRooms={ordered} />;
}
