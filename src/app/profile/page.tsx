import Link from "next/link";
import { redirect } from "next/navigation";
import Panel from "@/components/Panel";
import { getUserAndProfile } from "@/lib/supabase-server";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");

  return (
    <Panel title="Profile" subtitle={user.email ?? undefined}>
      <ProfileForm
        userId={user.id}
        firstName={profile?.first_name ?? ""}
        lastName={profile?.last_name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <Link
        href="/mission-control"
        className="text-xs tracking-[0.2em] text-white/30 uppercase transition hover:text-white/60"
      >
        &larr; mission control
      </Link>
    </Panel>
  );
}
