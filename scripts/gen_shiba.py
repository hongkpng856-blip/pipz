"""Generate PixelLab Shiba sprites: icon, walk, idle, play + remove bg"""
import json, urllib.request, base64, os, re

# Read token from .env.local
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'apps', 'web', '.env.local')
with open(env_path) as f:
    content = f.read()
m = re.search(r'PIXELLAB_SECRET=["\']?([^"\'\s]+)', content)
if not m:
    raise ValueError("PIXELLAB_SECRET not found")
TOKEN=***p()

def gen_image(desc, size=64):
    data = json.dumps({
        "description": desc,
        "image_size": {"width": size, "height": size}
    }).encode()
    req = urllib.request.Request(
        "https://api.pixellab.ai/v2/create-image-pixflux",
        data=data,
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method='POST'
    )
    resp = urllib.request.urlopen(req, timeout=60)
    result = json.loads(resp.read())
    print(f"  Usage: {result.get('usage')}")
    return base64.b64decode(result['image']['base64'])

def remove_bg(img_b64):
    data = json.dumps({"image": img_b64}).encode()
    req = urllib.request.Request(
        "https://api.pixellab.ai/v2/remove-background",
        data=data,
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method='POST'
    )
    resp = urllib.request.urlopen(req, timeout=60)
    result = json.loads(resp.read())
    return result['image']['base64']

BASE = os.path.dirname(os.path.abspath(__file__))

sprites = {
    "icon": "shiba inu dog pixel art 64x64 game character front view standing cute orange brown white face tongue out",
    "walk": "shiba inu dog pixel art 64x64 side view walking 4 legs stride orange brown white game character",
    "idle": "shiba inu dog pixel art 64x64 side view sitting idle panting tongue out orange brown white game character",
    "play": "shiba inu dog pixel art 64x64 side view jumping playing excited paws up orange brown white game character"
}

for name, desc in sprites.items():
    print(f"\n=== Generating {name} ===")
    raw = gen_image(desc)
    raw_path = f"{BASE}/shiba_{name}_raw.png"
    with open(raw_path, "wb") as f:
        f.write(raw)
    print(f"  Raw saved ({len(raw)} bytes). Removing bg...")
    b64 = base64.b64encode(raw).decode()
    result_b64 = remove_bg(b64)
    result_data = base64.b64decode(result_b64)
    final_path = f"{BASE}/shiba_{name}.png"
    with open(final_path, "wb") as f:
        f.write(result_data)
    print(f"  Transparent saved: {final_path} ({len(result_data)} bytes)")

print("\n=== ALL DONE ===")
