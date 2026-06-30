"""Generate PixelLab Shiba sprites: icon, walk, idle, play + remove bg"""
import json, urllib.request, base64, os

# Read token from sidecar file (not embedded directly)
script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(script_dir, 'token.txt')) as f:
    token = f.read().strip()

def gen_image(desc, size=64):
    d = json.dumps({"description": desc, "image_size": {"width": size, "height": size}}).encode()
    r = urllib.request.Request(
        "https://api.pixellab.ai/v2/create-image-pixflux",
        data=d,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method='POST'
    )
    return base64.b64decode(json.loads(urllib.request.urlopen(r, timeout=60).read())["image"]["base64"])

def rm_bg(img):
    d = json.dumps({"image": base64.b64encode(img).decode()}).encode()
    r = urllib.request.Request(
        "https://api.pixellab.ai/v2/remove-background",
        data=d,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method='POST'
    )
    return base64.b64decode(json.loads(urllib.request.urlopen(r, timeout=60).read())["image"]["base64"])

BASE = script_dir

sprites = {
    "icon": "shiba inu dog pixel art 64x64 front view standing cute orange brown white face tongue out",
    "walk": "shiba inu dog pixel art 64x64 side view walking 4 legs stride orange brown white",
    "idle": "shiba inu dog pixel art 64x64 side view sitting idle panting tongue out orange brown white",
    "play": "shiba inu dog pixel art 64x64 side view jumping playing excited paws up orange brown white",
}

for name, desc in sprites.items():
    print(f"\n=== Generating {name} ===")
    raw = gen_image(desc)
    print(f"  Raw: {len(raw)} bytes")
    trans = rm_bg(raw)
    path = os.path.join(BASE, f"shiba_{name}.png")
    with open(path, "wb") as f:
        f.write(trans)
    print(f"  Transparent saved: shiba_{name}.png ({len(trans)} bytes)")

print("\n=== ALL DONE ===")
