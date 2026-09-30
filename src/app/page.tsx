import { getUserAndProfile } from "@/lib/supabase-server";
import HelloWorld from "./HelloWorld";

export default async function Home() {
  const { user, profile } = await getUserAndProfile();
  return (
    <HelloWorld signedIn={!!user} firstName={profile?.first_name ?? null} />
  );
}
