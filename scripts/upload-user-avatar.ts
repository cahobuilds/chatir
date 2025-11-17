/**
 * Script to upload a user avatar and update their profile
 * 
 * Usage:
 *   npx tsx scripts/upload-user-avatar.ts <user-email> <image-path>
 * 
 * Example:
 *   npx tsx scripts/upload-user-avatar.ts admin@example.com ./avatar.jpg
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function uploadAvatar(userEmail: string, imagePath: string) {
  try {
    console.log(`Uploading avatar for user: ${userEmail}`);
    console.log(`Image path: ${imagePath}`);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.error(`Error: File not found: ${imagePath}`);
      process.exit(1);
    }

    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    const fileExt = path.extname(imagePath).slice(1) || 'png';
    const fileName = path.basename(imagePath);
    const mimeType = getMimeType(fileExt);

    // Find user by email
    const { data: users, error: userError } = await adminSupabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      process.exit(1);
    }

    const user = users.users.find(u => u.email === userEmail);
    
    if (!user) {
      console.error(`Error: User not found with email: ${userEmail}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.id} (${user.email})`);

    // Upload to avatars bucket
    const avatarFileName = `${user.id}/avatar.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('avatars')
      .upload(avatarFileName, imageBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      if (uploadError.message.includes('Bucket not found')) {
        console.error('Error: "avatars" bucket not found in Supabase Storage');
        console.error('Please create the bucket first:');
        console.error('1. Go to Supabase Dashboard → Storage');
        console.error('2. Create a new bucket named "avatars"');
        console.error('3. Set it to public');
        process.exit(1);
      }
      console.error('Upload error:', uploadError);
      process.exit(1);
    }

    console.log('✅ Avatar uploaded successfully');

    // Get public URL
    const { data: { publicUrl } } = adminSupabase.storage
      .from('avatars')
      .getPublicUrl(avatarFileName);

    console.log(`Public URL: ${publicUrl}`);

    // Update user metadata
    const { data: updatedUser, error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          avatar_url: publicUrl,
        },
      }
    );

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      process.exit(1);
    }

    console.log('✅ User profile updated successfully');
    console.log(`\nAvatar URL: ${publicUrl}`);
    console.log(`User: ${userEmail}`);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeTypes[ext.toLowerCase()] || 'image/png';
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: npx tsx scripts/upload-user-avatar.ts <user-email> <image-path>');
  console.error('Example: npx tsx scripts/upload-user-avatar.ts admin@example.com ./avatar.jpg');
  process.exit(1);
}

const [userEmail, imagePath] = args;

uploadAvatar(userEmail, imagePath);

