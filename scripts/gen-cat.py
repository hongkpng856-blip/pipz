"""Generate a proper cat still sprite (side view) using Pillow geometry.
Key cat features (from online references):
- Round head (not pointed like fox)
- Short triangular ears (not long fox ears)
- Big round eyes in upper head
- Pink nose at front of face
- Whiskers (critical for cat identity)
- Oval body
- 4 short legs with paws
- Curled tail
"""
from PIL import Image

S = 24  # sprite size
img = Image.new('RGBA', (S, S), (0,0,0,0))

def px(x, y, r, g, b, a=255):
    if 0 <= x < S and 0 <= y < S:
        img.putpixel((x, y), (r, g, b, a))

def rect(x1, y1, x2, y2, r, g, b, a=255):
    for x in range(max(0,x1), min(S,x2+1)):
        for y in range(max(0,y1), min(S,y2+1)):
            px(x, y, r, g, b, a)

def circle(cx, cy, r, cr, cg, cb, fill=True):
    """Draw filled circle"""
    for y in range(S):
        for x in range(S):
            dx, dy = x-cx, y-cy
            if dx*dx + dy*dy <= r*r:
                px(x, y, cr, cg, cb)

def line(x1, y1, x2, y2, r, g, b):
    """Bresenham line"""
    dx = abs(x2 - x1)
    dy = -abs(y2 - y1)
    sx = 1 if x1 < x2 else -1
    sy = 1 if y1 < y2 else -1
    err = dx + dy
    x, y = x1, y1
    while True:
        px(x, y, r, g, b)
        if x == x2 and y == y2:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x += sx
        if e2 <= dx:
            err += dx
            y += sy

# === CAT DESIGN ===
# The cat is side-view facing RIGHT
# Position: roughly in a 24x24 box

# Colors
OUTLINE = (26, 26, 46)    # #1a1a2e
ORANGE = (232, 131, 58)   # #e8833a
ORANGE_LT = (240, 160, 96) # #f0a060
ORANGE_DK = (192, 96, 32)  # #c06020
WHITE = (241, 225, 232)   # #fff1e8
PINK_NOSE = (255, 136, 153) # #ff8899
EYE_WHITE = (255, 255, 255) # #ffffff
EYE_PUPIL = (34, 34, 34)    # #222222
EAR_INNER = (255, 170, 170) # #ffaaaa
TAIL_ORANGE = (232, 131, 58)

# === BODY ===
# Oval body - center at (13, 15), rx=8, ry=6
for y in range(24):
    for x in range(24):
        # Body oval
        dx = (x - 13) / 8
        dy = (y - 15) / 6
        if dx*dx + dy*dy <= 1.0:
            px(x, y, *ORANGE)

# === BELLY (white underside) ===
for y in range(24):
    for x in range(24):
        dx = (x - 13) / 6.5
        dy = (y - 16) / 4.5
        if dx*dx + dy*dy <= 1.0 and y >= 13:
            px(x, y, *WHITE)

# === HEAD (round circle at left side) ===
for y in range(24):
    for x in range(24):
        dx = x - 8
        dy = y - 9
        if dx*dx + dy*dy <= 6*6:
            # Only fill if not overlapping body too much
            px(x, y, *ORANGE)

# Head lighter top
for y in range(24):
    for x in range(24):
        dx = x - 8
        dy = y - 10
        if dx*dx + dy*dy <= 4*4 and y <= 9:
            px(x, y, *ORANGE_LT)

# === WHITE FACE (lower face/chin) ===
for y in range(24):
    for x in range(24):
        dx = (x - 10) / 3.5
        dy = (y - 12) / 3
        if dx*dx + dy*dy <= 1.0 and y >= 10:
            px(x, y, *WHITE)

# === EARS (short triangles - KEY: not long like fox!) ===
# Left ear (top-left of head)
for y in range(24):
    for x in range(24):
        # Triangle: base at y=6, tip at y=2, centered at x=5
        if y >= 2 and y <= 6:
            half_base = (6 - y) // 2 + 1
            if abs(x - 5) <= half_base:
                px(x, y, *ORANGE)
                # Inner ear
                if abs(x - 5) <= half_base - 1 and y >= 3:
                    px(x, y, *EAR_INNER)

# Right ear
for y in range(24):
    for x in range(24):
        if y >= 2 and y <= 6:
            half_base = (6 - y) // 2 + 1
            if abs(x - 11) <= half_base:
                px(x, y, *ORANGE)
                if abs(x - 11) <= half_base - 1 and y >= 3:
                    px(x, y, *EAR_INNER)

# === EYES (big round eyes - key cat feature) ===
# Eye circle (white)
for y in range(24):
    for x in range(24):
        dx = x - 10
        dy = y - 9
        if dx*dx + dy*dy <= 3*3:
            px(x, y, *EYE_WHITE)
        dx = x - 6
        dy = y - 9
        if dx*dx + dy*dy <= 3*3:
            px(x, y, *EYE_WHITE)

# Pupils
for y in range(24):
    for x in range(24):
        dx = x - 11
        dy = y - 9
        if dx*dx + dy*dy <= 2*2:
            px(x, y, *EYE_PUPIL)
        dx = x - 5
        dy = y - 9
        if dx*dx + dy*dy <= 2*2:
            px(x, y, *EYE_PUPIL)

# === NOSE (small pink triangle) ===
nose_cx, nose_cy = 13, 11
for y in range(24):
    for x in range(24):
        dx = x - nose_cx
        dy = y - nose_cy
        # Small circle for nose
        if dx*dx + dy*dy <= 1.5*1.5:
            px(x, y, *PINK_NOSE)

# === MOUTH ===
# Two curved lines from nose down
line(13, 12, 11, 14, *OUTLINE)
line(13, 12, 15, 14, *OUTLINE)

# === WHISKERS (CRITICAL for cat identity!) ===
# Left side whiskers
line(10, 11, 2, 8, *WHITE)
line(10, 12, 2, 11, *WHITE)
line(10, 13, 3, 14, *WHITE)
# Right side whiskers  
line(14, 11, 22, 8, *WHITE)
line(14, 12, 22, 11, *WHITE)
line(14, 13, 21, 14, *WHITE)

# === LEGS (4 short legs) ===
# Front-left leg
for y in range(24):
    for x in range(24):
        if x >= 7 and x <= 10 and y >= 17 and y <= 21:
            px(x, y, *ORANGE)
# Front paw
for y in range(24):
    for x in range(24):
        if x >= 6 and x <= 11 and y >= 20 and y <= 22:
            dx = x - 8.5
            dy = y - 21
            if dx*dx + dy*dy <= 3*3:
                px(x, y, *WHITE)

# Front-right leg (slightly offset)
for y in range(24):
    for x in range(24):
        if x >= 10 and x <= 13 and y >= 17 and y <= 20:
            px(x, y, *ORANGE_DK)
# Front-right paw
for y in range(24):
    for x in range(24):
        if x >= 9 and x <= 14 and y >= 19 and y <= 21:
            dx = x - 11.5
            dy = y - 20
            if dx*dx + dy*dy <= 3*3:
                px(x, y, *WHITE)

# Back-left leg
for y in range(24):
    for x in range(24):
        if x >= 15 and x <= 18 and y >= 17 and y <= 21:
            px(x, y, *ORANGE)
# Back paw
for y in range(24):
    for x in range(24):
        if x >= 14 and x <= 19 and y >= 20 and y <= 22:
            dx = x - 16.5
            dy = y - 21
            if dx*dx + dy*dy <= 3*3:
                px(x, y, *WHITE)

# Back-right leg
for y in range(24):
    for x in range(24):
        if x >= 18 and x <= 21 and y >= 17 and y <= 20:
            px(x, y, *ORANGE_DK)
# Back-right paw
for y in range(24):
    for x in range(24):
        if x >= 17 and x <= 22 and y >= 19 and y <= 21:
            dx = x - 19.5
            dy = y - 20
            if dx*dx + dy*dy <= 3*3:
                px(x, y, *WHITE)

# === TAIL (curled up) ===
for y in range(24):
    for x in range(24):
        # Curved tail extending from back (x=20, y=14) curling up
        dx = x - 21
        dy = y - 10
        if dx*dx + dy*dy <= 2*2 and x >= 19:
            px(x, y, *ORANGE)
        dx = x - 22
        dy = y - 13
        if dx*dx + dy*dy <= 2*2 and x >= 20:
            px(x, y, *ORANGE)

# === OUTLINE ===
# Simple outline by darkening edges
# We'll add a cleaner outline pass

img.save(r'C:\Users\claw\Desktop\Pipz\scripts\cat_still.png')
print("Saved cat_still.png")
