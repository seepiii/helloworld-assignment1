import { redirect } from "next/navigation";
import Panel from "@/components/Panel";
import GoogleButton from "./GoogleButton";
import { createSupabaseServer } from "@/lib/supabase-server";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/mission-control");

  const { error } = await searchParams;

  return (
    <Panel title="Crew sign in" subtitle="board the ship">
      <p className="text-sm leading-relaxed text-white/70">
        Sign in with Google to unlock{" "}
        <span className="font-bold text-[#f4dfa6]">Mission Control</span> and
        your crew profile.
      </p>
      {error && (
        <p className="w-full rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          Sign-in didn&apos;t complete. Please try again.
        </p>
      )}
      <GoogleButton />
    </Panel>
  );
}
