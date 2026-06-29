"""Use PixelLab API to generate cat IDLE animation"""
import requests, json, base64, os, sys

with open(r'C:\Users\claw\Desktop\Pipz\scripts\pixellab_cat.png', 'rb') as f:
    cat_b64 = base64.b64encode(f.read()).decode('utf-8')

headers = {
    "Authorization": f"Bearer {sys.argv[1]}",
    "Content-Type": "application/json"
}

payload = {
    "description": "cute orange tabby cat, round face, short ears, big eyes, whiskers, short legs, long tail, sitting, blinking eyes, tail swaying gently",
    "action": "idle",
    "view": "side",
    "direction": "east",
    "image_size": {"width": 64, "height": 64},
    "reference_image": {"type": "base64", "base64": cat_b64},
    "n_frames": 6
}

print("Calling animate-with-text for IDLE...")
resp = requests.post(
    "https://api.pixellab.ai/v1/animate-with-text",
    headers=headers,
    json=payload,
    timeout=120
)

print(f"Status: {resp.status_code}")
data = resp.json()
print("Response:", json.dumps(data, indent=2)[:2000])

if 'images' in data:
    print(f"Got {len(data['images'])} frames!")
    for i, img in enumerate(data['images']):
        b64 = img['base64']
        if b64.startswith('data:'):
            b64 = b64.split(',', 1)[1]
        path = rf'C:\Users\claw\Desktop\Pipz\scripts\cat_idle_frame_{i}.png'
        with open(path, 'wb') as f:
            f.write(base64.b64decode(b64))
        print(f"  Frame {i}: saved")
    if 'usage' in data:
        print(f"Usage: {data['usage']}")
else:
    print("No images in response")
