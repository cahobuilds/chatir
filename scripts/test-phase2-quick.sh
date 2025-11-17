#!/bin/bash
# Quick Phase 2 test script

echo "🧪 Phase 2 Quick Test"
echo "===================="
echo ""

# Check if we can query the new columns
echo "1. Testing database schema..."
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'interactions' AND column_name IN ('reseller_tenant_id', 'cost_breakdown');" 2>/dev/null || echo "   ⚠️  Run: supabase db push to apply migration"

# Check if functions exist
echo ""
echo "2. Testing PostgreSQL functions..."
psql "$DATABASE_URL" -c "SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('get_reseller_tenant_id', 'get_reseller_retell_config');" 2>/dev/null || echo "   ⚠️  Functions may not exist yet"

# List tenants
echo ""
echo "3. Current tenant structure:"
psql "$DATABASE_URL" -c "SELECT id, name, is_reseller, parent_id IS NOT NULL as has_parent FROM tenants ORDER BY created_at DESC LIMIT 5;" 2>/dev/null || echo "   ⚠️  Could not query tenants"

echo ""
echo "✅ Quick test complete!"
