#!/bin/bash

# Test Tenants API
# Usage: ./test-tenants-api.sh [preview-url]

PREVIEW_URL="${1:-https://ai-multi-tenant-saas-git-railway-service-br-3b5def-tindeveloper.vercel.app}"

echo "Testing Tenants API at: $PREVIEW_URL"
echo "======================================"
echo ""

# Test GET /api/tenants
echo "1. Testing GET /api/tenants"
echo "----------------------------"
curl -v "$PREVIEW_URL/api/tenants" \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat .cookies 2>/dev/null || echo '')" \
  2>&1 | grep -E "(< HTTP|{|\"error|\"tenants)"

echo ""
echo ""
echo "Note: If you get 401 Unauthorized, you need to:"
echo "1. Log in to the app first"
echo "2. Copy your session cookie"
echo "3. Save it to .cookies file or add it to the curl command"
echo ""
echo "To get cookies from browser:"
echo "1. Open DevTools (F12)"
echo "2. Go to Application/Storage tab"
echo "3. Copy the 'sb-*-auth-token' cookie value"
echo "4. Format: sb-xxx-auth-token=your-token-value"

