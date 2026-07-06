#!/usr/bin/env python3
import json, os, subprocess
from collections import Counter

CELL = 0.0003
UNIFIED_LAT = 22.3752
UNIFIED_LNG = 114.1134

key_raw = open(os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', '.env.production')).read()
key = [l.split('=',1)[1].strip().strip("'\"\n\r ") for l in key_raw.split('\n') if 'SUPABASE_SERVICE_ROLE_KEY' in l][0]

auth = 'Bearer ' + key
proc = subprocess.run(
    ['curl', '-s',
     'https://mxbuffmxvyuioidjzaet.supabase.co/rest/v1/properties?select=id,anchor_lat,anchor_lng,cell_row,cell_col&limit=100',
     '-H', 'apikey: ' + key,
     '-H', 'Authorization: ' + auth],
    capture_output=True, text=True)

if proc.returncode != 0:
    print("curl error:", proc.stderr)
    exit(1)

props = json.loads(proc.stdout)

# Calculate new positions
updates = []
for p in props:
    pid = p['id']
    center_lat = p['anchor_lat'] + p['cell_row'] * CELL + CELL / 2
    center_lng = p['anchor_lng'] + p['cell_col'] * CELL + CELL / 2
    new_row = round((center_lat - UNIFIED_LAT) / CELL)
    new_col = round((center_lng - UNIFIED_LNG) / CELL)
    updates.append((pid, new_row, new_col))

# Find conflicts and resolve by shifting duplicates
cell_counts = Counter((r, c) for _, r, c in updates)
conflicts = {k: v for k, v in cell_counts.items() if v > 1}

used_cells = set()
resolved = []
for pid, new_row, new_col in updates:
    cell = (new_row, new_col)
    if cell not in used_cells:
        used_cells.add(cell)
        resolved.append((pid, new_row, new_col))
    else:
        offset = 1
        while True:
            found = False
            for dr, dc in [(offset,0), (-offset,0), (0,offset), (0,-offset),
                           (offset,offset), (-offset,-offset), (offset,-offset), (-offset,offset)]:
                candidate = (new_row + dr, new_col + dc)
                if candidate not in used_cells:
                    used_cells.add(candidate)
                    resolved.append((pid, candidate[0], candidate[1]))
                    print("Conflict resolved: pid={} ({},{}) -> ({},{})".format(pid, new_row, new_col, candidate[0], candidate[1]))
                    found = True
                    break
            if found:
                break
            offset += 1

# Generate SQL
sql_lines = ['-- Migration: Unify all properties to anchor ({}, {})'.format(UNIFIED_LAT, UNIFIED_LNG),
             'BEGIN;']
for pid, r, c in resolved:
    sql_lines.append("UPDATE properties SET anchor_lat={}, anchor_lng={}, cell_row={}, cell_col={} WHERE id={};".format(UNIFIED_LAT, UNIFIED_LNG, r, c, pid))
sql_lines.append('COMMIT;')

out_path = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'migrations', 'unify_anchor.sql')
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, 'w') as f:
    f.write('\n'.join(sql_lines) + '\n')
print('Migration written to', out_path)
print('Total properties:', len(resolved))
print('Conflicts resolved:', len(conflicts))
