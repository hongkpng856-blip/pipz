#!/bin/bash
SUPABASE_URL="https://mxbuffmxvyuioidjzaet.supabase.co"
SRK=$(cat /tmp/supabase_srk.txt)

# Try generating a session via GoTrue admin API
echo "=== Trying admin/generate_session ==="
curl -s -X POST "$SUPABASE_URL/auth/v1/admin/generate_session" \
  -H "apikey: ${SRK}" \
  -H "Authorization: Bearer ${SRK}" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"0ca58feb-4714-4695-9395-d846f869126f"}' 2>&1 | head -c 500
echo ""
echo "=== Trying admin/users/id ==="
curl -s -X GET "$SUPABASE_URL/auth/v1/admin/users/0ca58feb-4714-4695-9395-d846f869126f" \
  -H "apikey: ${SRK}" \
  -H "Authorization: Bearer ${SRK}" 2>&1 | head -c 500
