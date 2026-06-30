import { supabase } from '@/services/supabase/client';

export interface UserFavorite {
  id: string;
  user_id: string;
  app_id: string;
  position: number;
  created_at: string;
}

export interface FavoriteWithDetails extends UserFavorite {
  application_name?: string;
  application_code?: string;
  application_icon?: string;
  application_color?: string;
  application_base_url?: string;
  instance_id?: string | null;
  instance_name?: string;
  instance_url?: string;
  instance_open_mode?: string;
  tenant_id?: string;
  tenant_name?: string;
  client_name?: string;
  country_name?: string;
  access_id?: string;
}

function getPlatformUserId(): Promise<string | null> {
  return supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return null;
    return supabase
      .from('platform_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => data?.id || null);
  });
}

export async function getFavorites(): Promise<{ data: FavoriteWithDetails[]; error: string | null }> {
  try {
    const userId = await getPlatformUserId();
    if (!userId) return { data: [], error: 'Usuario no autenticado' };

    const { data: favs, error: favError } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true });

    if (favError) throw favError;
    if (!favs || favs.length === 0) return { data: [], error: null };

    const appIds = [...new Set(favs.map((f) => f.app_id))];

    const { data: apps } = await supabase
      .from('applications')
      .select('id, name, code, icon, color, base_url, client_id, tenant_id')
      .in('id', appIds);

    const appMap: Record<string, any> = {};
    (apps || []).forEach((a) => { appMap[a.id] = a; });

    // Get user accesses for these apps to pick up instance and tenant info
    const { data: accesses } = await supabase
      .from('user_application_access')
      .select('id, application_id, instance_id, tenant_id, access_status')
      .eq('user_id', userId)
      .eq('access_status', 'assigned')
      .in('application_id', appIds);

    const accessByApp: Record<string, any> = {};
    (accesses || []).forEach((a) => {
      if (!accessByApp[a.application_id]) {
        accessByApp[a.application_id] = a;
      }
    });

    // Get instance details
    const instanceIds = [...new Set((accesses || []).map((a) => a.instance_id).filter(Boolean))] as string[];
    let instMap: Record<string, any> = {};
    if (instanceIds.length > 0) {
      const { data: instances } = await supabase
        .from('application_instances')
        .select('id, instance_name, url, open_mode, client_id')
        .in('id', instanceIds);
      (instances || []).forEach((i) => { instMap[i.id] = i; });
    }

    // Get tenant names
    const tenantIds = [...new Set((accesses || []).map((a) => a.tenant_id).filter(Boolean))] as string[];
    let tenantMap: Record<string, string> = {};
    if (tenantIds.length > 0) {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name')
        .in('id', tenantIds);
      (tenants || []).forEach((t) => { tenantMap[t.id] = t.name; });
    }

    // Get client names and their country/tenant info
    const accessClientIds = [...new Set((accesses || []).map((a: any) => {
      const inst = a.instance_id ? instMap[a.instance_id] : null;
      return inst?.client_id || null;
    }).filter(Boolean))] as string[];
    const appClientIds = [...new Set((apps || []).map((a: any) => a.client_id).filter(Boolean))] as string[];
    const allClientIds = [...new Set([...accessClientIds, ...appClientIds])];
    let clientMap: Record<string, any> = {};
    let countryMap: Record<string, string> = {};
    if (allClientIds.length > 0) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, country_id')
        .in('id', allClientIds);
      (clients || []).forEach((c) => { clientMap[c.id] = c; });

      const countryIds = [...new Set((clients || []).map((c: any) => c.country_id).filter(Boolean))] as string[];
      if (countryIds.length > 0) {
        const { data: countries } = await supabase
          .from('countries')
          .select('id, name')
          .in('id', countryIds);
        (countries || []).forEach((c) => { countryMap[c.id] = c.name; });
      }
    }

    return {
      data: favs.map((f) => {
        const app = appMap[f.app_id];
        const access = accessByApp[f.app_id];
        const inst = access?.instance_id ? instMap[access.instance_id] : null;
        const instClient = inst?.client_id ? clientMap[inst.client_id] : null;
        const appClient = app?.client_id ? clientMap[app.client_id] : null;
        const effectiveClient = instClient || appClient;

        return {
          ...f,
          application_name: app?.name,
          application_code: app?.code,
          application_icon: app?.icon,
          application_color: app?.color,
          application_base_url: app?.base_url,
          instance_id: access?.instance_id || null,
          instance_name: inst?.instance_name,
          instance_url: inst?.url,
          instance_open_mode: inst?.open_mode || 'external',
          tenant_id: access?.tenant_id || null,
          tenant_name: access?.tenant_id ? tenantMap[access.tenant_id] : undefined,
          client_name: effectiveClient?.name,
          country_name: effectiveClient?.country_id ? countryMap[effectiveClient.country_id] : undefined,
          access_id: access?.id,
        };
      }),
      error: null,
    };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al cargar favoritos' };
  }
}

export async function addFavorite(appId: string): Promise<{ data: UserFavorite | null; error: string | null }> {
  try {
    const userId = await getPlatformUserId();
    if (!userId) return { data: null, error: 'Usuario no autenticado' };

    // Check access first
    const { data: access } = await supabase
      .from('user_application_access')
      .select('id')
      .eq('user_id', userId)
      .eq('application_id', appId)
      .eq('access_status', 'assigned')
      .maybeSingle();

    if (!access) {
      return { data: null, error: 'No tienes acceso a esta aplicacion' };
    }

    // Check limit (max 8)
    const { count } = await supabase
      .from('user_favorites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((count || 0) >= 8) {
      return { data: null, error: 'Has alcanzado el limite de 8 favoritos' };
    }

    // Get next position
    const { data: lastFav } = await supabase
      .from('user_favorites')
      .select('position')
      .eq('user_id', userId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = lastFav ? lastFav.position + 1 : 0;

    const { data, error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: userId,
        app_id: appId,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'Esta aplicacion ya esta en tus favoritos' };
      }
      throw error;
    }

    return { data: data as UserFavorite, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al agregar favorito' };
  }
}

export async function removeFavorite(favoriteId: string): Promise<{ error: string | null }> {
  try {
    const userId = await getPlatformUserId();
    if (!userId) return { error: 'Usuario no autenticado' };

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('id', favoriteId)
      .eq('user_id', userId);

    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al eliminar favorito' };
  }
}

export async function reorderFavorites(items: { id: string; position: number }[]): Promise<{ error: string | null }> {
  try {
    const userId = await getPlatformUserId();
    if (!userId) return { error: 'Usuario no autenticado' };

    const updates = items.map((item) =>
      supabase
        .from('user_favorites')
        .update({ position: item.position })
        .eq('id', item.id)
        .eq('user_id', userId)
    );

    await Promise.all(updates);
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al reordenar favoritos' };
  }
}

export async function isFavorite(appId: string): Promise<boolean> {
  try {
    const userId = await getPlatformUserId();
    if (!userId) return false;

    const { data } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('app_id', appId)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}

export async function getFavoriteIds(): Promise<Set<string>> {
  try {
    const userId = await getPlatformUserId();
    if (!userId) return new Set();

    const { data } = await supabase
      .from('user_favorites')
      .select('app_id')
      .eq('user_id', userId);

    return new Set((data || []).map((f) => f.app_id));
  } catch {
    return new Set();
  }
}