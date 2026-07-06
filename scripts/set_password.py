import sys, json, urllib.request

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

# Update user - set password
req = urllib.request.Request(
    f'{url}/auth/v1/admin/users/0ca58feb-4714-4695-9395-d846f869126f',
    data=json.dumps({"password": "test1234", "user_metadata": {"email_verified": True}}).encode(),
    headers={
        'apikey': anon_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json',
    },
    method='PUT'
)

try:
    with urllib.request.urlopen(req) as r:
        result = json.loads(r.read())
        print("PASSWORD SET OK:", result.get('email'))
except urllib.error.HTTPError as e:
    print(f"ERROR: {e.code} {e.read().decode()}")
