"""Delete old non-pixellab eggs from test account."""
import re

with open(r'C:\Users\claw\Desktop\Pipz\apps\web\.env.production') as f:
    content = f.read()

match = re.search(r'SUPABASE_SERVICE_ROLE_KEY=(\S+)', content)
key = match.group(1)

print(f"Key length: {len(key)}")
print(f"First 10: {key[:10]}")
