#!/usr/bin/env python3
"""Supabase keep-alive script — runs a lightweight query to prevent auto-pausing."""

import urllib.request
import urllib.error
import json
import sys
import os
from datetime import datetime

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://mxbuffmxvyuioidjzaet.supabase.co")
SUPABASE_ANON_KEY = os.environ.get("NEXt_PUBLIC_SUPABASE_ANON_KEY", "")
TIMEOUT = 15

def ping():
    """Hit the Supabase REST API to generate activity."""
    # Try the health/rest endpoint — works without auth
    url = f"{SUPABASE_URL}/rest/v1/"
    headers = {
        "User-Agent": "Pipz-KeepAlive/1.0",
        "Accept": "application/json",
    }
    if SUPABASE_ANON_KEY:
        headers["apikey"] = SUPABASE_ANON_KEY

    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            body = resp.read().decode()
            status = resp.status
            print(f"[{datetime.now().isoformat()}] OK — status={status}, len={len(body)}")
            return True
    except urllib.error.HTTPError as e:
        # 401/406 are expected for unauthenticated requests — that's still DB activity
        print(f"[{datetime.now().isoformat()}] HTTP {e.code} — expected for unauthenticated ping, DB still touched")
        return True
    except Exception as e:
        print(f"[{datetime.now().isoformat()}] FAIL — {e}")
        return False

if __name__ == "__main__":
    ok = ping()
    sys.exit(0 if ok else 1)
