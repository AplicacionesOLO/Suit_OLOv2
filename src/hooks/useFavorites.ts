import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  reorderFavorites,
  getFavoriteIds,
  type FavoriteWithDetails,
} from '@/services/security/favoritesService';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteWithDetails[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const loadedRef = useRef(false);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [favResult, idsSet] = await Promise.all([
        getFavorites(),
        getFavoriteIds(),
      ]);
      if (favResult.error) throw new Error(favResult.error);
      setFavorites(favResult.data);
      setFavoriteIds(idsSet);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      loadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) {
      loadFavorites();
    }
  }, [loadFavorites]);

  const toggleFavorite = useCallback(async (appId: string) => {
    const isCurrentlyFav = favoriteIds.has(appId);
    setTogglingIds((prev) => new Set(prev).add(appId));

    if (isCurrentlyFav) {
      // Optimistic remove
      const favToRemove = favorites.find((f) => f.app_id === appId);
      const newIds = new Set(favoriteIds);
      newIds.delete(appId);
      setFavoriteIds(newIds);
      if (favToRemove) {
        setFavorites((prev) => prev.filter((f) => f.app_id !== appId));
      }

      if (favToRemove) {
        const result = await removeFavorite(favToRemove.id);
        if (result.error) {
          // Rollback
          setFavoriteIds((prev) => new Set(prev).add(appId));
          setFavorites((prev) => [...prev, favToRemove]);
          setError(result.error);
        }
      }
    } else {
      // Optimistic add — we don't have full details yet, so just update IDs
      const newIds = new Set(favoriteIds);
      newIds.add(appId);
      setFavoriteIds(newIds);

      const result = await addFavorite(appId);
      if (result.error) {
        // Rollback
        const rolledBack = new Set(favoriteIds);
        rolledBack.delete(appId);
        setFavoriteIds(rolledBack);
        setError(result.error);
      } else {
        // Reload to get full details
        await loadFavorites();
      }
    }

    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(appId);
      return next;
    });
  }, [favoriteIds, favorites, loadFavorites]);

  const handleReorder = useCallback(async (newOrder: FavoriteWithDetails[]) => {
    // Optimistic update
    setFavorites(newOrder);

    const items = newOrder.map((f, idx) => ({ id: f.id, position: idx }));
    const result = await reorderFavorites(items);
    if (result.error) {
      setError(result.error);
      // Reload to get correct order
      await loadFavorites();
    }
  }, [loadFavorites]);

  const isAppFavorite = useCallback((appId: string) => {
    return favoriteIds.has(appId);
  }, [favoriteIds]);

  return {
    favorites,
    favoriteIds,
    loading,
    error,
    togglingIds,
    reload: loadFavorites,
    toggleFavorite,
    handleReorder,
    isAppFavorite,
  };
}