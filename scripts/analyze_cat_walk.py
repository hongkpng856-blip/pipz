"""Analyze the OpenGameArt cat sprite sheet - it should have walk cycle frames"""
from PIL import Image

img = Image.open(r'C:\Users\claw\Desktop\Pipz\scripts\cat_walk_ref.png')
print(f"Size: {img.size}")
print(f"Mode: {img.mode}")

# Downscale and check if it has multiple frames or is a sprite sheet
W, H = img.size

# Check unique colors
colors = img.getcolors(maxcolors=5000)
if colors:
    print(f"\nUnique colors: {len(colors)}")
    colors.sort(key=lambda x: -x[0])
    for count, color in colors[:15]:
        if img.mode == 'RGBA':
            print(f"  #{color[0]:02x}{color[1]:02x}{color[2]:02x} (a={color[3]}) x{count}")
        else:
            print(f"  {color} x{count}")

# Check if it might be a sprite sheet by looking for repeating patterns
# Look at the image visually by sampling
print(f"\nSize: {W}x{H}")
if W > 64 or H > 64:
    print("This might be a sprite sheet or scaled image")
    
# Try to find the frame size by looking for repeating patterns
# Check first row for color changes
print(f"\nFirst row color changes:")
prev = None
changes = 0
for x in range(W):
    curr = img.getpixel((x, 0))
    if curr != prev:
        changes += 1
        prev = curr
print(f"Color changes in row 0: {changes}")

# Check if it's minified (scaled down) pixel art
# Sample 64x64 area
small = img.resize((64, 64), Image.NEAREST)
small.save(r'C:\Users\claw\Desktop\Pipz\scripts\cat_walk_64.png')
print("\nSaved 64x64 version as cat_walk_64.png")

# Also check the preview images
print("\nPreview URLs:")
print("https://opengameart.org/sites/default/files/pixel_cat.png")
