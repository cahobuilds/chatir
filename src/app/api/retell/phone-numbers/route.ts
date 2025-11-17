import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/retell/phone-numbers - Get available phone numbers
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Verify user has access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .in('role', ['tenant_admin', 'super_admin'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get reseller's Retell API key (organizations inherit from reseller)
    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.' },
        { status: 400 }
      );
    }

    // Get phone numbers from Retell AI using reseller's API key
    const retellClient = createRetellClient(retellApiKey);
    const phoneNumbers = await retellClient.phoneNumber.list();

    return NextResponse.json({ phone_numbers: phoneNumbers });
  } catch (error: any) {
    console.error('Retell AI phone numbers retrieval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve phone numbers' },
      { status: 500 }
    );
  }
}

// POST /api/retell/phone-numbers - Purchase/assign phone number
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id, area_code, agent_id } = body;

    if (!tenant_id || !area_code) {
      return NextResponse.json(
        { error: 'tenant_id and area_code are required' },
        { status: 400 }
      );
    }

    // Verify user is admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .in('role', ['tenant_admin', 'super_admin'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get reseller's Retell API key (organizations inherit from reseller)
    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.' },
        { status: 400 }
      );
    }

    // Purchase phone number from Retell AI using reseller's API key
    const retellClient = createRetellClient(retellApiKey);
    const phoneNumberParams: any = { area_code };
    if (agent_id) {
      phoneNumberParams.agent_id = agent_id;
    }
    const phoneNumber = await retellClient.phoneNumber.create(phoneNumberParams);

    // If agent_id provided, update agent record
    if (agent_id) {
      await supabase
        .from('agents')
        .update({
          retell_phone_number_id: (phoneNumber as any).phone_number_id || (phoneNumber as any).id,
        })
        .eq('id', agent_id);
    }

    return NextResponse.json({ phone_number: phoneNumber }, { status: 201 });
  } catch (error: any) {
    console.error('Retell AI phone number purchase error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to purchase phone number' },
      { status: 500 }
    );
  }
}

