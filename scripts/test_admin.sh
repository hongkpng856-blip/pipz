#!/bin/bash
SRK=$(cat /tmp/supabase_srk.txt)

echo "=== admin/sessions ==="
curl -s -X POST "https://mxbuffmxvyuioidjzaet.supabase.co/auth/v1/admin/sessions" \
  -H "apikey: ${SRK}" \
  -H "Authorization: Bearer *** \
  -H "Content-Type: application/json" \
  -d '{"user_id":"0ca58feb-4714-4695-9395-d846f869126f"}' 2>&1 | head -c 300
echo ""

echo "=== admin/generate ==="
curl -s -X POST "https://mxbuffmxvyuioidjzaet.supabase.co/auth/v1/admin/generate" \
  -H "apikey: ${SRK}" \
  -H "Authorization: Bearer *** \
  -H "Content-Type: application/json" \
  -d '{"user_id":"0ca58feb-4714-4695-9395-d846f869126f","role":"authenticated","exp":9999999999}' 2>&1 | head -c 300
echo ""
