"""Use PixelLab API to generate a walking cat animation"""
import requests
import json
import base64
import os

# Read secret from env var for safety
SECRET = os.environ.get("PIXELLAB_SECRET", "")

# Load the generated cat image as base64
with open(r'C:\Users\claw\Desktop\Pipz\scripts\pixellab_cat.png', 'rb') as f:
    cat_b64 = base64.b64encode(f.read()).decode('utf-8')

headers = {
    "Authorization": f"Bearer {SECRET}",
    "Content-Type": "application/json"
}

# Generate walking animation
payload = {
    "description": "cute orange tabby cat, round face, short ears, big eyes, whiskers, short legs, long tail",
    "action": "walk",
    "view": "side",
    "direction": "east",
    "image_size": {"width": 64, "height": 64},
    "reference_image": {"type": "base64", "base64": cat_b64},
    "n_frames": 4
}

print("Calling animate-with-text API...")
resp = requests.post(
    "https://api.pixellab.ai/v1/animate-with-text",
    headers=headers,
    json=payload,
    timeout=120
)

print(f"Status: {resp.status_code}")
data = resp.json()

if 'images' in data:
    print(f"Got {len(data['images'])} frames!")
    for i, img in enumerate(data['images']):
        b64 = img['base64']
        if b64.startswith('data:'):
            b64 = b64.split(',', 1)[1]
        path = rf'C:\Users\claw\Desktop\Pipz\scripts\walk_frame_{i}.png'
        with open(path, 'wb') as f:
            f.write(base64.b64decode(b64))
        print(f"  Frame {i}: saved")
    if 'usage' in data:
        print(f"Usage: {data['usage']}")
else:
    print(json.dumps(data, indent=2)[:1000])
