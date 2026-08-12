#!/usr/bin/env python3
"""Supabase keep-alive script — v3: real WRITE activity (heartbeat row), not just SELECT.

v3 (2026-08-12): v2's read-only SELECT got the project flagged as "insufficient
activity" by Supabase's auto-pause scanner. Supabase counts real data-plane usage,
so v3 upserts a heartbeat row into `keepalive_heartbeat` (id=1, updated_at=now)
via the REST API — an actual write transaction.

Requires the heartbeat table to exist (created via SQL migration):
  CREATE TABLE IF NOT EXISTS keepalive_heartbeat (
    id integer primary key,
    updated_at timestamptz not null default now()
  );
  ALTER TABLE keepalive_heartbeat ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "anon upsert heartbeat" ON keepalive_heartbeat
    FOR ALL TO anon USING (true) WITH CHECK (true);
"""
import urllib.request, urllib.error, sys, os, json
from datetime import datetime, timezone

SUPABASE_URL = "https://mxbuffmxvyuioidjzaet.supabase.co"
ENV_PATHS = [
    "C:/Users/claw/Desktop/Pipz/apps/web/.env.production",
    "C:/Users/claw/Desktop/Pipz/apps/web/.env.local",
]

def get_anon_key():
    for envp in ENV_PATHS:
        if not os.path.isfile(envp):
            continue
        with open(envp) as f:
            for line in f:
                if "SUPABASE_ANON_KEY" in line:
                    val = line.strip().split("=", 1)[-1].strip('"\'')
                    if val:
                        return val
    return None

def ping():
    key = get_anon_key()
    if not key:
        print(f"[{datetime.now().isoformat()}] FAIL — no anon key found")
        return False
    now = datetime.now(timezone.utc).isoformat()
    # 1) REAL WRITE: upsert heartbeat row (this is what counts as activity)
    # POST + merge-duplicates = insert if absent, update if present
    url = f"{SUPABASE_URL}/rest/v1/keepalive_heartbeat"
    headers = {
        "User-Agent": "Pipz-KeepAlive/3.0",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    body = json.dumps([{"id": 1, "updated_at": now}]).encode()
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            print(f"[{datetime.now().isoformat()}] WRITE OK — status={resp.status}")
    except urllib.error.HTTPError as e:
        print(f"[{datetime.now().isoformat()}] WRITE HTTP {e.code} — {e.read()[:150]}")
        return False
    except Exception as e:
        print(f"[{datetime.now().isoformat()}] WRITE FAIL — {e}")
        return False
    # 2) Health check (read)
    try:
        req2 = urllib.request.Request(f"{SUPABASE_URL}/auth/v1/health", headers={"apikey": key})
        with urllib.request.urlopen(req2, timeout=20) as r2:
            print(f"[{datetime.now().isoformat()}] health={r2.status}")
    except Exception:
        pass
    return True

if __name__ == "__main__":
    ok = ping()
    sys.exit(0 if ok else 1)
