#!/bin/bash
# Quick test script - Update these values first!

BASE_URL="http://localhost:3000"
TENANT_ID=""  # Get from /api/tenants
NOTION_TOKEN=""  # Your Notion API token (starts with secret_)

echo "⚠️  Update TENANT_ID and NOTION_TOKEN in this script first!"
echo ""
echo "Then run:"
echo "  1. Get tenant ID: curl $BASE_URL/api/tenants"
echo "  2. Create resource: See docs/QUICK_TEST_GUIDE.md"
echo "  3. Create service: See docs/QUICK_TEST_GUIDE.md"
