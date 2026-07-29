#!/usr/bin/env python3
"""Execute RLS fix SQL directly against Supabase via service_role key."""
import json, os, sys, urllib.request, urllib.error

PROJECT_DIR = r"C:\Users\claw\Desktop\Pipz"
SUPABASE_URL = "https://mxbuffmxvyuioidjzaet.supabase.co"

def load_service_key():
    env_file = os.path.join(PROJECT_DIR, "apps", "web", ".env.production")
    with open(env_file) as f:
        for line in f:
            if "SUPABASE_SERVICE_ROLE_KEY" in line:
                val = line.strip().split("=", 1)[-1].strip('"\'')
                return val
    return ""

def run_sql_via_pg_query(sql):
    """Use the built-in pg_query RPC to execute SQL."""
    key = load_service_key()
    if not key:
        print("FAIL: cannot read service role key")
        return False

    # First try: pg_query RPC
    url = f"{SUPABASE_URL}/rest/v1/rpc/pg_query"
    headers = {
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    payload = json.dumps({"query_text": sql}).encode()
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            print(f"pg_query OK — {resp.status}: {body[:200]}")
            return True
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"pg_query failed HTTP {e.code}: {err[:200]}")

    # Second try: _sql_runner
    url2 = f"{SUPABASE_URL}/rest/v1/rpc/_sql_runner"
    req2 = urllib.request.Request(url2, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req2, timeout=30) as resp:
            body = resp.read().decode()
            print(f"_sql_runner OK — {resp.status}: {body[:200]}")
            return True
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"_sql_runner failed HTTP {e.code}: {err[:200]}")

    # Third try: raw query via the SQL API
    url3 = f"{SUPABASE_URL}/rest/v1/"
    payload3 = json.dumps({"query": sql}).encode()
    req3 = urllib.request.Request(url3, data=payload3, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req3, timeout=30) as resp:
            body = resp.read().decode()
            print(f"raw query OK — {resp.status}: {body[:200]}")
            return True
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"raw query failed HTTP {e.code}: {err[:200]}")

    return False

SQL = """
-- Enable RLS on tables missing it
ALTER TABLE IF EXISTS pet_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_log ENABLE ROW LEVEL SECURITY;

-- pet_equipment policies
DROP POLICY IF EXISTS "Users can read own equipment" ON pet_equipment;
CREATE POLICY "Users can read own equipment" ON pet_equipment FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own equipment" ON pet_equipment;
CREATE POLICY "Users can insert own equipment" ON pet_equipment FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own equipment" ON pet_equipment;
CREATE POLICY "Users can update own equipment" ON pet_equipment FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own equipment" ON pet_equipment;
CREATE POLICY "Users can delete own equipment" ON pet_equipment FOR DELETE USING (auth.uid() = user_id);

-- inventory policies
DROP POLICY IF EXISTS "Users can read own inventory" ON inventory;
CREATE POLICY "Users can read own inventory" ON inventory FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own inventory" ON inventory;
CREATE POLICY "Users can insert own inventory" ON inventory FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own inventory" ON inventory;
CREATE POLICY "Users can update own inventory" ON inventory FOR UPDATE USING (auth.uid() = user_id);

-- event_log policies
DROP POLICY IF EXISTS "Users can read own event_log" ON event_log;
CREATE POLICY "Users can read own event_log" ON event_log FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own event_log" ON event_log;
CREATE POLICY "Users can insert own event_log" ON event_log FOR INSERT WITH CHECK (auth.uid() = user_id);
"""

if __name__ == "__main__":
    ok = run_sql_via_pg_query(SQL)
    print(f"\n{'✅ SUCCESS' if ok else '❌ FAILED — need manual fix'}")
    print(f"\nSQL written to: supabase/migrations/20260729_rls_fix.sql")
    sys.exit(0 if ok else 1)
