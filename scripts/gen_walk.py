"""Generate 4-frame quadruped walk cycle from base cat pixel data.
Walk cycle principles:
- Contact: diagonal legs extended (FL+BR forward, FR+BL back)
- Passing: legs crossing, body at highest
- Legs move in diagonal pairs (FL+BR together, FR+BL together)
- Body bobs: lowest at contact, highest at passing
"""
import json

# Base cat grid (front-facing, rows as strings of color indices)
BASE = [
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666466666666666666466666666",
    "66666664746666666666664746666666",
    "66666664774466666666447746666666",
    "66666664747744666644774746666666",
    "66666664744774444447744746666666",
    "66666664747575577557574746666666",
    "66666664775775755757757746666666",
    "66666666477755755755777466666666",
    "66666664777777777777777746666666",
    "66666664777747777777477746666666",
    "66666664775777774777775744466666",
    "66666664777777447447777747466666",
    "66666666477777777777777447546666",
    "66666666647777777777774647774666",
    "66666666664777777777746647554666",
    "66666666644575777757544647774666",
    "66666666455777777777755447554666",
    "66666666457777777777775477746666",
    "66666666477747477474777475466666",
    "66666666477747477474777444666666",
    "66666666647547544574574666666666",
    "66666666645545544554554666666666",
    "66666666664444444444446666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
]

def str_to_grid(s):
    return [list(row) for row in s]

def grid_to_str(g):
    return [''.join(row) for row in g]

def shift_region(grid, x1, x2, y1, y2, dx, dy, bg='6'):
    """Shift a rectangular region of non-bg pixels by (dx, dy)"""
    h = len(grid)
    w = len(grid[0])
    result = [row[:] for row in grid]
    
    # Collect pixels to move
    pixels = []
    for y in range(max(0, y1), min(h, y2+1)):
        for x in range(max(0, x1), min(w, x2+1)):
            if grid[y][x] != bg:
                pixels.append((x, y, grid[y][x]))
                result[y][x] = bg
    
    # Place shifted pixels
    for x, y, val in pixels:
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h:
            result[ny][nx] = val
    
    return result

# Generate walk frames
frames = []
g0 = str_to_grid(BASE)

# Frame 0: Contact phase 1 - FL+BR forward, normal body position
# Shift left paw area left, right paw area right
f0 = [row[:] for row in g0]
frames.append(f0)

# Frame 1: Passing - legs crossing, body up
# Shift paws inward, body up 1px  
f1 = [row[:] for row in g0]
# Shift bottom section (rows 23-26) left and right paws inward
# Left paw (cols 7-14) shift right 1px
# Right paw (cols 17-24) shift left 1px
for y in range(23, 27):
    row = list(f1[y])
    # Save rightmost paw pixel and shift
    for x in range(14, 7, -1):
        if row[x] != '6' and x+1 < 32:
            row[x+1] = row[x]
            row[x] = '6'
    for x in range(17, 25):
        if row[x] != '6' and x-1 >= 0:
            row[x-1] = row[x]
            row[x] = '6'
    f1[y] = row

# Also shift the cat up by removing bottom empty rows and adding top empty
# Actually let's just shift the paw regions differently
frames.append(f1)

# Frame 2: Contact phase 2 - FR+BL forward, normal body position  
# Mirror of frame 0 but with opposite leg positions
f2 = [row[:] for row in g0]
# Shift left paw right, right paw left (opposite of frame 0)
for y in range(23, 27):
    row = list(f2[y])
    for x in range(14, 7, -1):
        if row[x] != '6' and x+1 < 32:
            row[x+1] = row[x]
            row[x] = '6'
    for x in range(17, 25):
        if row[x] != '6' and x-1 >= 0:
            row[x-1] = row[x]
            row[x] = '6'
    f2[y] = row
frames.append(f2)

# Frame 3: Passing opposite
f3 = [row[:] for row in g0]
# Shift paws opposite to frame 1
# Left paw shift left, right paw shift right
for y in range(23, 27):
    row = list(f3[y])
    for x in range(8, 15):
        if row[x] != '6' and x-1 >= 0:
            row[x-1] = row[x]
            row[x] = '6'
    for x in range(24, 16, -1):
        if row[x] != '6' and x+1 < 32:
            row[x+1] = row[x]
            row[x] = '6'
    f3[y] = row
frames.append(f3)

# Output as JS
print("const CAT: Grid[] = [")
for fi, f in enumerate(frames):
    print(f"  // Frame {fi}")
    print("  [")
    for row in grid_to_str(f):
        print(f'    "{row}",')
    print("  ],")
print("]")
