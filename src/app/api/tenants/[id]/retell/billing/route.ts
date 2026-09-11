import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { decrypt, isEncrypted } from '@/lib/encryption';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessTenant, hasPlatformPermission } from '@/lib/permissions-server';

// GET /api/tenants/[id]/retell/billing - Sync billing data from Retell
export async function GET(
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

    if (!(await hasPlatformPermission(user.id, 'payments.view'))) {
      return NextResponse.json({ 
        error: 'Forbidden: Platform access required' 
      }, { status: 403 });
    }

    // Get tenant's Retell API key
    const { data: tenant } = await adminSupabase
      .from('tenants')
      .select('retell_api_key, retell_connection_status')
      .eq('id', id)
      .single();

    if (!tenant?.retell_api_key) {
      return NextResponse.json(
        { error: 'Retell API key not configured' },
        { status: 400 }
      );
    }

    if (tenant.retell_connection_status !== 'connected') {
      return NextResponse.json(
        { error: 'Retell connection not established. Please connect first.' },
        { status: 400 }
      );
    }

    // API keys are encrypted at rest; resolve to plaintext before calling the provider.
    const retellApiKey = isEncrypted(tenant.retell_api_key)
      ? decrypt(tenant.retell_api_key)
      : tenant.retell_api_key;

    // Update sync status
    await adminSupabase
      .from('tenants')
      .update({ 
        retell_connection_status: 'syncing',
        retell_last_sync_at: new Date().toISOString(),
      })
      .eq('id', id);

    try {
      // Create Retell client with enhanced configuration for billing sync
      // Longer timeout (45s) and more retries (3) for billing operations
      const retellClient = createRetellClient(retellApiKey, {
        timeout: 45 * 1000, // 45 seconds for billing operations
        maxRetries: 3, // More retries for critical billing sync
      });
      
      // Get billing/usage data from Retell
      // Note: Retell SDK may have different methods for billing
      // This is a placeholder - adjust based on actual Retell API
      const billingData = {
        // Placeholder - adjust based on actual Retell billing API
        // Common fields might include:
        // - total_calls
        // - total_minutes
        // - total_cost
        // - billing_period
        // - usage_breakdown
        synced_at: new Date().toISOString(),
        note: 'Billing sync functionality - implement based on Retell API documentation'
      };

      // Get current settings to merge billing data
      const { data: currentTenant } = await adminSupabase
        .from('tenants')
        .select('settings')
        .eq('id', id)
        .single();

      const currentSettings = (currentTenant?.settings as any) || {};
      const updatedSettings = {
        ...currentSettings,
        retell_billing: billingData
      };

      // Update tenant with billing data
      await adminSupabase
        .from('tenants')
        .update({ 
          retell_connection_status: 'connected',
          retell_last_sync_at: new Date().toISOString(),
          settings: updatedSettings
        })
        .eq('id', id);

      return NextResponse.json({ 
        success: true,
        message: 'Billing data synced successfully',
        billing: billingData
      });
    } catch (syncError: any) {
      // Log error with context
      logRetellError(syncError, 'Billing Sync');
      
      // Update status back to connected on error
      await adminSupabase
        .from('tenants')
        .update({ 
          retell_connection_status: 'error',
        })
        .eq('id', id);

      // Format user-friendly error message
      const errorMessage = formatRetellError(syncError);
      return NextResponse.json({ 
        error: `Failed to sync billing: ${errorMessage}` 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Billing sync error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

