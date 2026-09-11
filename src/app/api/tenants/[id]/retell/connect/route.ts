import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { hasPlatformPermission } from '@/lib/permissions-server';
import { encrypt } from '@/lib/encryption';
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

    // Only platform roles with `retell_key.manage` can connect the voice-provider key.
    if (!(await hasPlatformPermission(user.id, 'retell_key.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Platform access required' }, { status: 403 });
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
      // Create Retell client with enhanced configuration for connection test
      // Shorter timeout (15s) and fewer retries (1) for quick validation
      const retellClient = createRetellClient(retell_api_key, {
        timeout: 15 * 1000, // 15 seconds for connection test
        maxRetries: 1, // Single retry for quick validation
      });
      
      // Try to list agents to validate the API key
      // This is a lightweight operation that validates the connection
      await retellClient.agent.list({ limit: 1 });
      
      // If successful, update tenant with Retell connection info
      const updateData: any = {
        retell_api_key: encrypt(retell_api_key),
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
      // Log error with context
      logRetellError(retellError, 'Connection Test');
      
      // Update status to error
      await adminSupabase
        .from('tenants')
        .update({ 
          retell_connection_status: 'error',
        })
        .eq('id', id);

      // Format user-friendly error message
      const errorMessage = formatRetellError(retellError);
      return NextResponse.json({ 
        error: `Invalid Retell API key or connection failed: ${errorMessage}` 
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

    // Only platform roles with `retell_key.manage` can view voice-provider connection status.
    if (!(await hasPlatformPermission(user.id, 'retell_key.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Platform access required' }, { status: 403 });
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

    // Only platform roles with `retell_key.manage` can disconnect the voice provider.
    if (!(await hasPlatformPermission(user.id, 'retell_key.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Platform access required' }, { status: 403 });
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

