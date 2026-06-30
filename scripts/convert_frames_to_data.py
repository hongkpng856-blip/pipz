"""
Convert PixelLab-generated frames to PixellabGrid format for Pipz.
Usage: python convert_frames_to_data.py <species_name>
"""
import struct, zlib, os, sys

SPECIES = sys.argv[1] if len(sys.argv) > 1 else "shiba"

# Pipz palette (must match pixellab-cat-data.ts)
PALETTE = [
    '#000000', '#1d2b53', '#7e2553', '#ff77a8', '#ab5236',
    '#5f574f', '#c2c3c7', '#fff1e8', '#29adff', '#ffa300',
]

def rgb_to_hex(r, g, b):
    return f'#{r:02x}{g:02x}{b:02x}'

def color_distance(c1, c2):
    r1, g1, b1 = int(c1[1:3], 16), int(c1[3:5], 16), int(c1[5:7], 16)
    r2, g2, b2 = int(c2[1:3], 16), int(c2[3:5], 16), int(c2[5:7], 16)
    return (r1-r2)**2 + (g1-b2)**2 + (b1-b2)**2

def nearest_palette_idx(r, g, b, a):
    if a < 128:
        return 6  # transparent = background index (PICO-8 gray #c2c3c7)
    hex_color = rgb_to_hex(r, g, b)
    best_idx = 0
    best_dist = float('inf')
    for i, pc in enumerate(PALETTE):
        dr = int(hex_color[1:3], 16) - int(pc[1:3], 16)
        dg = int(hex_color[3:5], 16) - int(pc[3:5], 16)
        db = int(hex_color[5:7], 16) - int(pc[5:7], 16)
        dist = dr*dr + dg*dg + db*db
        if dist < best_dist:
            best_dist = dist
            best_idx = i
    return best_idx

def png_to_grid(png_path, target_w=32, target_h=32):
    with open(png_path, 'rb') as f:
        png_data = f.read()
    
    # Parse PNG chunks
    pos = 8
    chunks = []
    while pos < len(png_data):
        length = struct.unpack('>I', png_data[pos:pos+4])[0]
        chunk_type = png_data[pos+4:pos+8].decode('latin-1')
        chunk_data = png_data[pos+8:pos+8+length]
        chunks.append((chunk_type, chunk_data))
        pos += 12 + length
    
    # Get IHDR and IDAT
    ihdr_data = None
    idat_data = b''
    for chunk_type, chunk_data in chunks:
        if chunk_type == 'IHDR':
            ihdr_data = chunk_data
        elif chunk_type == 'IDAT':
            idat_data += chunk_data
    
    if not ihdr_data:
        print(f"WARN: no IHDR in {png_path}")
        return None
    
    img_w = struct.unpack('>I', ihdr_data[0:4])[0]
    img_h = struct.unpack('>I', ihdr_data[4:8])[0]
    bit_depth = ihdr_data[8]
    color_type = ihdr_data[9]
    
    # Decompress
    raw_data = zlib.decompress(idat_data)
    
    bpp = 4 if color_type == 6 else 3  # RGBA or RGB
    stride = 1 + img_w * bpp
    
    grid = []
    for y in range(target_h):
        row_chars = []
        for x in range(target_w):
            src_x = int(x * img_w / target_w)
            src_y = int(y * img_h / target_h)
            row_start = src_y * stride + 1
            
            if bpp == 4:
                r = raw_data[row_start + src_x * 4]
                g = raw_data[row_start + src_x * 4 + 1]
                b = raw_data[row_start + src_x * 4 + 2]
                a = raw_data[row_start + src_x * 4 + 3]
            else:
                r = raw_data[row_start + src_x * 3]
                g = raw_data[row_start + src_x * 3 + 1]
                b = raw_data[row_start + src_x * 3 + 2]
                a = 255
            
            idx = nearest_palette_idx(r, g, b, a)
            row_chars.append(str(idx))
        grid.append(''.join(row_chars))
    return grid

def format_ts(grids, var_name):
    lines = [f"export const {var_name}: PixellabGrid[] = ["]
    for gi, grid in enumerate(grids):
        lines.append("  [")
        for row in grid:
            lines.append(f'    "{row}",')
        lines.append("  ],")
    lines.append("]")
    return '\n'.join(lines)

# ── Process ──
base_dir = os.path.dirname(os.path.abspath(__file__))

animations = {
    f"{SPECIES}_icon": [os.path.join(base_dir, f"pixellab_{SPECIES}.png")],
    f"{SPECIES}_walk": [os.path.join(base_dir, f"shiba_walk_frame_{i}.png") for i in range(4)],
    f"{SPECIES}_idle": [os.path.join(base_dir, f"shiba_idle_frame_{i}.png") for i in range(4)],
    f"{SPECIES}_play": [os.path.join(base_dir, f"shiba_play_frame_{i}.png") for i in range(4)],
}

SPECIES = SPECIES  # keep as is for var naming
SPECIES_UPPER = SPECIES.upper()

for anim_name, paths in animations.items():
    print(f"\n// {'='*50}")
    grids = []
    for p in paths:
        if os.path.exists(p):
            grid = png_to_grid(p)
            if grid:
                grids.append(grid)
                print(f"// {os.path.basename(p)}: 32x32 grid OK")
            else:
                print(f"// {os.path.basename(p)}: FAILED")
        else:
            print(f"// {os.path.basename(p)}: NOT FOUND")
    
    if grids:
        if 'icon' in anim_name:
            var = f"PIXELAB_{SPECIES_UPPER}_ICON"
        elif 'walk' in anim_name:
            var = f"PIXELAB_{SPECIES_UPPER}_WALK"
        elif 'idle' in anim_name:
            var = f"PIXELAB_{SPECIES_UPPER}_IDLE"
        elif 'play' in anim_name:
            var = f"PIXELAB_{SPECIES_UPPER}_PLAY"
        else:
            var = f"PIXELAB_{SPECIES_UPPER}_{anim_name.upper()}"
        print(format_ts(grids, var))
