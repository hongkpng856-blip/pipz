"""ObjectGenerator.swift 嘅 Python 1:1 移植，用嚟驗證生成出嚟嘅像素圖真係睇得。

輸出：contact sheet PNG（每格 20x20 sprite 放大 6x + 分類/階段標籤色帶）
"""
import zlib, struct, os

M64 = (1 << 64) - 1

class SeededRandom:
    def __init__(self, seed):
        self.state = seed if seed != 0 else 0x9E3779B97F4A7C15
    def next(self):
        self.state = (self.state + 0x9E3779B97F4A7C15) & M64
        z = self.state
        z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & M64
        z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & M64
        return z ^ (z >> 31)
    def int(self, upper):
        if upper <= 0: return 0
        return self.next() % upper
    def int_range(self, lo, hi):
        if hi <= lo: return lo
        return lo + self.int(hi - lo + 1)
    def double(self):
        return (self.next() % 1000000) / 1000000.0
    def chance(self, p):
        return self.double() < p

MAIN, LIGHT, DARK, OUTLINE, ACCENT, ACCENT2, EYE, SHINE, GLOW = 1,2,3,4,5,6,7,8,9

class Grid:
    def __init__(self, w=20, h=20):
        self.w, self.h = w, h
        self.px = [[0]*w for _ in range(h)]
    def set(self, x, y, v):
        if 0 <= x < self.w and 0 <= y < self.h and v != 0:
            self.px[y][x] = v
    def filled(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[y][x] != 0
        return False
    def set_sym(self, x, y, v):
        self.set(x, y, v); self.set(self.w-1-x, y, v)
    def hline(self, y, x0, x1, v):
        for x in range(x0, x1+1): self.set(x, y, v)
    def vline(self, x, y0, y1, v):
        for y in range(y0, y1+1): self.set(x, y, v)
    def rect(self, x0, y0, x1, y1, v):
        for y in range(y0, y1+1): self.hline(y, x0, x1, v)
    def ellipse(self, cx, cy, rx, ry, v):
        if rx <= 0 or ry <= 0: return
        for y in range(cy-ry, cy+ry+1):
            for x in range(cx-rx, cx+rx+1):
                dx = (x-cx)/rx; dy = (y-cy)/ry
                if dx*dx + dy*dy <= 1.0: self.set(x, y, v)
    def outline(self, v):
        targets = []
        for y in range(self.h):
            for x in range(self.w):
                if not self.filled(x, y):
                    if (self.filled(x-1,y) or self.filled(x+1,y)
                        or self.filled(x,y-1) or self.filled(x,y+1)):
                        targets.append((x,y))
        for x,y in targets: self.set(x, y, v)
    def fit_inside(self, margin=2):
        cells = [(x, y) for y in range(self.h) for x in range(self.w) if self.px[y][x]]
        if not cells: return
        xs = [c[0] for c in cells]; ys = [c[1] for c in cells]
        minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
        dx = dy = 0
        if minx < margin: dx = margin - minx
        elif maxx > self.w-1-margin: dx = (self.w-1-margin) - maxx
        if miny < margin: dy = margin - miny
        elif maxy > self.h-1-margin: dy = (self.h-1-margin) - maxy
        if dx == 0 and dy == 0: return
        out = [[0]*self.w for _ in range(self.h)]
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x]:
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < self.w and 0 <= ny < self.h:
                        out[ny][nx] = self.px[y][x]
        self.px = out
    def shade_columns(self):
        for x in range(self.w):
            ys = [y for y in range(self.h) if self.px[y][x]]
            if not ys: continue
            top, bot = ys[0], ys[-1]
            if self.px[top][x] == MAIN: self.px[top][x] = LIGHT
            if self.px[bot][x] == MAIN: self.px[bot][x] = DARK
    # 對稱 (中軸 9/10)
    def sym_hline(self, y, half, v): self.hline(y, 9-half, 10+half, v)
    def sym_rect(self, y0, y1, half, v):
        for y in range(y0, y1+1): self.sym_hline(y, half, v)
    def sym_ellipse(self, cy, rx, ry, v):
        self.ellipse(9, cy, rx, ry, v); self.ellipse(10, cy, rx, ry, v)
    def sym_trapezoid(self, ytop, ybot, top_half, bot_half, v):
        if ytop > ybot: return
        span = max(1, ybot-ytop)
        for y in range(ytop, ybot+1):
            t = (y-ytop)/span
            hw = round(top_half + (bot_half-top_half)*t)
            self.sym_hline(y, max(0, hw), v)

def hexc(h): return ((h>>16)&255, (h>>8)&255, h&255)
def pack(r,g,b): return (int(max(0,min(255,round(r))))<<16)|(int(max(0,min(255,round(g))))<<8)|int(max(0,min(255,round(b))))
def mix(a,b,t):
    ca, cb = hexc(a), hexc(b); k = max(0,min(1,t))
    return pack(ca[0]+(cb[0]-ca[0])*k, ca[1]+(cb[1]-ca[1])*k, ca[2]+(cb[2]-ca[2])*k)
def lighten(c,t): return mix(c, 0xFFFFFF, t)
def darken(c,t): return mix(c, 0x000000, t)

BASE = {
 'animal':[0xB08968,0x9AA07A,0xC7A98F,0x8E9BA8,0xD8C3A5,0x7E8C6A,0xC98F7A,0xA8A29E],
 'household':[0xE6E1D6,0xA8BCB0,0x9FB0C4,0xD9C3A5,0xB9A8B0,0x8FA0A8,0xCBB99A,0xE0D2BE],
 'food':[0xE8B96B,0xD9736B,0xC9A227,0xE9DCC0,0xB7744B,0xD8A0A8,0xA8B84B,0xE4C08C],
 'plant':[0x6FA35F,0x4F8A54,0x86B26B,0x3F6B4A,0x9BC07A,0x5E8F6A,0x7AA860,0x47774F],
 'tool':[0x9AA3AD,0x7C858F,0xB4BCC4,0xC9A227,0x8A8F96,0xA69E8C,0x6E767E,0xD0D4D8],
 'oddity':[0x8B6FB0,0x5E7F9E,0xA070A8,0x6E8F8A,0x9A6E8E,0x7A7F9E,0xB08FA8,0x6A6E8A],
}
TINT = {0:0x8C93A8,1:0x5CC46B,2:0x4A90D9,3:0xB25CE0,4:0xF0A020}
SAT = {0:0.10,1:0.03,2:0.0,3:-0.05,4:-0.08}

def palette(cat, rarity, rng):
    pool = BASE[cat]
    base = pool[rng.int(len(pool))]
    main = mix(base, TINT[rarity], SAT[rarity])
    light = lighten(main, 0.35); dark = darken(main, 0.30); outline = darken(main, 0.68)
    accent_pool = [0xE0A0F0,0x80E8D0,0xFFD166] if cat=='oddity' else [0xE07A5F,0x81B29A,0xF2CC8F,0x6B8CAE,0xD98CA8,0xC9A227]
    accent = accent_pool[rng.int(len(accent_pool))]
    accent2 = lighten(accent, 0.25)
    eye = darken(base, 0.75)
    glow = lighten(TINT[rarity], 0.15) if rarity >= 3 else mix(TINT[rarity], 0x101420, 0.45)
    return [0, main, light, dark, outline, accent, accent2, eye, 0xF7F3E8, glow]

def draw_ears(g, kind, head_cy, head_r, grow):
    base_x = 9 - head_r + 1
    top = max(1, head_cy - head_r)
    if kind == 0: return
    if kind == 1:
        g.set_sym(base_x+1, max(1,top-1), MAIN); g.set_sym(base_x, max(1,top-2), MAIN); g.set_sym(base_x+1, max(1,top-2), MAIN)
    elif kind == 2:
        g.set_sym(base_x, max(1,top-1), MAIN); g.set_sym(base_x+1, max(1,top-1), MAIN); g.set_sym(base_x, top, MAIN)
    elif kind == 3:
        g.vline(base_x, max(1,top-2), max(1,top-1), DARK); g.vline(19-base_x, max(1,top-2), max(1,top-1), DARK)
        g.set_sym(base_x, max(1,top-2), ACCENT)
    else:
        g.vline(9, max(1,top-2), max(1,top-1), ACCENT); g.vline(10, max(1,top-2), max(1,top-1), ACCENT)
        if grow >= 2:
            g.set(9, max(1,top-2), ACCENT2); g.set(10, max(1,top-2), ACCENT2)

def creature(rng, stage, oddity):
    g = Grid(); grow = stage
    big = grow >= 2
    body_cy = 12 if big else 13
    body_ry = 4 if big else 3 + rng.int(2)
    body_rx = (5 + rng.int(2)) if big else (4 + rng.int(2))
    head_r = 2 + rng.int(2) + (1 if big else 0)
    head_cy = body_cy - body_ry - head_r + 2
    g.sym_ellipse(body_cy, body_rx, body_ry, MAIN)
    g.sym_ellipse(head_cy, head_r, head_r, MAIN)
    if head_cy + head_r < body_cy - body_ry + 1:
        g.sym_rect(head_cy+head_r, body_cy-body_ry+1, max(1, head_r-1), MAIN)
    draw_ears(g, rng.int_range(0, 4 if oddity else 3), head_cy, head_r, grow)
    eye_x = 9 - head_r + 1
    g.set_sym(eye_x, head_cy, EYE)
    if rng.chance(0.35): g.set_sym(eye_x-1, head_cy, EYE)
    if grow >= 1 or rng.chance(0.3):
        g.set(9-head_r+2, head_cy-1, SHINE); g.set(10+head_r-2, head_cy-1, SHINE)
    legs = 4 if (body_rx >= 5 or big) else 2
    leg_top = body_cy + body_ry
    leg_bot = min(17, leg_top + 2)
    outer_x = 9 - body_rx + 2
    g.vline(outer_x, leg_top, leg_bot, DARK); g.vline(19-outer_x, leg_top, leg_bot, DARK)
    if legs == 4:
        g.vline(8, leg_top, leg_bot, DARK); g.vline(11, leg_top, leg_bot, DARK)
    tail = rng.int(4)
    if tail > 0 and not oddity:
        tx = 9 - body_rx - 1
        if tail == 1:
            g.set_sym(tx, body_cy+1, MAIN); g.set_sym(tx, body_cy+2, MAIN)
        elif tail == 2:
            g.set_sym(tx, body_cy, MAIN); g.set_sym(tx-1, body_cy-1, MAIN)
        else:
            g.hline(body_cy+2, max(1,tx-1), 9-body_rx, DARK); g.hline(body_cy+2, 10+body_rx, min(18,20-tx), DARK)
    if grow >= 1 or rng.chance(0.45):
        for _ in range(2 + rng.int(4)):
            sx = rng.int_range(9-body_rx+1, 9); sy = rng.int_range(body_cy-body_ry+1, body_cy+body_ry-1)
            if g.filled(sx, sy): g.set_sym(sx, sy, ACCENT)
    if grow >= 3 and rng.chance(0.6):
        wx = 9 - body_rx - 1
        g.set_sym(wx, body_cy-2, LIGHT); g.set_sym(wx, body_cy-1, LIGHT); g.set_sym(wx+1, body_cy-3, LIGHT)
    if grow >= 2:
        g.set(9-head_r+1, head_cy-head_r+1, LIGHT); g.set(10+head_r-1, head_cy-head_r+1, LIGHT)
    return g

SHAPES = {
 'household':['cup','bottle','lamp','clock','box','chair','brush','blob'],
 'food':['cup','blob','box','bottle'],
 'plant':['bottle','blob','cup'],
 'tool':['brush','box','lamp','chair'],
 'animal':['blob','lamp','clock'], 'oddity':['blob','lamp','clock'],
}

def cup(rng, stage):
    g = Grid(); top = 7 + rng.int(3); bot = min(17, top+5+rng.int(3))
    th = 4 + rng.int(2); bh = max(1, th-2-rng.int(2))
    g.sym_trapezoid(top, bot, th, bh, MAIN); g.sym_hline(top, th, LIGHT)
    g.sym_hline(min(19, top+1), max(0,th-1), DARK); g.sym_hline(bot, bh, DARK)
    if rng.chance(0.6):
        hx = 10+th+1; g.vline(hx, top+2, top+4, DARK); g.set(hx+1, top+2, DARK); g.set(hx+1, top+4, DARK)
    if stage >= 2: g.sym_hline(top, max(0,th-2), ACCENT)
    return g

def bottle(rng, stage):
    g = Grid(); bcy = 13 + rng.int(2); brx = 3 + rng.int(3); bry = 3 + rng.int(2)
    g.sym_ellipse(bcy, brx, bry, MAIN); nh = 1 + rng.int(2); ntop = max(1, bcy-bry-4)
    g.sym_rect(ntop, bcy-bry+1, nh, MAIN); g.sym_hline(max(0, ntop-1), nh+1, ACCENT)
    g.set(9-brx+1, bcy-1, LIGHT); g.set(10+brx-1, bcy-1, LIGHT)
    if stage >= 2: g.sym_hline(bcy+bry-1, brx-2, ACCENT2)
    return g

def lamp(rng, stage):
    g = Grid(); st = 3 + rng.int(2); sb = st + 4 + rng.int(2); th = 2 + rng.int(2); bh = 4 + rng.int(2)
    g.sym_trapezoid(st, sb, th, bh, MAIN); g.sym_hline(sb, bh, LIGHT)
    g.vline(9, sb+1, 16, DARK); g.vline(10, sb+1, 16, DARK)
    g.sym_ellipse(17, 3, 1, DARK); g.sym_hline(st, th, ACCENT)
    if stage >= 2: g.set_sym(9-bh+1, st+2, ACCENT2)
    return g

def clock(rng, stage):
    g = Grid(); r = 5 + rng.int(2); cy = 9 + rng.int(2)
    g.sym_ellipse(cy, r, r, MAIN); g.sym_ellipse(cy, r-1, r-1, LIGHT)
    g.sym_ellipse(cy, max(1,r-3), max(1,r-3), MAIN)
    g.vline(9, cy-3, cy, EYE); g.vline(10, cy-3, cy, EYE)
    g.hline(cy, 9, 12, EYE); g.hline(cy, 10, 13, EYE)
    g.set(9, cy-3, ACCENT); g.set(10, cy-3, ACCENT)
    if stage >= 2:
        g.vline(9, cy+r, min(18, cy+r+1), DARK); g.vline(10, cy+r, min(18, cy+r+1), DARK)
    return g

def box(rng, stage):
    g = Grid(); y0 = 6+rng.int(3); y1 = min(16, y0+6+rng.int(2)); half = 4+rng.int(2)
    g.sym_rect(y0, y1, half, MAIN)
    g.sym_rect(y0, y0+1, half+1, LIGHT)
    g.sym_hline(y0+2, half, DARK)
    g.sym_hline(y0+4, max(0,half-2), ACCENT)
    g.vline(9-half, y0+3, y1, DARK); g.vline(10+half, y0+3, y1, DARK)
    g.sym_hline(y1, half, DARK)
    g.set(9, max(0,y0-1), ACCENT); g.set(10, max(0,y0-1), ACCENT)
    if stage >= 2: g.sym_hline(y0+6, max(0,half-1), ACCENT2)
    return g

def chair(rng, stage):
    g = Grid(); half = 4+rng.int(2)
    g.sym_rect(6, 9, half, MAIN); g.sym_rect(10, 11, half+1, LIGHT)
    for x in [9-half-1, 9-half+2, 10+half-2, 10+half+1]:
        g.vline(x, 12, 17, DARK)
    if stage >= 2: g.sym_hline(9, half-2, ACCENT)
    return g

def brush(rng, stage):
    g = Grid(); hl = 7+rng.int(3)
    for i in range(hl):
        g.set(5+i, min(18, 17-i), DARK); g.set(6+i, min(18, 17-i), DARK)
    hx = min(15, 5+hl-2)
    g.rect(hx, 4, min(18, hx+3), 8, MAIN); g.rect(hx, 7, min(18, hx+3), 8, ACCENT)
    if stage >= 2: g.rect(min(18,hx+1), 5, min(18,hx+2), 6, LIGHT)
    return g

def blob(rng, stage):
    g = Grid(); cy = 12+rng.int(2); rx = 4+rng.int(2)+(1 if stage>=2 else 0); ry = 3+rng.int(2)
    g.sym_ellipse(cy, rx, ry, MAIN)
    g.sym_ellipse(cy-ry+1, max(1,rx-2), max(1,ry-2), LIGHT)
    g.vline(9, max(0,cy-ry-2), max(0,cy-ry), DARK); g.vline(10, max(0,cy-ry-2), max(0,cy-ry), DARK)
    g.ellipse(9, max(0,cy-ry-2), 2, 1, ACCENT); g.ellipse(10, max(0,cy-ry-2), 2, 1, ACCENT)
    if stage >= 1:
        for _ in range(1+rng.int(3)):
            x = rng.int_range(9-rx+1, 9+rx-1); y = rng.int_range(cy-ry+1, cy+ry-1)
            if g.filled(x, y): g.set(x, y, ACCENT2)
    return g

def sprite(seed, cat, stage, rarity):
    rng = SeededRandom(seed)
    pal = palette(cat, rarity, rng)
    grow = max(0, min(3, stage))
    if cat in ('animal','oddity'):
        g = creature(rng, grow, cat=='oddity')
    else:
        shape = SHAPES[cat][rng.int(len(SHAPES[cat]))]
        g = {'cup':cup,'bottle':bottle,'lamp':lamp,'clock':clock,'box':box,'chair':chair,'brush':brush,'blob':blob}[shape](rng, grow)
        if stage >= 1 and rng.chance(0.7):
            for _ in range(1+rng.int(3)):
                x = rng.int_range(5,14); y = rng.int_range(7,16)
                if g.filled(x, y): g.set(x, y, ACCENT)
        g.shade_columns()
    if not any(any(row) for row in g.px):
        g = blob(rng, grow)
    g.fit_inside(margin=1)
    g.outline(GLOW if (rarity >= 3 and grow >= 2) else OUTLINE)
    return g, pal

# ---- contact sheet ----
CELL, PAD, ZOOM = 20, 4, 6
COLS = 8
CASES = []
cats = ['animal','household','food','plant','tool','oddity']
for i in range(24):
    cat = cats[i % len(cats)]
    stage = (i // 6) % 4
    rarity = [0,1,2,3,4][i % 5]
    CASES.append((1000 + i*7919, cat, stage, rarity))

rows = (len(CASES) + COLS - 1)//COLS
W = COLS*(CELL*ZOOM + PAD) + PAD
H = rows*(CELL*ZOOM + PAD) + PAD
img = [[(0x0B,0x10,0x20)]*W for _ in range(H)]
BORDER = (0x2E,0x9C,0x84)

for idx, (seed, cat, stage, rarity) in enumerate(CASES):
    g, pal = sprite(seed, cat, stage, rarity)
    cx = PAD + (idx % COLS)*(CELL*ZOOM+PAD)
    cy = PAD + (idx // COLS)*(CELL*ZOOM+PAD)
    tint = hexc(TINT[rarity])
    for y in range(CELL*ZOOM+2):
        for x in range(CELL*ZOOM+2):
            if x < 2 or y < 2:
                img[cy+y][cx+x] = tint
    for y in range(20):
        for x in range(20):
            v = g.px[y][x]
            if v == 0: continue
            c = hexc(pal[v]) if v < len(pal) else (255,0,255)
            for dy in range(ZOOM):
                for dx in range(ZOOM):
                    img[cy+2+y*ZOOM+dy][cx+2+x*ZOOM+dx] = c

raw = b''.join(b'\x00' + bytes(v for px in row for v in px) for row in img)
def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag+data) & 0xFFFFFFFF)
png = (b'\x89PNG\r\n\x1a\n'
       + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0))
       + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sprite_sheet.png')
open(out, 'wb').write(png)
print('wrote', out, W, 'x', H, len(png), 'bytes')
print('cases:', [(c[1], 'stage%d'%c[2], 'r%d'%c[3]) for c in CASES])
