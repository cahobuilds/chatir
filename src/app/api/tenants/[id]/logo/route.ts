import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/tenants/[id]/logo - Upload tenant logo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      .in('role', ['tenant_admin', 'super_admin'])
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

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
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
    const { data: { publicUrl } } = supabase.storage
      .from('tenant-logos')
      .getPublicUrl(fileName);

    // Update tenant branding with logo URL
    const { data: tenant, error: updateError } = await supabase
      .from('tenants')
      .select('branding')
      .eq('id', id)
      .single();

    if (updateError) {
      return NextResponse.json({ 
        error: `Failed to fetch tenant: ${updateError.message}` 
      }, { status: 500 });
    }

    // Update branding JSONB
    const currentBranding = (tenant.branding as any) || {};
    const updatedBranding = {
      ...currentBranding,
      logo_url: publicUrl,
      logo_updated_at: new Date().toISOString(),
    };

    const { data: updatedTenant, error: brandingError } = await supabase
      .from('tenants')
      .update({ branding: updatedBranding })
      .eq('id', id)
      .select()
      .single();

    if (brandingError) {
      return NextResponse.json({ 
        error: `Failed to update tenant branding: ${brandingError.message}` 
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
      .in('role', ['tenant_admin', 'super_admin'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    // List files in tenant folder
    const { data: files, error: listError } = await supabase.storage
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
      const { error: deleteError } = await supabase.storage
        .from('tenant-logos')
        .remove(filePaths);

      if (deleteError) {
        return NextResponse.json({ 
          error: `Failed to delete logo: ${deleteError.message}` 
        }, { status: 500 });
      }
    }

    // Remove logo_url from branding
    const { data: tenant } = await supabase
      .from('tenants')
      .select('branding')
      .eq('id', id)
      .single();

    if (tenant) {
      const currentBranding = (tenant.branding as any) || {};
      const { logo_url, logo_updated_at, ...updatedBranding } = currentBranding;

      await supabase
        .from('tenants')
        .update({ branding: updatedBranding })
        .eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logo delete error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

