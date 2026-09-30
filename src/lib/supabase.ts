import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Planet = {
  id: number;
  name: string;
  description: string;
  distance_from_sun: string;
  gravity_vs_earth: number;
};

export type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at?: string;
};

export function needsName(profile: Profile | null) {
  return !profile?.first_name?.trim() || !profile?.last_name?.trim();
}
