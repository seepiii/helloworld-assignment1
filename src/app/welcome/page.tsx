import { redirect } from "next/navigation";
import Panel, { buttonClass, inputClass } from "@/components/Panel";
import { needsName } from "@/lib/supabase";
import { getUserAndProfile } from "@/lib/supabase-server";
import { saveName } from "@/app/actions";

export default async function WelcomePage({
  searchParams,
}: PageProps<"/welcome">) {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (!needsName(profile)) redirect("/mission-control");

  const { error } = await searchParams;
  // Google usually knows the user's name; offer it as a starting point.
  const meta = user.user_metadata ?? {};

  return (
    <Panel title="Welcome aboard" subtitle="what should we call you?">
      {error && (
        <p className="w-full rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error === "missing"
            ? "Please enter both your first and last name."
            : String(error)}
        </p>
      )}
      <form action={saveName} className="flex w-full flex-col gap-4">
        <input
          name="first_name"
          placeholder="First name"
          defaultValue={profile?.first_name ?? meta.given_name ?? ""}
          required
          className={inputClass}
        />
        <input
          name="last_name"
          placeholder="Last name"
          defaultValue={profile?.last_name ?? meta.family_name ?? ""}
          required
          className={inputClass}
        />
        <button type="submit" className={buttonClass}>
          Continue
        </button>
      </form>
    </Panel>
  );
}
