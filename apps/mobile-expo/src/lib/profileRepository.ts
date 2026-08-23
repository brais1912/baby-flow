import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { BabyProfile } from "../types/profile";
import { validateBabyProfile } from "./profile";

type Client = SupabaseClient<Database>;

export async function fetchBabyProfile(
  client: Client,
  userId: string
): Promise<BabyProfile | null> {
  const { data, error } = await client
    .from("user_settings")
    .select("baby_name,baby_date_of_birth")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.baby_name || !data.baby_date_of_birth) return null;
  return { name: data.baby_name, dateOfBirth: data.baby_date_of_birth };
}

export async function upsertBabyProfile(
  client: Client,
  userId: string,
  profile: BabyProfile
): Promise<BabyProfile> {
  if (Object.keys(validateBabyProfile(profile)).length > 0) {
    throw new Error("INVALID_BABY_PROFILE");
  }
  const { data, error } = await client
    .from("user_settings")
    .upsert({
      user_id: userId,
      baby_name: profile.name.trim(),
      baby_date_of_birth: profile.dateOfBirth,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select("baby_name,baby_date_of_birth")
    .single();

  if (error) throw error;
  if (!data.baby_name || !data.baby_date_of_birth) throw new Error("INCOMPLETE_BABY_PROFILE");
  return { name: data.baby_name, dateOfBirth: data.baby_date_of_birth };
}
