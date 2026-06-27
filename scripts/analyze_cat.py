"""Analyze the cat reference image to find its actual pixel grid"""
from PIL import Image
import json

img = Image.open(r'C:\Users\claw\Desktop\Pipz\scripts\cat_reference.png')
print(f"Image size: {img.size}")
print(f"Image mode: {img.mode}")

# Check if it has a palette
if img.mode == 'P':
    print("Has palette!")
    palette = img.getpalette()
    print(f"Palette size: {len(palette)//3} colors")
elif img.mode == 'RGBA':
    # Check unique colors
    colors = img.getcolors(maxcolors=10000)
    if colors:
        print(f"Unique colors: {len(colors)}")
        # Sort by count (descending)
        colors.sort(key=lambda x: -x[0])
        for count, color in colors[:20]:
            print(f"  #{color[0]:02x}{color[1]:02x}{color[2]:02x}{color[3]:02x} x{count}")

# Check if it's already at native pixel size
# Look at the pixel structure to find the pattern
W, H = img.size

# Try to detect if this is a scaled up image by looking at repeating pixel patterns
# Check the first row for repeating colors
print(f"\nFirst row (sampled every 10px):")
for x in range(0, W, 10):
    r, g, b, a = img.getpixel((x, 0))
    print(f"  ({x},0): #{r:02x}{g:02x}{b:02x}")
