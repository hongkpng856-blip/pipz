"""Downscale the cat reference to 32x32 and extract pixel data as JS array"""
from PIL import Image

img = Image.open(r'C:\Users\claw\Desktop\Pipz\scripts\cat_reference.png')
# Downscale to 32x32 using NEAREST (preserves pixel edges)
small = img.resize((32, 32), Image.NEAREST)
small.save(r'C:\Users\claw\Desktop\Pipz\scripts\cat_32.png')

# Color mapping for our palette
# Our target palette indices we'll use in page.tsx:
# 0: #000000 -> not needed
# 1: #1d2b53 -> not needed  
# 2: #7e2553 -> not needed
# 3: #ff77a8 -> pink
# 4: #ab5236 -> brown
# 5: #5f574f -> dark gray
# 6: #c2c3c7 -> light gray (bg)
# 7: #fff1e8 -> beige/white
# 8: #29adff -> blue
# 9: #ffa300 -> orange

# Actually let's use a custom palette that matches the cat colors better
# Reference cat colors:
# transparent = bg
# #bab59e = beige/tan (main body)
# #31222c = dark brown (outline)
# #868375 = gray-tan (shadow)
# #f49cae = pink (ear/nose)

# Map to our closest palette colors:
# transparent -> 6 (bg gray)
# beige/tan -> 9 (orange/gold - closest warm color) 
# dark brown -> 4 (brown)
# gray-tan -> 5 (dark gray)
# pink -> 3 (pink)

# Actually the colors don't map well to our PICO-8 palette.
# Let me extract the raw 32x32 grid as hex colors and we'll work with that.

print("const CAT: string[] = [")
for y in range(32):
    row = ''
    for x in range(32):
        r, g, b, a = small.getpixel((x, y))
        if a < 128:
            row += '6'  # transparent = bg
        else:
            # Map to closest palette index
            hex_color = f"#{r:02x}{g:02x}{b:02x}"
            palette = [
                (0,0,0,0),
                (29,43,83,1),   # 1 navy
                (126,37,83,2),  # 2 purple
                (255,119,168,3),# 3 pink
                (171,82,54,4),  # 4 brown
                (95,87,79,5),   # 5 dark gray
                (194,195,199,6),# 6 light gray
                (255,241,232,7),# 7 beige
                (41,173,255,8), # 8 blue
                (255,163,0,9),  # 9 orange
            ]
            best = 6
            best_d = 999999
            for pr, pg, pb, idx in palette:
                d = (r-pr)**2 + (g-pg)**2 + (b-pb)**2
                if d < best_d:
                    best_d = d
                    best = idx
            row += str(best)
    print(f'    "{row}",')
print("]")

print(f"\n// Dimensions: 32x32")
print(f"// Output saved as cat_32.png")

# Also show the actual colors present
colors = small.getcolors(maxcolors=100)
print("\n// Colors found in 32x32 version:")
if colors:
    colors.sort(key=lambda x: -x[0])
    for count, color in colors:
        print(f'//   #{color[0]:02x}{color[1]:02x}{color[2]:02x} (alpha={color[3]}) x{count}')
