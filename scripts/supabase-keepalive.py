#!/usr/bin/env python3
"""Supabase keep-alive script — runs a REAL query against the DB to count as activity.

v2 (2026-08-05): v1 only hit /rest/v1/ with no apikey and got 401, which does NOT
count as project activity — project got paused anyway. Now uses the anon key from
.env.production and runs a real SELECT against a public table (profiles).
"""
import urllib.request, urllib.error, sys, os, json
from datetime import datetime

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
    url = f"{SUPABASE_URL}/rest/v1/profiles?select=id&limit=1"
    headers = {
        "User-Agent": "Pipz-KeepAlive/2.0",
        "Accept": "application/json",
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode()
            print(f"[{datetime.now().isoformat()}] OK — status={resp.status}, body={body[:80]}")
            return True
    except urllib.error.HTTPError as e:
        print(f"[{datetime.now().isoformat()}] HTTP {e.code} — {e.read()[:120]}")
        return False
    except Exception as e:
        print(f"[{datetime.now().isoformat()}] FAIL — {e}")
        return False

if __name__ == "__main__":
    ok = ping()
    # Also hit the project URL itself (any request to the project host counts as traffic)
    try:
        req2 = urllib.request.Request(f"{SUPABASE_URL}/auth/v1/health", headers={"apikey": get_anon_key() or ""})
        with urllib.request.urlopen(req2, timeout=20) as r2:
            print(f"[{datetime.now().isoformat()}] health={r2.status}")
    except Exception:
        pass
    sys.exit(0 if ok else 1)
