"""Extract pixel data from the cat reference PNG and generate JS code"""
from PIL import Image
import json

img = Image.open(r'C:\Users\claw\Desktop\Pipz\scripts\cat_reference.png')
# Convert to RGBA
img = img.convert('RGBA')
print(f"Image size: {img.size}")

# Get pixel data
W, H = img.size

# Define our color palette (matching the format used in page.tsx)
# We want to map the cat colors to our palette indices
# Our palette in page.tsx:
# 0: #000000 (black)
# 1: #1d2b53 (navy)
# 2: #7e2553 (purple) 
# 3: #ff77a8 (pink)
# 4: #ab5236 (brown)
# 5: #5f574f (dark gray)
# 6: #c2c3c7 (light gray - bg)
# 7: #fff1e8 (beige)
# 8: #29adff (blue)
# 9: #ffa300 (orange/gold)

# Map colors to the closest palette index
def closest_palette(r, g, b, a):
    if a < 128:
        return 6  # transparent -> bg color
    
    palette = [
        (0, 0, 0),           # 0 black
        (29, 43, 83),        # 1 navy
        (126, 37, 83),       # 2 purple
        (255, 119, 168),     # 3 pink
        (171, 82, 54),       # 4 brown
        (95, 87, 79),        # 5 dark gray
        (194, 195, 199),     # 6 light gray (bg)
        (255, 241, 232),     # 7 beige/white
        (41, 173, 255),      # 8 blue
        (255, 163, 0),       # 9 orange
    ]
    
    best = 0
    best_dist = float('inf')
    for i, (pr, pg, pb) in enumerate(palette):
        dist = (r-pr)**2 + (g-pg)**2 + (b-pb)**2
        if dist < best_dist:
            best_dist = dist
            best = i
    return best

# Output as JS array
rows = []
for y in range(H):
    row_str = ''
    for x in range(W):
        r, g, b, a = img.getpixel((x, y))
        idx = closest_palette(r, g, b, a)
        row_str += str(idx)
    rows.append(row_str)

print("const CAT: Grid[] = [")
print("  [")
for row in rows:
    print(f'    "{row}",')
print("  ],")
print("]")
print(f"\nDimensions: {W}x{H}")
