#!/bin/bash
SRK=$(cat /tmp/supabase_srk.txt)
echo "SRK length: ${#SRK}"

# Try with proper quoting
curl -s -X POST "https://mxbuffmxvyuioidjzaet.supabase.co/auth/v1/admin/generate" \
  -H "apikey: ${SRK}" \
  -H "Authorization: Bearer *** \
  -H "Content-Type: application/json" \
  -d '{"user_id":"0ca58feb-4714-4695-9395-d846f869126f"}' 2>&1
echo ""

# Alternative: try token endpoint
curl -s -X POST "https://mxbuffmxvyuioidjzaet.supabase.co/auth/v1/admin/generate" \
  -H "apikey: *** \
  -H "Authorization: Bearer *** \
  -H "Content-Type: application/json" \
  -d '{"type":"signup","email":"pipztest@gmail.com","password":"test123","data":{}}' 2>&1 | head -c 500
echo ""
