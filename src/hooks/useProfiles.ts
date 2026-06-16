import { useState, useEffect, useCallback } from 'react';
import { fetchProfilesWithDetails, createProfile, updateProfile, copyProfile, type Profile, type ProfileWithDetails } from '@/services/security/profilesService';

export function useProfiles() {
  const [profiles, setProfiles] = useState<ProfileWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProfilesWithDetails();
      if (result.error) throw result.error;
      setProfiles(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addProfile = useCallback(async (profile: Partial<Profile>) => {
    const result = await createProfile(profile);
    if (result.error) return { error: result.error.message };
    await load();
    return { error: null };
  }, [load]);

  const editProfile = useCallback(async (id: string, updates: Partial<Profile>) => {
    const result = await updateProfile(id, updates);
    if (result.error) return { error: result.error.message };
    await load();
    return { error: null };
  }, [load]);

  const duplicateProfile = useCallback(async (id: string, newName: string, newCode: string) => {
    const result = await copyProfile(id, newName, newCode);
    if (result.error) return { error: result.error.message };
    await load();
    return { error: null };
  }, [load]);

  return { profiles, loading, error, reload: load, addProfile, editProfile, duplicateProfile };
}