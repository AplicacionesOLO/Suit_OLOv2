import { supabase } from '@/services/supabase/client';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

export interface AppCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Application {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  code: string;
  description: string | null;
  icon: string;
  color: string;
  base_url: string | null;
  status: string;
  version: string;
  integration_type: string;
  tags: string[] | null;
  created_at: string;
}

export interface AppInstance {
  id: string;
  tenant_id: string;
  application_id: string;
  instance_name: string;
  url: string | null;
  status: string;
  open_in_olo: boolean;
  open_in_new_tab: boolean;
  allows_iframe: boolean;
  sso_enabled: boolean;
  jwt_federated: boolean;
  allowed_domains: string[] | null;
  created_at: string;
}

export async function fetchCategories(): Promise<{ data: AppCategory[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('application_categories')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return { data: (data || []) as AppCategory[], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

export async function fetchApplications(): Promise<{ data: Application[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: (data || []) as Application[], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

export async function fetchInstances(): Promise<{ data: AppInstance[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('application_instances')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data || []) as AppInstance[], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

export async function fetchTenants(): Promise<{ data: { id: string; name: string; code: string }[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, code')
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: (data || []) as { id: string; name: string; code: string }[], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}