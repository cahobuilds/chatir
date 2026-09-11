import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface PermissionRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

// GET /api/permissions - Get all available permissions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Serve the `permissions` table, not the legacy ALL_PERMISSIONS catalogue in
    // src/lib/permissions.ts. `role_permissions.permission_id` is a FK to this table, so the
    // roles UI must select the same UUID ids it will later write back.
    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('id, name, description, category')
      .order('category')
      .order('name');

    if (permError) {
      return NextResponse.json({ error: permError.message }, { status: 500 });
    }

    const allPermissions: PermissionRow[] = permissions || [];

    // Group permissions by category
    const groupedPermissions = allPermissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, PermissionRow[]>);

    return NextResponse.json({
      permissions: allPermissions,
      grouped: groupedPermissions,
      categories: Object.keys(groupedPermissions).sort(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

