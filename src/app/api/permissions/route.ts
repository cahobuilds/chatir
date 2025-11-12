import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ALL_PERMISSIONS } from '@/lib/permissions';

// GET /api/permissions - Get all available permissions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Group permissions by category
    const groupedPermissions = ALL_PERMISSIONS.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, typeof ALL_PERMISSIONS>);

    return NextResponse.json({
      permissions: ALL_PERMISSIONS,
      grouped: groupedPermissions,
      categories: Object.keys(groupedPermissions).sort(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

