#!/usr/bin/env python3
"""Generate quadrupedal cat walk cycle using Pillow geometry.
Produces 32x20 side-view cat with 4 walk frames (contact→passing cycle).
Diagonal leg pairs: LF+RB, RF+LB
"""
from PIL import Image

PICO8 = [
    (0,0,0),        # 0 black
    (29,43,83),     # 1 navy outline
    (126,37,83),    # 2 purple
    (255,119,168),  # 3 pink
    (171,82,54),    # 4 brown
    (95,87,79),     # 5 dark gray
    (194,195,199),  # 6 gray bg
    (255,241,232),  # 7 beige
    (41,173,255),   # 8 blue
    (255,163,0),    # 9 orange
]

W, H = 32, 20
BG = 6

def new():
    return [[BG]*W for _ in range(H)]

def sp(g, x, y, c):
    if 0 <= x < W and 0 <= y < H:
        g[y][x] = c

def ellipse(g, cx, cy, rx, ry, c):
    for dy in range(-ry, ry+1):
        for dx in range(-rx, rx+1):
            if (dx/rx)**2 + (dy/ry)**2 <= 1:
                sp(g, cx+dx, cy+dy, c)

def circle(g, cx, cy, r, c):
    for dy in range(-r, r+1):
        for dx in range(-r, r+1):
            if dx*dx + dy*dy <= r*r:
                sp(g, cx+dx, cy+dy, c)

def rect(g, x, y, w, h, c):
    for dy in range(h):
        for dx in range(w):
            sp(g, x+dx, y+dy, c)

def quad_cat(leg_phase=0):
    """Draw quadrupedal cat side-view, 32x20.
    leg_phase: 0=contact(LF+RB), 1=passing, 2=contact(RF+LB), 3=passing
    """
    g = new()
    # LF, RF, LB, RB offsets per phase
    # Positive = forward (right), Negative = back (left)
    phases = [(2,-1,-1,2), (1,-1,-1,1), (-1,2,2,-1), (-1,1,1,-1)]
    lf, rf, lb, rb = phases[leg_phase]
    bob = [0, -1, 0, -1][leg_phase]  # body bob: 0=low, -1=high

    # Body (horizontal oval)
    ellipse(g, 16, 11+bob, 9, 5, 9)       # orange body
    ellipse(g, 16, 13+bob, 7, 3, 7)       # beige belly

    # Head (round, at left)
    circle(g, 6, 10+bob, 6, 9)            # orange head
    ellipse(g, 4, 12+bob, 4, 2, 7)        # beige muzzle/snout

    # Ears (short triangles at top of head - NOT long like fox!)
    # Left ear
    sp(g, 2, 6+bob, 1); sp(g, 3, 6+bob, 1);
    sp(g, 2, 7+bob, 1); sp(g, 3, 7+bob, 1); sp(g, 4, 7+bob, 1)
    sp(g, 3, 8+bob, 9); sp(g, 4, 8+bob, 9); sp(g, 5, 8+bob, 9)
    sp(g, 4, 9+bob, 9); sp(g, 5, 9+bob, 9)
    # Right ear
    sp(g, 8, 6+bob, 1); sp(g, 9, 6+bob, 1);
    sp(g, 7, 7+bob, 1); sp(g, 8, 7+bob, 1); sp(g, 9, 7+bob, 1)
    sp(g, 7, 8+bob, 9); sp(g, 8, 8+bob, 9); sp(g, 9, 8+bob, 9)
    sp(g, 7, 9+bob, 9); sp(g, 8, 9+bob, 9)

    # Eyes (big round - cat feature!)
    sp(g, 5, 9+bob, 7); sp(g, 6, 9+bob, 7)  # eye white
    sp(g, 5, 10+bob, 7); sp(g, 6, 10+bob, 7)
    sp(g, 6, 9+bob, 0)  # pupil

    # Nose (small pink)
    sp(g, 3, 11+bob, 3); sp(g, 4, 11+bob, 3)

    # Mouth lines
    sp(g, 3, 12+bob, 1); sp(g, 4, 12+bob, 1)
    sp(g, 5, 12+bob, 1); sp(g, 5, 12+bob, 1)

    # Whiskers (key cat identifier!)
    for y in [10, 11, 12]:
        sp(g, 0, y+bob, 1); sp(g, 1, y+bob, 1)  # forward whiskers
        sp(g, 2, y+bob, 7)  # lighter whisker spot

    # Tail (curling up from back)
    sp(g, 25, 12+bob, 9); sp(g, 26, 11+bob, 9); sp(g, 27, 10+bob, 9)
    sp(g, 28, 9+bob, 9); sp(g, 29, 8+bob, 9); sp(g, 30, 7+bob, 9)
    sp(g, 30, 8+bob, 9); sp(g, 31, 7+bob, 9)
    # Tail tip (beige)
    sp(g, 31, 7+bob, 7)

    # Legs with diagonal pair offsets
    # Front pair
    rect(g, 8+lf, 15+bob, 3, 4, 9)     # LF
    rect(g, 12+rf, 15+bob, 3, 4, 9)    # RF
    # Back pair
    rect(g, 20+lb, 15+bob, 3, 4, 9)    # LB
    rect(g, 24+rb, 15+bob, 3, 4, 9)    # RB

    # Paws (white)
    rect(g, 8+lf, 19+bob, 3, 1, 7)
    rect(g, 12+rf, 19+bob, 3, 1, 7)
    rect(g, 20+lb, 19+bob, 3, 1, 7)
    rect(g, 24+rb, 19+bob, 3, 1, 7)

    return g

def grid_to_img(grid, scale=4):
    sh, sw = len(grid), len(grid[0])
    img = Image.new('RGB', (sw*scale, sh*scale))
    px = img.load()
    for y in range(sh):
        for x in range(sw):
            r, g, b = PICO8[grid[y][x]]
            for dy in range(scale):
                for dx in range(scale):
                    px[x*scale+dx, y*scale+dy] = (r, g, b)
    return img

def to_js(grids, name):
    pieces = []
    for g in grids:
        rows = []
        for row in g:
            rows.append(''.join(str(c) for c in row))
        pieces.append(rows)
    print(f"const {name}: Grid[] = [")
    for pi, rows in enumerate(pieces):
        print(f"  // Frame {pi}")
        print("  [")
        for r in rows:
            print(f'    "{r}",')
        print("  ],")
    print("]")

# Generate 4 walk frames
WALK = [quad_cat(i) for i in range(4)]

# Save preview
sheet = Image.new('RGB', (W*4*2, H*2))
for i, frame in enumerate(WALK):
    img = grid_to_img(frame, 2)
    sheet.paste(img, (i*W*2, 0))
sheet.save(r'C:\Users\claw\Desktop\Pipz\scripts\quad_cat_sheet.png')

# Output JS
to_js(WALK, "CAT")
print(f"// Sheet saved: quad_cat_sheet.png ({W}x{H})")
