import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/retell/voices - List available voices from Retell AI
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant_id from query params
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
      .in('role', ['tenant_admin', 'super_admin', 'system_admin', 'organization_admin', 'manager'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    // Get reseller's Retell API key (organizations inherit from reseller)
    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.' },
        { status: 400 }
      );
    }

    // Create Retell client
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 20 * 1000,
      maxRetries: 2,
    });

    // Fetch available voices from Retell AI
    const voices = await retellClient.voice.list();

    // Transform voices to a consistent format
    // Retell API may return voices as strings or objects
    const formattedVoices = (voices || []).map((voice: any) => {
      // Handle different response formats
      if (typeof voice === 'string') {
        return {
          voice_id: voice,
          voice_name: voice.split('-').pop() || voice, // Extract name from ID (e.g., "11labs-Cimo" -> "Cimo")
          provider: voice.split('-')[0] || 'unknown', // Extract provider (e.g., "11labs-Cimo" -> "11labs")
          gender: 'Unknown',
        };
      }

      // Handle object format
      return {
        voice_id: voice.voice_id || voice.id || voice,
        voice_name: voice.voice_name || voice.name || (voice.voice_id || voice.id || voice).split('-').pop(),
        provider: voice.provider || (voice.voice_id || voice.id || '').split('-')[0] || 'unknown',
        gender: voice.gender || 'Unknown',
        accent: voice.accent || null,
        age: voice.age || null,
        preview_audio_url: voice.preview_audio_url || null,
      };
    });

    return NextResponse.json({
      voices: formattedVoices,
      count: formattedVoices.length,
    });
  } catch (error: any) {
    logRetellError('Failed to fetch Retell voices', error);
    return NextResponse.json(
      { error: `Failed to fetch available voices from Retell AI: ${formatRetellError(error)}` },
      { status: 500 }
    );
  }
}

