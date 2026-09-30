import Link from "next/link";
import { getUserAndProfile } from "@/lib/supabase-server";
import { signOut } from "@/app/actions";

const linkClass =
  "text-xs tracking-[0.2em] text-white/40 uppercase transition hover:text-white/80";

// Shows different controls depending on whether someone is signed in.
export default async function AuthNav() {
  const { user, profile } = await getUserAndProfile();

  return (
    <nav className="absolute top-0 right-0 z-50 flex items-center gap-5 px-6 py-5">
      {user ? (
        <>
          <Link href="/mission-control" className={linkClass}>
            mission control
          </Link>
          <Link href="/profile" className={`${linkClass} flex items-center gap-2`}>
            {profile?.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            )}
            {profile?.first_name || "profile"}
          </Link>
          <form action={signOut}>
            <button type="submit" className={linkClass}>
              sign out
            </button>
          </form>
        </>
      ) : (
        <Link
          href="/login"
          className="cta-glow rounded-full border border-[#e9c46a]/70 bg-[#e9c46a]/15 px-5 py-2 text-xs font-bold tracking-[0.2em] text-[#f4dfa6] uppercase transition hover:bg-[#e9c46a]/25 hover:text-white"
        >
          sign in
        </Link>
      )}
    </nav>
  );
}
