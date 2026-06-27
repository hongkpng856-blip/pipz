"""Extract PixelLab walk frames as pixel grid for anim-test"""
from PIL import Image

PICO8 = [
    (0,0,0), (29,43,83), (126,37,83), (255,119,168),
    (171,82,54), (95,87,79), (194,195,199), (255,241,232),
    (41,173,255), (255,163,0),
]

# Map common PixelLab colors to our palette
COLOR_MAP = {
    (0,0,0): 0,        # black
    (255,255,255): 7,   # white -> beige
}

def closest_palette(r, g, b, a):
    if a < 128:
        return 6  # background
    key = (r,g,b)
    if key in COLOR_MAP:
        return COLOR_MAP[key]
    best = 6
    best_d = 999999
    for i, (pr, pg, pb) in enumerate(PICO8):
        d = (r-pr)**2 + (g-pg)**2 + (b-pb)**2
        if d < best_d:
            best_d = d
            best = i
    return best

for fi in range(4):
    img = Image.open(rf'C:\Users\claw\Desktop\Pipz\scripts\walk5_frame_{fi}.png')
    small = img.resize((32, 32), Image.NEAREST)
    rows = []
    for y in range(32):
        row = ''
        for x in range(32):
            r, g, b, a = small.getpixel((x, y))
            idx = closest_palette(r, g, b, a)
            row += str(idx)
        rows.append(row)
    # Print JS format
    print(f"  // Frame {fi}")
    print("  [")
    for row in rows:
        print(f'    "{row}",')
    print("  ],")
