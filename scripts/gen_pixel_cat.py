#!/usr/bin/env python3
"""Redesigned cat — round head, short ears, BIG eyes, clear walking"""
from PIL import Image

PICO8 = [
    (0,0,0), (29,43,83), (126,37,83), (255,119,168),
    (171,82,54), (95,87,79), (194,195,199), (255,241,232),
    (41,173,255), (255,163,0),
]
# 0=black, 1=navy, 2=purple, 3=pink, 4=brown, 5=dkgray, 6=gray, 7=beige, 8=blue, 9=orange

W, H = 32, 20
BG = 6

def new():
    return [[BG]*W for _ in range(H)]

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

def tri(g, x0, y0, x1, y1, x2, y2, c):
    ys = sorted([y0, y1, y2])
    for y in range(ys[0], ys[2]+1):
        xs = []
        for (ax,ay),(bx,by) in [((x0,y0),(x1,y1)),((x1,y1),(x2,y2)),((x2,y2),(x0,y0))]:
            if ay==by: continue
            if min(ay,by)<=y<=max(ay,by):
                xs.append(int(ax + (y-ay)/(by-ay)*(bx-ax)))
        if xs:
            for x in range(min(xs),max(xs)+1): sp(g, x, y, c)

def draw_cat(frame=0):
    """
    Quadrupedal cat facing right, 32x20.
    frame: 0=contact, 1=passing, 2=contact2, 3=passing2
    Diagonal pairs: (LF,RB) and (RF,LB)
    """
    g = new()
    
    # Walk phase offsets
    # LF=left front, RF=right front, LB=left back, RB=right back
    phases = [
        (1, -1, -1, 1),    # 0: contact — LF+RB forward, RF+LB back
        (0, 0, 0, 0),      # 1: passing — neutral
        (-1, 1, 1, -1),    # 2: contact2 — RF+LB forward, LF+RB back
        (0, 0, 0, 0),      # 3: passing2 — neutral
    ]
    lf, rf, lb, rb = phases[frame]
    bob = [0, -1, 0, -1][frame]
    
    # === BODY (rounder, softer) ===
    ellipse(g, 16, 11+bob, 9, 5, 9)
    ellipse(g, 16, 13+bob, 7, 3, 7)  # belly
    
    # === HEAD (ROUNDER — bigger circle, less pointy) ===
    circle(g, 6, 10+bob, 6, 9)  # bigger head
    
    # === FACE (wider muzzle) ===
    ellipse(g, 4, 12+bob, 4, 2, 7)  # wider muzzle
    
    # === EARS (SHORTER — no longer than 4px) ===
    tri(g, 2, 5+bob, 5, 7+bob, 4, 8+bob, 1)  # left ear outline
    tri(g, 3, 6+bob, 5, 7+bob, 4, 8+bob, 9)  # fill
    sp(g, 4, 7+bob, 3)  # pink inner
    # Right ear (behind, shadow)
    tri(g, 8, 5+bob, 11, 7+bob, 10, 8+bob, 1)
    tri(g, 9, 6+bob, 11, 7+bob, 10, 8+bob, 4)
    
    # === BIG EYES (cat-like) ===
    sp(g, 3, 9+bob, 8); sp(g, 4, 9+bob, 8); sp(g, 5, 9+bob, 8)  # blue L
    sp(g, 3, 9+bob, 7); sp(g, 4, 9+bob, 7)  # white L
    sp(g, 4, 10+bob, 0)  # pupil L
    
    # === NOSE (pink triangle) ===
    sp(g, 2, 11+bob, 3)
    sp(g, 3, 11+bob, 3)
    
    # === MOUTH ===
    sp(g, 2, 12+bob, 1)
    sp(g, 3, 12+bob, 1)
    
    # === WHISKERS (long, prominent) ===
    for y in [10, 11, 12]:
        sp(g, 0, y+bob, 1)
        sp(g, 1, y+bob, 1)
    sp(g, 8, 10+bob, 1); sp(g, 9, 10+bob, 1)
    sp(g, 8, 11+bob, 1); sp(g, 9, 11+bob, 1)
    
    # === LEGS (clear diagonal alternation) ===
    # Front left leg
    rect(g, 9+lf, 15+bob, 3, 5, 9)
    rect(g, 9+lf, 19+bob, 3, 1, 7)  # paw
    
    # Front right leg
    rect(g, 13+rf, 15+bob, 3, 5, 9)
    rect(g, 13+rf, 19+bob, 3, 1, 7)
    
    # Back left leg
    rect(g, 20+lb, 15+bob, 3, 5, 9)
    rect(g, 20+lb, 19+bob, 3, 1, 7)
    
    # Back right leg
    rect(g, 24+rb, 15+bob, 3, 5, 9)
    rect(g, 24+rb, 19+bob, 3, 1, 7)
    
    # === TAIL (long, curling up) ===
    for dx in range(7):
        sp(g, 27+dx, 9+bob+dx//2, 9)
    sp(g, 33, 12+bob, 9)
    sp(g, 33, 13+bob, 9)
    sp(g, 32, 14+bob, 9)
    # Tail tip (white)
    sp(g, 33, 11+bob, 7)
    
    return g

# Generate all 4 frames
frames = [draw_cat(i) for i in range(4)]

# Save
for i, f in enumerate(frames):
    img = Image.new('RGB', (W, H), PICO8[BG])
    px = img.load()
    for y in range(H):
        for x in range(W):
            px[x, y] = PICO8[f[y][x]]
    img.resize((W*6, H*6), Image.NEAREST).save(f'/tmp/cat_v4_{i}.png')

# Sprite sheet
sheet = Image.new('RGB', (W*4*6, H*6), PICO8[BG])
for i, f in enumerate(frames):
    img = Image.new('RGB', (W, H), PICO8[BG])
    px = img.load()
    for y in range(H):
        for x in range(W):
            px[x, y] = PICO8[f[y][x]]
    sheet.paste(img.resize((W*6, H*6), Image.NEAREST), (i*W*6, 0))
sheet.save('/tmp/cat_v4_sheet.png')
print("Saved!")

# JS output
print("\nconst CAT: Grid[] = [")
for g in frames:
    print("  [")
    for row in g:
        s = ''.join(str(c) for c in row)
        print(f'    "{s}",')
    print("  ],")
print("]")

for g in frames:
    for row in g:
        for c in row:
            assert 0 <= c <= 9
print("✅ OK")
