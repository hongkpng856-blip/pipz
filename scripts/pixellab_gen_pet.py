"""
PixelLab Pet Generator — generates base sprite + walk/idle/play animations
Usage: python pixellab_gen_pet.py <secret> <species_name> [description]
  species_name: e.g. 'shiba' (used for output filenames)
  description: e.g. 'cute shiba inu dog, round face, perky ears, curly tail'

Steps:
  1. Generate base sprite via text-to-image (64×64, side view)
  2. Animate walk (4 frames)
  3. Animate idle (4 frames)
  4. Animate play (4 frames)
  5. Convert all frames to digit-indexed grid format for Pipz
  6. Output ready-to-copy data
"""
import requests, json, base64, os, sys, math, struct, zlib

SECRET = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("PIXELLAB_SECRET", "")
if not SECRET:
    print("ERROR: Provide secret as arg or set PIXELLAB_SECRET env var")
    sys.exit(1)

SPECIES = sys.argv[2] if len(sys.argv) > 2 else "shiba"
CUSTOM_DESC = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else None

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

headers = {
    "Authorization": f"Bearer {SECRET}",
    "Content-Type": "application/json"
}

DESCRIPTIONS = {
    "shiba": "cute shiba inu dog, round face, perky triangle ears, alert eyes, short legs, curly tail, side view, pixel art style",
    "bunny": "cute white bunny rabbit, round face, long floppy ears, pink nose, round body, tiny tail, side view, pixel art style",
    "bear": "cute brown bear cub, round face, small round ears, big eyes, round belly, short legs, side view, pixel art style",
    "fox": "cute red fox, pointy ears, sharp snout, bushy tail with white tip, small body, side view, pixel art style",
    "penguin": "cute penguin, round black and white body, orange beak, flippers, waddle stance, side view, pixel art style",
}

ANIMATE_PROMPTS = {
    "walk": {
        "shiba": "same shiba inu dog, side view, walking forward, legs moving, tail wagging, pixel art, 64x64",
        "bunny": "same white bunny, side view, hopping forward, ears bouncing, pixel art, 64x64",
        "bear": "same brown bear cub, side view, walking on all fours, pixel art, 64x64",
        "fox": "same red fox, side view, trotting forward, tail flowing, pixel art, 64x64",
        "penguin": "same penguin, side view, waddling forward, flippers out, pixel art, 64x64",
    },
    "idle": {
        "shiba": "same shiba inu dog, side view, sitting, tongue out slightly, blinking, tail wagging gently, pixel art, 64x64",
        "bunny": "same white bunny, side view, sitting up, ears twitching, nose wiggling, pixel art, 64x64",
        "bear": "same brown bear cub, side view, sitting on hind legs, looking around, pixel art, 64x64",
        "fox": "same red fox, side view, sitting, ears perked, tail curled around, blinking, pixel art, 64x64",
        "penguin": "same penguin, side view, standing, head tilting, blinking eyes, pixel art, 64x64",
    },
    "play": {
        "shiba": "same shiba inu dog, side view, jumping playfully, front paws up, tail up, excited, pixel art, 64x64",
        "bunny": "same white bunny, side view, doing a binky (happy jump), twisting in air, pixel art, 64x64",
        "bear": "same brown bear cub, side view, playfully rolling, paws batting at something, pixel art, 64x64",
        "fox": "same red fox, side view, pouncing forward, front paws stretched out, playful, pixel art, 64x64",
        "penguin": "same penguin, side view, sliding on belly, flippers out, happy, pixel art, 64x64",
    }
}

desc = CUSTOM_DESC or DESCRIPTIONS.get(SPECIES, f"cute {SPECIES}, side view, pixel art style, 64x64")

def log(msg):
    print(f"[{SPECIES}] {msg}")

def gen_base_sprite():
    """Step 1: Generate base sprite"""
    log("Generating base sprite...")
    payload = {
        "prompt": desc,
        "image_size": {"width": 64, "height": 64},
        "n_images": 1
    }
    resp = requests.post(
        "https://api.pixellab.ai/v1/images",
        headers=headers,
        json=payload,
        timeout=120
    )
    data = resp.json()
    if 'images' not in data:
        log(f"ERROR: {json.dumps(data, indent=2)[:500]}")
        return None
    
    b64 = data['images'][0]['base64']
    if b64.startswith('data:'):
        b64 = b64.split(',', 1)[1]
    path = os.path.join(OUT_DIR, f"pixellab_{SPECIES}.png")
    with open(path, 'wb') as f:
        f.write(base64.b64decode(b64))
    log(f"Base sprite saved: {path}")
    return path

def animate(action, ref_path, n_frames=4):
    """Animate reference image with given action"""
    log(f"Generating {action} animation...")
    
    with open(ref_path, 'rb') as f:
        ref_b64 = base64.b64encode(f.read()).decode('utf-8')
    
    prompt_key = ANIMATE_PROMPTS.get(action, {}).get(SPECIES, 
        f"same {SPECIES}, side view, {action} animation, pixel art, 64x64")
    
    payload = {
        "description": prompt_key,
        "action": action,
        "view": "side",
        "direction": "east",
        "image_size": {"width": 64, "height": 64},
        "reference_image": {"type": "base64", "base64": ref_b64},
        "n_frames": n_frames
    }
    
    resp = requests.post(
        "https://api.pixellab.ai/v1/animate-with-text",
        headers=headers,
        json=payload,
        timeout=120
    )
    data = resp.json()
    
    if 'images' not in data:
        log(f"ERROR: {json.dumps(data, indent=2)[:500]}")
        return []
    
    frames = []
    for i, img in enumerate(data['images']):
        b64 = img['base64']
        if b64.startswith('data:'):
            b64 = b64.split(',', 1)[1]
        path = os.path.join(OUT_DIR, f"{SPECIES}_{action}_frame_{i}.png")
        with open(path, 'wb') as f:
            f.write(base64.b64decode(b64))
        frames.append(path)
        log(f"  Frame {i}: saved")
    
    if 'usage' in data:
        log(f"Usage: {data['usage']}")
    
    return frames

def png_to_pixellab_grid(png_path, width=32, height=32):
    """
    Convert a PNG to the digit-indexed grid format used by Pipz.
    Returns a PixellabGrid (list of strings, each 32 chars).
    """
    # Read PNG pixels using pure Python (no PIL dependency)
    with open(png_path, 'rb') as f:
        png_data = f.read()
    
    # Parse PNG to get pixel data
    # PNG structure: signature + chunks (IHDR, IDAT, IEND)
    # Find IDAT chunk(s)
    pos = 8  # skip PNG signature
    chunks = []
    while pos < len(png_data):
        length = struct.unpack('>I', png_data[pos:pos+4])[0]
        chunk_type = png_data[pos+4:pos+8].decode('latin-1')
        chunk_data = png_data[pos+8:pos+8+length]
        chunks.append((chunk_type, chunk_data))
        pos += 12 + length
    
    # Get IHDR info
    ihdr_data = None
    idat_data = b''
    for chunk_type, chunk_data in chunks:
        if chunk_type == 'IHDR':
            ihdr_data = chunk_data
        elif chunk_type == 'IDAT':
            idat_data += chunk_data
    
    if not ihdr_data:
        log(f"WARN: No IHDR in {png_path}, returning empty grid")
        return None
    
    img_width = struct.unpack('>I', ihdr_data[0:4])[0]
    img_height = struct.unpack('>I', ihdr_data[4:8])[0]
    bit_depth = ihdr_data[8]
    color_type = ihdr_data[9]
    
    # Decompress IDAT
    raw_data = zlib.decompress(idat_data)
    
    # Extract pixels (simplified: assumes RGBA or RGB)
    # PixelLab API typically returns RGBA PNG
    bytes_per_pixel = 4 if color_type == 6 else 3
    stride = 1 + img_width * bytes_per_pixel  # +1 for filter byte per row
    
    # Define the Pipz palette colors (matching pixellab-cat-data.ts)
    palette = [
        '#000000', '#1d2b53', '#7e2553', '#ff77a8', '#ab5236',
        '#5f574f', '#c2c3c7', '#fff1e8', '#29adff', '#ffa300',
    ]
    
    # Map RGB to nearest palette index
    def rgb_to_hex(r, g, b):
        return f'#{r:02x}{g:02x}{b:02x}'
    
    def color_distance(c1, c2):
        r1, g1, b1 = int(c1[1:3], 16), int(c1[3:5], 16), int(c1[5:7], 16)
        r2, g2, b2 = int(c2[1:3], 16), int(c2[3:5], 16), int(c2[5:7], 16)
        return (r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2
    
    def nearest_palette_idx(r, g, b, a):
        if a < 128:
            return 6  # transparent = background index
        hex_color = rgb_to_hex(r, g, b)
        best_idx = 0
        best_dist = float('inf')
        for i, pc in enumerate(palette):
            dist = color_distance(hex_color, pc)
            if dist < best_dist:
                best_dist = dist
                best_idx = i
        return best_idx
    
    # Sample down to 32x32 grid
    grid = []
    for y in range(height):
        row_chars = []
        for x in range(width):
            # Map output coordinates to source coordinates
            src_x = int(x * img_width / width)
            src_y = int(y * img_height / height)
            row_start = src_y * stride + 1  # +1 filter byte
            
            if bytes_per_pixel == 4:
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

def extract_grids(frames, action_name):
    """Convert all frames in a list to PixellabGrid format"""
    grids = []
    for fpath in frames:
        grid = png_to_pixellab_grid(fpath)
        if grid:
            grids.append(grid)
        else:
            log(f"WARN: Failed to extract grid from {fpath}")
    return grids

def format_grid_data(grids, var_name):
    """Format grids as TypeScript code"""
    lines = [f"export const {var_name}: PixellabGrid[] = ["]
    for gi, grid in enumerate(grids):
        lines.append("  [")
        for row in grid:
            lines.append(f'    "{row}",')
        lines.append("  ]," if gi < len(grids) - 1 else "  ],")
    lines.append("]")
    return '\n'.join(lines)


# ── Main Pipeline ──
log(f"Starting PixelLab pet generation for '{SPECIES}'")

# Step 1: Base sprite
base_path = gen_base_sprite()
if not base_path:
    log("FAILED: Could not generate base sprite")
    sys.exit(1)

# Step 2: Walk animation (use base as reference)
walk_frames = animate("walk", base_path, 4)
if not walk_frames:
    log("WARN: Walk animation failed, using base sprite repeated")
    walk_frames = [base_path] * 4

# Step 3: Idle animation (use walk frame 0 as reference for consistency)
idle_ref = walk_frames[0] if walk_frames else base_path
idle_frames = animate("idle", idle_ref, 4)
if not idle_frames:
    idle_frames = [idle_ref] * 4

# Step 4: Play animation (use walk frame 0 as reference)
play_frames = animate("play", idle_ref, 4)
if not play_frames:
    play_frames = [idle_ref] * 4

# Step 5: Extract pixel grids
log("\nExtracting pixel grids...")
walk_grids = extract_grids(walk_frames, "walk")
idle_grids = extract_grids(idle_frames, "idle")
play_grids = extract_grids(play_frames, "play")

# Also extract base icon
icon_grid = png_to_pixellab_grid(base_path)

# Output
log("\n" + "="*60)
log("GENERATION COMPLETE")
log("="*60)

# Output the type definitions
print("\n// Palette (same as existing)")
print("export const PIXELAB_PALETTE = [")
palette = ['#000000', '#1d2b53', '#7e2553', '#ff77a8', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#29adff', '#ffa300']
for i, c in enumerate(palette):
    print(f"  '{c}',")
print("]")

print(f"\n// Species name map")
species_names = {"shiba": "柴犬", "bunny": "白兔", "bear": "熊仔", "fox": "紅狐", "penguin": "企鵝"}
cn_name = species_names.get(SPECIES, SPECIES)

if icon_grid:
    print(f"\n// Icon (frame 0 of idle)")
    print(format_grid_data([icon_grid], f"PIXELAB_{SPECies.upper()}_ICON"))

if walk_grids:
    print(f"\n// Walk frames ({len(walk_grids)})")
    print(format_grid_data(walk_grids, f"PIXELAB_{SPECIES.upper()}_WALK"))

if idle_grids:
    print(f"\n// Idle frames ({len(idle_grids)})")
    print(format_grid_data(idle_grids, f"PIXELAB_{SPECIES.upper()}_IDLE"))

if play_grids:
    print(f"\n// Play frames ({len(play_grids)})")
    print(format_grid_data(play_grids, f"PIXELAB_{SPECIES.upper()}_PLAY"))

log(f"\nDone! Base sprite saved as: pixellab_{SPECIES}.png")
log(f"Individual frames saved as: {SPECIES}_*_frame_*.png")
log("Copy the TypeScript output above into a new pixellab data file.")
