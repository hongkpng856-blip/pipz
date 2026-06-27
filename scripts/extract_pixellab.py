"""Extract PixelLab walk frames as pixel grid data"""
from PIL import Image

PICO8 = [
    (0,0,0), (29,43,83), (126,37,83), (255,119,168),
    (171,82,54), (95,87,79), (194,195,199), (255,241,232),
    (41,173,255), (255,163,0),
]

def closest_palette(r, g, b, a):
    if a < 128:
        return 6
    best = 6
    best_d = 999999
    for i, (pr, pg, pb) in enumerate(PICO8):
        d = (r-pr)**2 + (g-pg)**2 + (b-pb)**2
        if d < best_d:
            best_d = d
            best = i
    return best

frames = []
for i in range(4):
    img = Image.open(rf'C:\Users\claw\Desktop\Pipz\scripts\walk3_frame_{i}.png')
    small = img.resize((32, 32), Image.NEAREST)
    rows = []
    for y in range(32):
        row = ''
        for x in range(32):
            r, g, b, a = small.getpixel((x, y))
            row += str(closest_palette(r, g, b, a))
        rows.append(row)
    frames.append(rows)

print("const CAT: Grid[] = [")
for fi, rows in enumerate(frames):
    print(f"  // Frame {fi}")
    print("  [")
    for row in rows:
        print(f'    "{row}",')
    print("  ],")
print("]")
