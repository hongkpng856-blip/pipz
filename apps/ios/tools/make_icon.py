"""生成 Pipz app icon（1024x1024 PNG）— 純 stdlib，像素風 creature。"""
import zlib, struct, os

SIZE = 64          # 設計格
SCALE = 16         # 放大到 1024

BG      = (0x0B, 0x10, 0x20)
BG_GLOW = (0x14, 0x22, 0x33)
MINT    = (0x5C, 0xE0, 0xC0)
MINT_D  = (0x2E, 0x9C, 0x84)
MINT_L  = (0x9C, 0xF0, 0xDC)
OUTLINE = (0x08, 0x0C, 0x16)
EYE     = (0x08, 0x0C, 0x16)
SHINE   = (0xF7, 0xF3, 0xE8)
GOLD    = (0xFF, 0xB3, 0x47)

grid = [[BG for _ in range(SIZE)] for _ in range(SIZE)]

def put(x, y, c):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        grid[y][x] = c

def sym(x, y, c):
    put(x, y, c)
    put(SIZE - 1 - x, y, c)

def ellipse(cx, cy, rx, ry, c):
    for y in range(cy - ry, cy + ry + 1):
        for x in range(cx - rx, cx + rx + 1):
            dx = (x - cx) / rx
            dy = (y - cy) / ry
            if dx * dx + dy * dy <= 1.0:
                put(x, y, c)

# 背景（平色，乾淨）
# 身體（對稱 blob）
body = []
for y in range(13, 53):
    for x in range(8, 32):
        dx = (x - 21) / 15.0
        dy = (y - 33) / 18.0
        if dx * dx + dy * dy <= 1.0:
            body.append((x, y))
for (x, y) in body:
    sym(x, y, MINT)

# 肚／高光
for (x, y) in body:
    if (x - 17) ** 2 / 81.0 + (y - 26) ** 2 / 42.0 <= 1.0:
        sym(x, y, MINT_L)
# 下半陰影
for (x, y) in body:
    if y > 45:
        sym(x, y, MINT_D)

# 眼（2x2 深色 + 反光）
for dx in (0, 1):
    for dy in (0, 1):
        sym(14 + dx, 33 + dy, EYE)
put(21, 36, SHINE); put(42, 36, SHINE)

# 腳
for x in (18, 19, 27):
    for y in (51, 52):
        sym(x, y, MINT_D)

# 驚喜星（右上）
put(46, 12, GOLD); put(47, 12, GOLD)
put(46, 11, GOLD); put(47, 11, GOLD)
put(48, 15, GOLD)
put(44, 15, GOLD)
put(46, 18, GOLD); put(47, 18, GOLD)
put(46, 17, GOLD); put(47, 17, GOLD)

# 外框（描邊）
def ok(x, y):
    return 0 <= x < SIZE and 0 <= y < SIZE

def filled(x, y):
    return ok(x, y) and grid[y][x] != BG and grid[y][x] != GOLD

outline_cells = []
for y in range(SIZE):
    for x in range(SIZE):
        if not filled(x, y):
            if filled(x - 1, y) or filled(x + 1, y) or filled(x, y - 1) or filled(x, y + 1):
                outline_cells.append((x, y))
for (x, y) in outline_cells:
    grid[y][x] = OUTLINE

# 放大
big = []
for y in range(SIZE):
    row = []
    for x in range(SIZE):
        row.extend([grid[y][x]] * SCALE)
    for _ in range(SCALE):
        big.append(row)

raw = b''.join(b'\x00' + bytes(v for px in row for v in px) for row in big)

def chunk(tag, data):
    return (struct.pack('>I', len(data)) + tag + data +
            struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF))

png = (b'\x89PNG\r\n\x1a\n' +
       chunk(b'IHDR', struct.pack('>IIBBBBB', SIZE * SCALE, SIZE * SCALE, 8, 2, 0, 0, 0)) +
       chunk(b'IDAT', zlib.compress(raw, 9)) +
       chunk(b'IEND', b''))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icon-1024.png')
with open(out, 'wb') as f:
    f.write(png)
print('wrote', out, len(png), 'bytes')
