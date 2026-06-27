"""Analyze PixelLab walk frame colors and fix extraction"""
from PIL import Image
import json

for fi in range(4):
    img = Image.open(rf'C:\Users\claw\Desktop\Pipz\scripts\walk3_frame_{fi}.png')
    print(f"\nFrame {fi} original size: {img.size}")
    
    # Check unique colors
    colors = img.getcolors(maxcolors=500)
    if colors:
        colors.sort(key=lambda x: -x[0])
        for count, color in colors[:10]:
            if len(color) == 4:
                r,g,b,a = color
                print(f"  #{r:02x}{g:02x}{b:02x} (a={a}) x{count}")
            else:
                print(f"  {color} x{count}")
    
    # Check scaled version
    small = img.resize((32, 32), Image.NEAREST)
    colors32 = small.getcolors(maxcolors=500)
    if colors32:
        colors32.sort(key=lambda x: -x[0])
        nontransparent = [(c, col) for c, col in colors32 if col[3] > 128]
        print(f"  After 32x32: {len(nontransparent)} non-transparent colors")
        for count, col in nontransparent[:8]:
            r,g,b,a = col
            print(f"    #{r:02x}{g:02x}{b:02x} x{count}")
