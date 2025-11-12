import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/profile - Get current user's profile with tenant and role information
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant memberships with role information
    const { data: userTenants, error: userTenantsError } = await supabase
      .from('user_tenants')
      .select(`
        id,
        role,
        status,
        permissions,
        last_login,
        created_at,
        tenants (
          id,
          name,
          subdomain,
          tier,
          billing_email,
          billing_plan
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (userTenantsError) {
      return NextResponse.json({ error: userTenantsError.message }, { status: 500 });
    }

    // Get user metadata from auth
    const profile = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      phone: user.user_metadata?.phone || user.phone || null,
      bio: user.user_metadata?.bio || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      created_at: user.created_at,
      tenants: userTenants || [],
    };

    return NextResponse.json({ profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, bio, avatar_url } = body;

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        name: name || user.user_metadata?.name,
        phone: phone || user.user_metadata?.phone,
        bio: bio || user.user_metadata?.bio,
        avatar_url: avatar_url || user.user_metadata?.avatar_url,
      },
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

