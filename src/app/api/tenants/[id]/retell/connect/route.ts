import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/tenants/[id]/retell/connect - Connect to Retell tenant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is system_admin or super_admin (only system admins can manage Retell connections)
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin', 'super_admin']);

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ 
        error: 'Forbidden: System admin access required' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { retell_api_key, retell_tenant_id } = body;

    if (!retell_api_key) {
      return NextResponse.json({ 
        error: 'Retell API key is required' 
      }, { status: 400 });
    }

    // Test the Retell API key by making a simple API call
    try {
      const retellClient = createRetellClient(retell_api_key);
      
      // Try to list agents to validate the API key
      // This is a lightweight operation that validates the connection
      await retellClient.agent.list({ limit: 1 });
      
      // If successful, update tenant with Retell connection info
      const updateData: any = {
        retell_api_key: retell_api_key,
        retell_connection_status: 'connected',
        retell_connected_at: new Date().toISOString(),
      };

      if (retell_tenant_id) {
        updateData.retell_tenant_id = retell_tenant_id;
      }

      const { data: updatedTenant, error: updateError } = await adminSupabase
        .from('tenants')
        .update(updateData)
        .eq('id', id)
        .select('id, name, retell_connection_status, retell_tenant_id, retell_connected_at')
        .single();

      if (updateError) {
        console.error('Failed to update tenant:', updateError);
        return NextResponse.json({ 
          error: `Failed to save connection: ${updateError.message}` 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true,
        message: 'Successfully connected to Retell',
        tenant: updatedTenant
      });
    } catch (retellError: any) {
      console.error('Retell API validation error:', retellError);
      
      // Update status to error
      await adminSupabase
        .from('tenants')
        .update({ 
          retell_connection_status: 'error',
        })
        .eq('id', id);

      return NextResponse.json({ 
        error: `Invalid Retell API key or connection failed: ${retellError.message || 'Unknown error'}` 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Retell connection error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// GET /api/tenants/[id]/retell/connect - Get Retell connection status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is system_admin or super_admin (only system admins can view Retell connections)
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin', 'super_admin']);

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ 
        error: 'Forbidden: System admin access required' 
      }, { status: 403 });
    }

    // Get tenant Retell connection info (don't return API key for security)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('retell_connection_status, retell_tenant_id, retell_connected_at, retell_last_sync_at')
      .eq('id', id)
      .single();

    if (tenantError) {
      return NextResponse.json({ 
        error: tenantError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      connection: {
        status: tenant.retell_connection_status || 'disconnected',
        tenant_id: tenant.retell_tenant_id,
        connected_at: tenant.retell_connected_at,
        last_sync_at: tenant.retell_last_sync_at,
        has_api_key: !!tenant.retell_connection_status && tenant.retell_connection_status !== 'disconnected'
      }
    });
  } catch (error: any) {
    console.error('Get Retell connection error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE /api/tenants/[id]/retell/connect - Disconnect from Retell
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is system_admin or super_admin (only system admins can disconnect Retell)
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin', 'super_admin']);

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ 
        error: 'Forbidden: System admin access required' 
      }, { status: 403 });
    }

    // Clear Retell connection (but keep API key for reconnection)
    const { data: updatedTenant, error: updateError } = await adminSupabase
      .from('tenants')
      .update({
        retell_connection_status: 'disconnected',
        retell_tenant_id: null,
        retell_connected_at: null,
      })
      .eq('id', id)
      .select('id, name, retell_connection_status')
      .single();

    if (updateError) {
      return NextResponse.json({ 
        error: `Failed to disconnect: ${updateError.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Disconnected from Retell',
      tenant: updatedTenant
    });
  } catch (error: any) {
    console.error('Retell disconnect error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

