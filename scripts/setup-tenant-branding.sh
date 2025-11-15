#!/bin/bash

# Setup script for tenant branding feature
# This script helps set up the multi-tenant branding system

echo "🚀 Setting up Tenant Branding System..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if project is linked
echo "📋 Checking Supabase project link..."
if ! supabase status &> /dev/null; then
    echo "⚠️  Project not linked. Please link your project first:"
    echo "   supabase link --project-ref your-project-ref"
    exit 1
fi

echo "✅ Project is linked"
echo ""

# Apply migration
echo "📦 Applying database migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully"
else
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi

echo ""
echo "📝 Next steps:"
echo ""
echo "1. Set up Supabase Storage:"
echo "   - Go to: https://supabase.com/dashboard/project/ystivchlyoijaghwdcjd/sql/new"
echo "   - Open: scripts/setup-tenant-storage.sql"
echo "   - Copy and paste the contents"
echo "   - Click 'Run'"
echo ""
echo "2. Verify setup:"
echo "   - Check Storage → Buckets (should see 'tenant-logos')"
echo "   - Check Storage → Policies (should see 4 policies)"
echo ""
echo "3. Test the feature:"
echo "   - Navigate to /tenant-settings"
echo "   - Upload a logo and update organization name"
echo ""
echo "✅ Setup complete!"

