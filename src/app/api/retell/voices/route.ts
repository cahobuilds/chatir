import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { canAccessTenant } from '@/lib/permissions-server';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/retell/voices - List curated voices for the voice provider
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

    // Only agent/knowledge managers (or platform staff) need the voice list.
    if (!(await canAccessTenant(user.id, tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Voice provider not connected for this organization. Please connect it in Settings.' },
        { status: 400 }
      );
    }

    const retellClient = createRetellClient(retellApiKey, {
      timeout: 20 * 1000,
      maxRetries: 2,
    });

    // Fetch the full voice library.
    const voices = await retellClient.voice.list();

    // White-label: expose ONLY the voice provider's "platform" library voices (the
    // retell-* set) and strip the vendor/provider name from the payload so nothing
    // reveals the underlying provider.
    const formattedVoices = (voices || [])
      .filter((voice: any) => typeof voice === 'object' && voice?.provider === 'platform')
      .map((voice: any) => ({
        voice_id: voice.voice_id || voice.id,
        voice_name: voice.voice_name || voice.name || voice.voice_id,
        gender: voice.gender || 'Unknown',
        accent: voice.accent || null,
        age: voice.age || null,
        preview_audio_url: voice.preview_audio_url || null,
      }));

    return NextResponse.json({
      voices: formattedVoices,
      count: formattedVoices.length,
    });
  } catch (error: any) {
    logRetellError(error, 'Voice List');
    return NextResponse.json(
      { error: `Failed to fetch available voices: ${formatRetellError(error)}` },
      { status: 500 }
    );
  }
}
