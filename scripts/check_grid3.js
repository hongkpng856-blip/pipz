const fs = require('fs');
const srk = fs.readFileSync('/tmp/supabase_srk.txt', 'utf8').trim();
const baseUrl = 'https://mxbuffmxvyuioidjzaet.supabase.co';

async function main() {
  // Grid config
  const gridRes = await fetch(`${baseUrl}/rest/v1/grid_config?select=*`, {
    headers: { apikey: srk, Authorization: `Bearer *** aretard; Accept: 'application/json' }
  });
  const gridData = await gridRes.json();
  console.log('GRID CONFIG:', JSON.stringify(gridData, null, 2));

  // Properties grouped by anchor
  const propsRes = await fetch(`${baseUrl}/rest/v1/properties?select=anchor_lat,anchor_lng,cell_row,cell_col,price,user_id&order=id.asc`, {
    headers: { apikey: srk, Authorization: `Bearer *** aretard; Accept: 'application/json' }
  });
  const propsData = await propsRes.json();
  
  // Group by anchor
  const byAnchor = {};
  for (const p of propsData) {
    const key = `${p.anchor_lat},${p.anchor_lng}`;
    if (!byAnchor[key]) byAnchor[key] = [];
    byAnchor[key].push(p);
  }
  for (const [anchor, props] of Object.entries(byAnchor)) {
    console.log(`\nAnchor ${anchor}: ${props.length} properties`);
    for (const p of props.slice(0, 5)) {
      console.log(`  row=${p.cell_row} col=${p.cell_col} price=${p.price}`);
    }
    if (props.length > 5) console.log(`  ... and ${props.length - 5} more`);
  }
}

main().catch(e => console.error('ERROR:', e.message));
