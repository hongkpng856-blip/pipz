#!/bin/bash
SRK=$(cat /tmp/supabase_srk.txt)
curl -s "https://mxbuffmxvyuioidjzaet.supabase.co/rest/v1/grid_config?select=*" \
  -H "apikey: ${SRK}" \
  -H "Authorization: Bearer *** \
  -H "Accept: application/json" 2>&1
