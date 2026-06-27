#!/usr/bin/env python3
"""Simple quadrupedal cat — side view, 4 legs on ground"""
from PIL import Image

PICO8 = [
    (0,0,0), (29,43,83), (126,37,83), (255,119,168),
    (171,82,54), (95,87,79), (194,195,199), (255,241,232),
    (41,173,255), (255,163,0),
]

W, H = 32, 20

def new():
    return [[6]*W for _ in range(H)]

def sp(g, x, y, c):
    if 0 <= x < W and 0 <= y < H: g[y][x] = c

def ellipse(g, cx, cy, rx, ry, c):
    for dy in range(-ry, ry+1):
        for dx in range(-rx, rx+1):
            if (dx/rx)**2 + (dy/ry)**2 <= 1: sp(g, cx+dx, cy+dy, c)

def circle(g, cx, cy, r, c):
    for dy in range(-r, r+1):
        for dx in range(-r, r+1):
            if dx*dx + dy*dy <= r*r: sp(g, cx+dx, cy+dy, c)

def rect(g, x, y, w, h, c):
    for dy in range(h):
        for dx in range(w): sp(g, x+dx, y+dy, c)

# Cat shape data: [x, y, w, h, color] for rect parts
# Or use a direct pixel map approach

g = new()

# === BODY === horizontal oval
ellipse(g, 16, 11, 9, 5, 9)     # orange body x:7-25, y:6-16

# === BELLY === lighter underside
ellipse(g, 16, 13, 7, 3, 7)      # beige belly

# === HEAD === at the front
circle(g, 7, 10, 5, 9)           # orange head

# === FACE/MUZZLE === lighter
ellipse(g, 5, 12, 3, 2, 7)       # beige muzzle

# === EARS ===
# Front ear (pointy triangle above head)
for y in range(5, 9):
    for x in range(3, 7):
        if x - 3 <= (y - 5) * 0.6 and 6 - x <= (y - 5) * 0.6:
            sp(g, x, y, 9)  # orange ear
sp(g, 4, 6, 2)  # purple inner
sp(g, 5, 6, 2)
sp(g, 4, 7, 2)
# Back ear (darker, behind)
for y in range(6, 9):
    for x in range(8, 11):
        if x - 8 <= (y - 6) * 0.5 and 10 - x <= (y - 6) * 0.5:
            sp(g, x, y, 4)  # brown (shadow) ear

# === EYE ===
circle(g, 5, 9, 2, 8)    # blue
circle(g, 5, 9, 1, 7)    # white
sp(g, 5, 9, 0)            # pupil

# === NOSE ===
sp(g, 3, 11, 3)
sp(g, 4, 11, 3)

# === MOUTH ===
sp(g, 3, 12, 1)
sp(g, 4, 12, 1)

# === WHISKERS ===
sp(g, 1, 11, 1); sp(g, 2, 11, 1)
sp(g, 1, 12, 1); sp(g, 2, 12, 1)
sp(g, 8, 10, 1); sp(g, 9, 10, 1)

# === LEGS (4 legs, all on ground at y=19) ===
# Front left leg
rect(g, 9, 14, 3, 6, 9)
# Front right leg
rect(g, 13, 14, 3, 6, 9)
# Back left leg
rect(g, 20, 14, 3, 6, 9)
# Back right leg
rect(g, 24, 14, 3, 6, 9)

# === PAW TIPS ===
rect(g, 9, 19, 3, 1, 7)
rect(g, 13, 19, 3, 1, 7)
rect(g, 20, 19, 3, 1, 7)
rect(g, 24, 19, 3, 1, 7)

# === TAIL === (curling up from back)
for dx in range(6):
    sp(g, 27+dx, 8+dx//2, 9)
sp(g, 29, 10, 9)
sp(g, 30, 11, 9)
sp(g, 30, 12, 9)
sp(g, 29, 13, 9)
# Tail tip
sp(g, 31, 11, 7)
sp(g, 31, 12, 7)

# === OUTLINE === (add minimal navy outline for definition)
# Around head
sp(g, 2, 10, 1); sp(g, 2, 11, 1)
sp(g, 12, 8, 1); sp(g, 12, 9, 1); sp(g, 12, 10, 1); sp(g, 12, 11, 1); sp(g, 12, 12, 1)
sp(g, 7, 5, 1); sp(g, 8, 5, 1)
sp(g, 6, 15, 1)

# Draw frame with leg Y shift for walk
def make_walk_frames(base_grid):
    frames = []
    # Frame definitions: (left_leg_dy, right_leg_dy, body_dy)
    # Walk: contact→passing→contact→passing
    walk_data = [
        (0, 0, 0),     # contact
        (1, -1, -1),   # passing (bob up, legs cross)
        (0, 0, 0),     # contact mirror  
        (-1, 1, -1),   # passing mirror
    ]
    
    for l_move, r_move, body_y in walk_data:
        f = [row[:] for row in base_grid]
        
        # Clear leg areas
        for y in range(14, 20):
            for x in range(9, 16):
                f[y][x] = 6
            for x in range(20, 28):
                f[y][x] = 6
        
        # Redraw legs with offset
        # Front pair
        fy = 14 + body_y
        rect(f, 9, fy + l_move, 3, 6-l_move, 9)
        rect(f, 13, fy + r_move, 3, 6-r_move, 9)
        # Paw tips
        rect(f, 9, 19, 3, 1, 7)
        rect(f, 13, 19, 3, 1, 7)
        
        # Back pair
        by = 14 + body_y
        rect(f, 20, by + r_move, 3, 6-r_move, 9)
        rect(f, 24, by + l_move, 3, 6-l_move, 9)
        # Paw tips
        rect(f, 20, 19, 3, 1, 7)
        rect(f, 24, 19, 3, 1, 7)
        
        # Tail (simplified - just redraw)
        for dx in range(7):
            sp(f, 27+dx, 8+body_y+dx//2, 9)
        sp(f, 29, 10+body_y, 9)
        sp(f, 30, 11+body_y, 9)
        sp(f, 30, 12+body_y, 9)
        sp(f, 29, 13+body_y, 9)
        sp(f, 31, 11+body_y, 7)
        sp(f, 31, 12+body_y, 7)
        
        frames.append(f)
    return frames

frames = make_walk_frames(g)

# Save images
for i, f in enumerate(frames):
    img = Image.new('RGB', (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            px[x, y] = PICO8[f[y][x]]
    img.resize((W*6, H*6), Image.NEAREST).save(f'/tmp/frame_{i}.png')

# Sprite sheet
sheet = Image.new('RGB', (W*4*6, H*6), PICO8[6])
for i, f in enumerate(frames):
    img = Image.new('RGB', (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            px[x, y] = PICO8[f[y][x]]
    sheet.paste(img.resize((W*6, H*6), Image.NEAREST), (i*W*6, 0))
sheet.save('/tmp/sheet.png')
print("Saved!")

# Output JS
print("\nconst CAT: Grid[] = [")
for g in frames:
    print("  [")
    for row in g:
        s = ''.join(str(c) for c in row)
        print(f'    "{s}",')
    print("  ],")
print("]")

# Verify
for g in frames:
    for row in g:
        for c in row:
            assert 0 <= c <= 9
print("✅ OK")
