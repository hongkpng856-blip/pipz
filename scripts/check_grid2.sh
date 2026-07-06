#!/bin/bash
SRK=$(cat /tmp/supabase_srk.txt)
echo "=== GRID CONFIG ==="
curl -s "https://mxbuffmxvyuioidjzaet.supabase.co/rest/v1/grid_config?select=*" \
  -H "apikey: ${SRK}" \
  -H "Authorization: Bearer *** \
  -H "Accept: application/json"
echo ""
echo "=== ANCHOR SUMMARY ==="
curl -s "https://mxbuffmxvyuioidjzaet.supabase.co/rest/v1/properties?select=anchor_lat,anchor_lng,count=id" \
  -H "apikey: ${SRK}" \
  -H "Authorization: Bearer *** \
  -H "Accept: application/json"
