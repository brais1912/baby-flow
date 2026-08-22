import { useCallback, useEffect, useState } from "react";
import type { BabyProfile } from "../types/profile";
import { fetchBabyProfile, upsertBabyProfile } from "../lib/profileRepository";
import { supabase } from "../lib/supabase";

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setProfile(await fetchBabyProfile(supabase, userId));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    void fetchBabyProfile(supabase, userId)
      .then((loadedProfile) => {
        if (!active) return;
        setProfile(loadedProfile);
        setLoadError(false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const save = useCallback(async (next: BabyProfile) => {
    setSaving(true);
    setSaveError(false);
    try {
      const saved = await upsertBabyProfile(supabase, userId, next);
      setProfile(saved);
      return saved;
    } catch (saveError) {
      setSaveError(true);
      throw saveError;
    } finally {
      setSaving(false);
    }
  }, [userId]);

  return { profile, loading, saving, loadError, saveError, reload, save };
}
