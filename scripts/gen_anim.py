#!/usr/bin/env python3
"""
Generate pixel art pet walk animation from Pollinations AI output.
"""
import urllib.request, urllib.parse, json, io, os, glob
from collections import Counter
from PIL import Image

PICO8 = [
    (0,0,0), (29,43,83), (126,37,83), (0,135,81),
    (171,82,54), (95,87,79), (194,195,199), (255,241,232),
    (255,0,77), (255,163,0), (255,236,39), (0,228,54),
    (41,173,255), (131,118,156), (255,119,168), (255,204,170),
]

def closest_pico8(r, g, b):
    best, best_dist = 0, 999999
    for i, (pr, pg, pb) in enumerate(PICO8):
        d = (r-pr)*(r-pr) + (g-pg)*(g-pb) + (b-pb)*(b-pb)
        if d < best_dist: best_dist, best = d, i
    return best

def quantize(img):
    img = img.convert('RGB')
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b = px[x, y]
            px[x, y] = PICO8[closest_pico8(r, g, b)]
    return img

def downscale(img, sz=32):
    w, h = img.size
    s = min(w, h)
    img = img.crop(((w-s)//2, (h-s)//2, (w+s)//2, (h+s)//2))
    return img.resize((sz, sz), Image.NEAREST)

def get_bg_color(img):
    px = img.load()
    w, h = img.size
    edges = [px[x,0] for x in range(w)] + [px[x,h-1] for x in range(w)]
    edges += [px[0,y] for y in range(h)] + [px[w-1,y] for y in range(h)]
    return Counter(edges).most_common(1)[0][0]

def create_walk_frames(img, bg):
    w, h = img.size
    px = img.convert('RGB').load()
    body = {}
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if c != bg: body[(x, y)] = c
    if not body:
        for y in range(h):
            for x in range(w): body[(x, y)] = px[x, y]
    
    min_x = min(p[0] for p in body)
    max_x = max(p[0] for p in body)
    min_y = min(p[1] for p in body)
    max_y = max(p[1] for p in body)
    cx = (min_x + max_x) // 2
    
    # Walk offsets: (shift_x, bob_y, left_leg_dy, right_leg_dy)
    walk = [(0,0,0,0), (1,1,2,-1), (0,0,0,0), (-1,1,-1,2)]
    
    frames = []
    for sx, by, ll, rl in walk:
        f = Image.new('RGB', (w, h), bg)
        fp = f.load()
        leg_top = max_y - 2
        for (x, y), c in body.items():
            nx, ny = x + sx, y + by
            if 0 <= nx < w and 0 <= ny < h:
                fp[nx, ny] = c
            # Leg animation
            if y >= leg_top:
                if x < cx and ll != 0:
                    ny2 = y + ll
                    if 0 <= ny2 < h: fp[x, ny2] = c
                if x >= cx and rl != 0:
                    ny2 = y + rl
                    if 0 <= ny2 < h: fp[x, ny2] = c
        frames.append(f)
    return frames

def create_blink(img, bg):
    f = img.copy()
    px = f.load()
    w, h = f.size
    body = {}
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if c != bg: body[(x, y)] = c
    if not body: return f
    cx = (min(p[0] for p in body) + max(p[0] for p in body)) // 2
    ey = min(p[1] for p in body) + (max(p[1] for p in body) - min(p[1] for p in body)) // 4
    for dx in range(-3, 4):
        if 0 <= cx-4+dx < w and 0 <= ey < h: px[cx-4+dx, ey] = (0,0,0)
        if 0 <= cx+4+dx < w and 0 <= ey < h: px[cx+4+dx, ey] = (0,0,0)
    return f

print("=== Step 1: Download AI base sprite ===")
prompts = [
    "pixel art cat sprite standing simple cute 8bit retro game character PICO-8 colors flat minimal",
]
for i, p in enumerate(prompts):
    url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(p)}"
    print(f"  Downloading...")
    try:
        r = urllib.request.urlopen(url, timeout=60)
        with open(f"/tmp/ai_base_{i}.png", "wb") as f: f.write(r.read())
        print(f"  OK")
    except Exception as e:
        print(f"  Error: {e}")

files = sorted(glob.glob("/tmp/ai_base_*.png"))
if not files: print("NO FILES!"); exit(1)

print(f"\n=== Step 2: Process {files[-1]} ===")
ai = Image.open(files[-1])
print(f"  Original: {ai.size}")
px32 = quantize(downscale(ai, 32))
bg = get_bg_color(px32)
print(f"  Background: {bg}")
px32.save("/tmp/pixel_32.png")

print("\n=== Step 3: Generate walk frames ===")
frames = create_walk_frames(px32, bg)
os.makedirs("/tmp/pixel_out", exist_ok=True)
for i, f in enumerate(frames):
    f.save(f"/tmp/pixel_out/frame_{i}.png")

# Sprite sheet 32x4 = 128 wide
s = Image.new('RGB', (128, 32), bg)
for i, f in enumerate(frames): s.paste(f, (i*32, 0))
s.save("/tmp/out_sheet.png")

# Animated GIF
blink = create_blink(px32, bg)
frames[0].save("/tmp/out_anim.gif", save_all=True,
    append_images=frames[1:] + [blink, blink] + [frames[0], frames[0]],
    duration=[150, 150, 150, 150, 600, 600, 150, 150],
    loop=0, disposal=2)

# Large version (4x scale)
big = Image.new('RGB', (512, 128), bg)
for i, f in enumerate(frames):
    large = f.resize((128, 128), Image.NEAREST)
    big.paste(large, (i*128, 0))
big.save("/tmp/out_sheet_large.png")

print("Files:")
for p in sorted(glob.glob("/tmp/out_*") + glob.glob("/tmp/pixel_*")):
    print(f"  {p}: {os.path.getsize(p)} bytes")
print("DONE")
