const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read the service role key
const envContent = fs.readFileSync('.env.production', 'utf8');
const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/);
if (!match) { console.error("Key not found"); process.exit(1); }
const srk = match[1];
console.log('Key length:', srk.length);

const supabase = createClient(
  'https://mxbuffmxvyuioidjzaet.supabase.co',
  srk,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

supabase.auth.admin.createSession({
  user_id: '0ca58feb-4714-4695-9395-d846f869126f'
}).then(r => {
  if (r.data?.session) {
    console.log('SESSION SUCCESS');
    console.log('access_token:', r.data.session.access_token?.slice(0, 50) + '...');
    console.log('refresh_token:', r.data.session.refresh_token?.slice(0, 50) + '...');
    console.log('Full session:', JSON.stringify(r.data.session, null, 2).slice(0, 1000));
  } else {
    console.log('ERROR:', JSON.stringify(r.error));
  }
}).catch(e => console.log('EXCEPTION:', e.message));
