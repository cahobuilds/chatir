// GET /api/tenants/[id]/users - Get all users for a tenant
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Create admin client for accessing auth.users
    const adminSupabase = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', id)
      .eq('status', 'active')
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if user has permission to view users (admin roles)
    const canViewUsers = ['super_admin', 'tenant_admin', 'organization_admin', 'system_admin'].includes(userTenant.role);
    if (!canViewUsers) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all users for this tenant
    const { data: userTenants, error: userTenantsError } = await supabase
      .from('user_tenants')
      .select(`
        id,
        user_id,
        role,
        status,
        last_login,
        created_at,
        updated_at
      `)
      .eq('tenant_id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (userTenantsError) {
      return NextResponse.json({ error: userTenantsError.message }, { status: 500 });
    }

    // Get user details from auth.users using admin client
    const usersWithDetails = await Promise.all(
      (userTenants || []).map(async (ut) => {
        try {
          const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(ut.user_id);
          
          if (authError || !authUser?.user) {
            return {
              id: ut.id,
              user_id: ut.user_id,
              email: 'Unknown',
              name: 'Unknown User',
              role: ut.role,
              status: ut.status,
              last_login: ut.last_login,
              created_at: ut.created_at,
            };
          }

          return {
            id: ut.id,
            user_id: ut.user_id,
            email: authUser.user.email || 'Unknown',
            name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User',
            role: ut.role,
            status: ut.status,
            last_login: ut.last_login,
            created_at: ut.created_at,
          };
        } catch (error) {
          return {
            id: ut.id,
            user_id: ut.user_id,
            email: 'Unknown',
            name: 'Unknown User',
            role: ut.role,
            status: ut.status,
            last_login: ut.last_login,
            created_at: ut.created_at,
          };
        }
      })
    );

    return NextResponse.json({ users: usersWithDetails });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

