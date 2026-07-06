import sys, json, urllib.request

# Read keys from env
with open(r'C:\Users\claw\Desktop\Pipz\apps\web\.env.production', 'r') as f:
    content = f.read()

lines = content.strip().split('\n')
service_key = anon_key = ''
for line in lines:
    if line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
        service_key = line.split('=', 1)[1]
    elif line.startswith('NEXT_PUBLIC_SUPABASE_ANON_KEY='):
        anon_key = line.split('=', 1)[1].strip('"')

url = "https://mxbuffmxvyuioidjzaet.supabase.co"

# 1. Generate a fresh OTP (magic link)
req1 = urllib.request.Request(
    f'{url}/auth/v1/admin/generate_link',
    data=json.dumps({"type": "magiclink", "email": "pipztest@gmail.com"}).encode(),
    headers={
        'apikey': anon_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json',
    },
    method='POST'
)
with urllib.request.urlopen(req1) as r:
    data = json.loads(r.read())
    otp = data['email_otp']
    print(f"OTP: {otp}")

# 2. Verify OTP to get session
req2 = urllib.request.Request(
    f'{url}/auth/v1/verify',
    data=json.dumps({"type": "magiclink", "token": otp, "email": "pipztest@gmail.com"}).encode(),
    headers={'apikey': anon_key, 'Content-Type': 'application/json'},
    method='POST'
)
with urllib.request.urlopen(req2) as r:
    session = json.loads(r.read())
    print(f"SESSION_OK: true")
    print(f"ACCESS_TOKEN: {session['access_token'][:20]}...")
    print(f"REFRESH_TOKEN: {session['refresh_token'][:20]}...")
    print(f"USER_ID: {session['user']['id']}")
    
    # Output tokens for use in browser
    print(f"\n--- BROWSER INJECT ---")
    token_data = {
        "access_token": session['access_token'],
        "refresh_token": session['refresh_token'],
        "user": session['user']
    }
    print(f"TOKEN_JSON: {json.dumps(token_data)}")
