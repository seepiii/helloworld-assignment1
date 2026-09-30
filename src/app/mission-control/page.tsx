import Link from "next/link";
import { redirect } from "next/navigation";
import Panel from "@/components/Panel";
import { needsName } from "@/lib/supabase";
import { getUserAndProfile } from "@/lib/supabase-server";

// Members-only page. The proxy already bounces signed-out visitors to /login;
// this check is the authoritative one.
export default async function MissionControlPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (needsName(profile)) redirect("/welcome");

  return (
    <Panel title="Mission Control" subtitle="crew only">
      {profile?.avatar_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt=""
          className="h-24 w-24 rounded-full border border-[#e9c46a]/40 object-cover"
        />
      )}
      <p className="text-lg text-white/80">
        Welcome back, commander{" "}
        <span className="font-bold text-white">{profile?.first_name}</span>.
      </p>
      <p className="text-sm text-white/50">
        All systems nominal. You&apos;re cleared to explore the solar system.
      </p>
      <div className="flex gap-6 text-xs tracking-[0.2em] uppercase">
        <Link href="/planets" className="text-white/40 transition hover:text-white/70">
          the planets &rarr;
        </Link>
        <Link href="/profile" className="text-white/40 transition hover:text-white/70">
          edit profile &rarr;
        </Link>
      </div>
    </Panel>
  );
}
