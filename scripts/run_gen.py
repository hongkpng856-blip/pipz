import json, urllib.request, base64

with open('/tmp/pl_token.txt') as f:
    TOKEN=*** genera(size=64):
    d = json.dumps({"description": desc, "image_size": {"width": size, "height": size}}).encode()
    r = urllib.request.Request("https://api.pixellab.ai/v2/create-image-pixflux",
        data=d, headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}, method='POST')
    return base64.b64decode(json.loads(urllib.request.urlopen(r, timeout=60).read())['image']['base64'])

def rm_bg(img):
    d = json.dumps({"image": base64.b64encode(img).decode()}).encode()
    r = urllib.request.Request("https://api.pixellab.ai/v2/remove-background",
        data=d, headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}, method='POST')
    return base64.b64decode(json.loads(urllib.request.urlopen(r, timeout=60).read())['image']['base64'])

for n, d in [
    ("icon", "shiba inu dog pixel art 64x64 front view standing cute orange brown white face tongue out"),
    ("walk", "shiba inu dog pixel art 64x64 side view walking 4 legs stride orange brown white"),
    ("idle", "shiba inu dog pixel art 64x64 side view sitting idle panting tongue out orange brown white"),
    ("play", "shiba inu dog pixel art 64x64 side view jumping playing excited paws up orange brown white"),
]:
    print(f"Gen {n}...", end=' ', flush=True)
    raw = gen_image(d)
    print(f"{len(raw)}b raw", end=' ', flush=True)
    trans = rm_bg(raw)
    with open(f"shiba_{n}.png", "wb") as f:
        f.write(trans)
    print(f"-> {len(trans)}b transparent")

print("ALL DONE")
