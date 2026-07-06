#!/bin/bash
SRK=$(cat /tmp/supabase_srk.txt)

# Query properties schema via REST API
curl -s "https://mxbuffmxvyuioidjzaet.supabase.co/rest/v1/properties?select=anchor_lat,anchor_lng,cell_row,cell_col,price&limit=3" \
  -H "apikey: ${SRK}" \
  -H "Authorization: Bearer *** \
  -H "Accept: application/json" 2>&1 | head -c 500
echo ""
echo "==="

# Get the column types
curl -s -X GET "https://mxbuffmxvyuioidjzaet.supabase.co/rest/v1/rpc/get_column_types" \
  -H "apikey: ${SRK}" \
  -H "Authorization: Bearer *** 2>&1 | head -c 200
