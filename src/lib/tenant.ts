import { createClient } from '@/lib/supabase/server';

export async function getCurrentTenant() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }

  // Get user's primary tenant (first active tenant)
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select(`
      tenant_id,
      role,
      tenants (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!userTenant) {
    return null;
  }

  return {
    id: userTenant.tenant_id,
    role: userTenant.role,
    ...userTenant.tenants,
  };
}

export async function getUserTenants() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return [];
  }

  const { data: userTenants } = await supabase
    .from('user_tenants')
    .select(`
      tenant_id,
      role,
      status,
      tenants (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  return userTenants || [];
}

