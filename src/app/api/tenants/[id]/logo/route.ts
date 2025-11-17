import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/tenants/[id]/logo - Upload tenant logo
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

    // Verify user is tenant_admin or super_admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', id)
      .in('role', ['tenant_admin', 'super_admin', 'organization_admin'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG' 
      }, { status: 400 });
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size exceeds 5MB limit' 
      }, { status: 400 });
    }

    // Get file extension
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${id}/logo.${fileExt}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage using admin client to bypass RLS
    // (We've already verified permissions above)
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('tenant-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true, // Replace existing logo
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ 
        error: `Upload failed: ${uploadError.message}` 
      }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = adminSupabase.storage
      .from('tenant-logos')
      .getPublicUrl(fileName);

    // Update tenant branding with logo URL using admin client
    // First, get current branding
    const { data: tenant, error: fetchError } = await adminSupabase
      .from('tenants')
      .select('branding')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ 
        error: `Failed to fetch tenant: ${fetchError.message}` 
      }, { status: 500 });
    }

    // Update branding JSONB - merge with existing branding
    // Ensure branding is always a valid object
    let currentBranding: any = {};
    if (tenant?.branding) {
      if (typeof tenant.branding === 'string') {
        try {
          currentBranding = JSON.parse(tenant.branding);
        } catch {
          currentBranding = {};
        }
      } else if (typeof tenant.branding === 'object') {
        currentBranding = tenant.branding;
      }
    }

    const updatedBranding = {
      ...currentBranding,
      logo_url: publicUrl,
      logo_updated_at: new Date().toISOString(),
    };

    // Update using admin client to bypass RLS
    const { data: updatedTenant, error: brandingError } = await adminSupabase
      .from('tenants')
      .update({ branding: updatedBranding })
      .eq('id', id)
      .select('id, name, branding')
      .single();

    if (brandingError) {
      console.error('Branding update error:', brandingError);
      return NextResponse.json({ 
        error: `Failed to update tenant branding: ${brandingError.message}` 
      }, { status: 500 });
    }

    if (!updatedTenant) {
      return NextResponse.json({ 
        error: 'Failed to update tenant branding: No tenant returned' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      logo_url: publicUrl,
      tenant: updatedTenant
    });
  } catch (error: any) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE /api/tenants/[id]/logo - Delete tenant logo
export async function DELETE(
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

    // Verify user is tenant_admin or super_admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', id)
      .in('role', ['tenant_admin', 'super_admin', 'organization_admin'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    // Use admin client for storage operations (permissions already verified)
    const adminSupabase = createAdminClient();
    
    // List files in tenant folder
    const { data: files, error: listError } = await adminSupabase.storage
      .from('tenant-logos')
      .list(id);

    if (listError) {
      return NextResponse.json({ 
        error: `Failed to list files: ${listError.message}` 
      }, { status: 500 });
    }

    // Delete all logo files for this tenant
    if (files && files.length > 0) {
      const filePaths = files.map(file => `${id}/${file.name}`);
      const { error: deleteError } = await adminSupabase.storage
        .from('tenant-logos')
        .remove(filePaths);

      if (deleteError) {
        return NextResponse.json({ 
          error: `Failed to delete logo: ${deleteError.message}` 
        }, { status: 500 });
      }
    }

    // Remove logo_url from branding using admin client
    const { data: tenant } = await adminSupabase
      .from('tenants')
      .select('branding')
      .eq('id', id)
      .single();

    if (tenant) {
      const currentBranding = (tenant.branding as any) || {};
      const { logo_url, logo_updated_at, ...updatedBranding } = currentBranding;

      const { error: updateError } = await adminSupabase
        .from('tenants')
        .update({ branding: updatedBranding })
        .eq('id', id);

      if (updateError) {
        console.error('Branding update error:', updateError);
        return NextResponse.json({ 
          error: `Failed to update tenant branding: ${updateError.message}` 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logo delete error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

