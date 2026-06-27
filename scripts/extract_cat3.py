"""Extract pixel data with proper color mapping and visual output"""
from PIL import Image

img = Image.open(r'C:\Users\claw\Desktop\Pipz\scripts\cat_reference.png')
small = img.resize((32, 32), Image.NEAREST)

# Custom color mapping for this specific cat design
def map_color(r, g, b, a):
    if a < 128:
        return '6'  # bg gray
    
    # The cat has these colors:
    # #31222c = dark outline -> use '1' (navy) for better contrast
    # #bab59e = beige body -> use '7' (beige/white) 
    # #868375 = gray shadow -> use '5' (dark gray)
    # #f49cae = pink -> use '3' (pink)
    
    # Determine which color based on thresholds
    if r < 60 and g < 50 and b < 60:  # dark brown outline
        return '4'  # brown (closer)
    elif r > 200 and g > 200 and b > 200:  # white
        return '7'  # beige
    elif r > 150 and g > 100 and b < 100:  # pink
        return '3'  # pink  
    elif r > 160 and g > 140:  # beige body
        return '7'  # beige
    elif r > 120 and g > 110:  # gray-tan shadow
        return '5'  # dark gray
    else:
        return '4'  # fallback to brown

# Let me use a better approach: use the actual color to determine which feature it is
# Based on the analysis: 
# #31222c (49,34,44) = dark brown outline
# #bab59e (186,181,158) = beige body
# #868375 (134,131,117) = gray shadow
# #f49cae (244,156,174) = pink

# Print with custom chars for readability
chars = { '6': '·', '4': '#', '7': 'O', '5': 'o', '3': 'P', '1': '@' }

rows = []
for y in range(32):
    row = ''
    visual = ''
    for x in range(32):
        r, g, b, a = small.getpixel((x, y))
        if a < 128:
            idx = '6'
        elif r < 60:  # dark outline
            idx = '4'  # brown
        elif r > 230 and g > 210:  # white/pink
            idx = '7'  # beige
        elif r > 180 and g > 170 and b < 140:  # pink
            idx = '3'
        elif r > 170 and g > 160:  # beige body
            idx = '7'
        elif r < 140 and g < 135:  # gray
            idx = '5'
        else:
            idx = '4'
        row += idx
        visual += chars.get(idx, '?')
    print(f'// y={y:2d}: {visual}')
    rows.append(row)

print("\nconst CAT: string[] = [")
for row in rows:
    print(f'    "{row}",')
print("]")
