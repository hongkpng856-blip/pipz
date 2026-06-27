#!/usr/bin/env python3
"""Generate pixel art cat PNG + walk cycle frames"""
import os
from PIL import Image

# Custom palette: put frequently used colors at indices 0-9
# 0=black, 1=navy, 2=purple, 3=pink(instead of 14), 4=brown, 
# 5=darkgray, 6=gray(bg), 7=beige, 8=blue(instead of 12), 9=orange
PICO8 = [
    (0,0,0),        # 0 black
    (29,43,83),     # 1 navy
    (126,37,83),    # 2 purple
    (255,119,168),  # 3 pink 🎯
    (171,82,54),    # 4 brown
    (95,87,79),     # 5 dark gray
    (194,195,199),  # 6 gray bg
    (255,241,232),  # 7 beige
    (41,173,255),   # 8 blue 🎯
    (255,163,0),    # 9 orange
    (255,0,77),     # 10 red
    (0,135,81),     # 11 green
    (0,228,54),     # 12 bright green
    (255,236,39),   # 13 yellow
    (131,118,156),  # 14 purple gray
    (255,204,170),  # 15 skin
]

W, H = 24, 24
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

def draw_cat(leg_offset=0, body_y=0):
    """Draw cat with optional leg offset for walk cycle"""
    g = new()
    
    # === BODY ===
    ellipse(g, 12, 17+body_y, 8, 6, 9)     # orange body
    ellipse(g, 12, 18+body_y, 5, 3, 7)     # beige belly
    
    # === HEAD ===
    circle(g, 12, 8+body_y, 6, 9)          # orange head
    ellipse(g, 12, 10+body_y, 4, 3, 7)     # beige face
    
    # === EARS ===
    # Left ear
    tri(g, 7, 0, 10, 5+body_y, 6, 5+body_y, 1)    # navy outline
    tri(g, 8, 1, 10, 4+body_y, 7, 4+body_y, 9)    # orange fill
    tri(g, 8, 2, 9, 4+body_y, 7, 4+body_y, 2)     # purple inner
    
    # Right ear
    tri(g, 14, 0, 18, 5+body_y, 17, 5+body_y, 1)
    tri(g, 14, 1, 17, 4+body_y, 16, 4+body_y, 9)
    tri(g, 15, 2, 16, 4+body_y, 14, 4+body_y, 2)
    
    # === EYES ===
    circle(g, 9, 7+body_y, 3, 8)           # blue bg
    circle(g, 9, 7+body_y, 2, 7)           # white
    circle(g, 9, 8+body_y, 1, 0)           # pupil
    
    circle(g, 15, 7+body_y, 3, 8)          # blue bg
    circle(g, 15, 7+body_y, 2, 7)          # white
    circle(g, 15, 8+body_y, 1, 0)          # pupil
    
    # === NOSE ===
    sp(g, 12, 9+body_y, 3)                 # pink
    sp(g, 11, 9+body_y, 3)
    sp(g, 13, 9+body_y, 3)
    
    # === MOUTH ===
    sp(g, 12, 10+body_y, 1)
    sp(g, 11, 11+body_y, 1)
    sp(g, 13, 11+body_y, 1)
    sp(g, 12, 11+body_y, 1)
    
    # === WHISKERS ===
    for y in [9, 10, 11]:
        sp(g, 4, y+body_y, 1)
        sp(g, 5, y+body_y, 1)
        sp(g, 6, y+body_y, 1)
        sp(g, 18, y+body_y, 1)
        sp(g, 19, y+body_y, 1)
        sp(g, 20, y+body_y, 1)
    
    # === LEGS with offset ===
    lo = leg_offset
    # Front legs
    rect(g, 7+lo, 20+body_y, 3, 4, 9)     # left front
    rect(g, 14-lo, 20+body_y, 3, 4, 9)    # right front
    # Back legs 
    rect(g, 5-lo, 21+body_y, 3, 3, 9)     # left back
    rect(g, 16+lo, 21+body_y, 3, 3, 9)    # right back
    
    # Paw tips
    rect(g, 7+lo, 23+body_y, 3, 1, 7)
    rect(g, 14-lo, 23+body_y, 3, 1, 7)
    rect(g, 5-lo, 23+body_y, 3, 1, 7)
    rect(g, 16+lo, 23+body_y, 3, 1, 7)
    
    # === TAIL ===
    for dx in range(7):
        sp(g, 19, 14+dx+body_y, 9)
    sp(g, 18, 20+body_y, 9)
    sp(g, 17, 20+body_y, 9)
    sp(g, 18, 21+body_y, 9)
    sp(g, 19, 14+body_y, 7)  # tail tip
    sp(g, 19, 15+body_y, 7)
    
    return g

def grid_to_img(grid):
    img = Image.new('RGB', (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            px[x, y] = PICO8[grid[y][x]]
    return img

# Generate base frame
print("Generating cat...")
g0 = draw_cat(leg_offset=0, body_y=0)      # Contact
g1 = draw_cat(leg_offset=1, body_y=-1)     # Passing (bob up + legs cross)
g2 = draw_cat(leg_offset=0, body_y=0)      # Contact mirrored
g3 = draw_cat(leg_offset=-1, body_y=-1)    # Passing mirrored (bob up)

# Generate run frames (more extreme)
r0 = draw_cat(leg_offset=2, body_y=0)      # Big stride
r1 = draw_cat(leg_offset=0, body_y=-2)     # Float (tucked, high)
r2 = draw_cat(leg_offset=-2, body_y=0)     # Big stride other
r3 = draw_cat(leg_offset=0, body_y=-2)     # Float

frames = [g0, g1, g2, g3]
runs = [r0, r1, r2, r3]

# Save animated sprite sheet
sheet = Image.new('RGB', (W*8, H*4))
for i, f in enumerate(frames):
    img = grid_to_img(f)
    scaled = img.resize((W*8, H*8), Image.NEAREST)
    sheet.paste(scaled, (0, i*H*8))
sheet.save('/tmp/cat_sprite_sheet.png')
print("Saved: /tmp/cat_sprite_sheet.png")

# Save individual frames for verification
for i, f in enumerate(frames):
    img = grid_to_img(f)
    img.resize((W*8, H*8), Image.NEAREST).save(f'/tmp/cat_frame_{i}.png')

# Output JS data
def to_js(grids, name):
    print(f"\nconst {name}: Grid[] = [")
    for g in grids:
        print("  [")
        for row in g:
            s = ''.join(str(c) for c in row)
            print(f'    "{s}",')
        print("  ],")
    print("]")

to_js(frames, "WALK")
to_js(runs, "RUN")

# Verify single-digit
for grids in [frames, runs]:
    for g in grids:
        for row in g:
            for c in row:
                assert 0 <= c <= 9, f"Invalid {c}"

print("\n✅ All good! Single-digit indices only.")
