"""Regenerate cat idle + play using walk frame 0 as reference for consistency"""
import requests, json, base64, os, sys

SECRET = os.environ.get("PIXELLAB_SECRET", "") or sys.argv[1]

with open(r'C:\Users\claw\Desktop\Pipz\scripts\walk_frame_0.png', 'rb') as f:
    ref_b64 = base64.b64encode(f.read()).decode('utf-8')

headers = {
    "Authorization": f"Bearer {SECRET}",
    "Content-Type": "application/json"
}

animations = [
    {
        "name": "idle",
        "action": "idle",
        "description": "same orange cat, side view, sitting, round face, short ears, big eyes, whiskers, short legs, long tail curled, blinking, occasionally looking around, subtle movements",
        "n_frames": 4
    },
    {
        "name": "play",
        "action": "play",
        "description": "same orange cat, side view, crouching, tail up, pawing at something, playful hopping, pouncing motion, excited",
        "n_frames": 4
    }
]

for anim in animations:
    print(f"\n=== Generating {anim['name']} ===")
    payload = {
        "description": anim["description"],
        "action": anim["action"],
        "view": "side",
        "direction": "east",
        "image_size": {"width": 64, "height": 64},
        "reference_image": {"type": "base64", "base64": ref_b64},
        "n_frames": anim["n_frames"]
    }
    
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
            path = rf'C:\Users\claw\Desktop\Pipz\scripts\cat_{anim["name"]}_frame_{i}.png'
            with open(path, 'wb') as f:
                f.write(base64.b64decode(b64))
            print(f"  Frame {i}: saved")
        if 'usage' in data:
            print(f"Usage: {data['usage']}")
    else:
        print("Response:", json.dumps(data, indent=2)[:1000])
