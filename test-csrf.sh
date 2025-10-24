#!/bin/bash

# CSRF Protection Test Script
# Tests the CSRF implementation for the Plotly Chart API

echo "🧪 CSRF Protection Test"
echo "======================="
echo ""

# Colors for output
GREEN='\033[0.32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Get CSRF token
echo "Test 1: Getting CSRF token..."
curl -s -c /tmp/csrf-cookies.txt http://localhost:3001/api/csrf-token | jq '.'
echo ""

# Extract token from cookie
TOKEN=$(grep XSRF-TOKEN /tmp/csrf-cookies.txt | awk '{print $7}')
echo "✅ Token extracted: $TOKEN"
echo ""

# Test 2: Try POST without CSRF token (should fail)
echo "Test 2: POST without CSRF token (should fail with 403)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/charts \
  -H "Content-Type: application/json" \
  -b /tmp/csrf-cookies.txt \
  -d '{"plotlyData":{"data":[],"layout":{}}}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "403" ]; then
  echo -e "${GREEN}✅ PASS: Got 403 as expected${NC}"
  echo "Response: $BODY" | jq '.'
else
  echo -e "${RED}❌ FAIL: Expected 403, got $HTTP_CODE${NC}"
fi
echo ""

# Test 3: Try POST with CSRF token (should succeed)
echo "Test 3: POST with CSRF token (should succeed with 201)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/charts \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -b /tmp/csrf-cookies.txt \
  -d '{"plotlyData":{"data":[{"x":[1,2,3],"y":[1,4,9],"type":"scatter"}],"layout":{"title":"CSRF Test Chart"}}}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ]; then
  echo -e "${GREEN}✅ PASS: Got 201 as expected${NC}"
  echo "Response: $BODY" | jq '.'
else
  echo -e "${RED}❌ FAIL: Expected 201, got $HTTP_CODE${NC}"
  echo "Response: $BODY"
fi
echo ""

# Cleanup
rm -f /tmp/csrf-cookies.txt

echo "🎉 CSRF Tests Complete!"