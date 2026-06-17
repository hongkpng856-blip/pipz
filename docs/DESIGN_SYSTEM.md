# Design System

> Platform-agnostic UI specification — **Pixel Theme (Retro Game)**. iOS (SwiftUI) and Android (Jetpack Compose) agents must follow these exact values.

## Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#0b0b1a` | Page background (dark retro blue-black) |
| `card` | `#12162b` | Card background |
| `card-2` | `#1a1f38` | Secondary card / input bg |
| `border` | `#2a2f4a` | Card border (2px solid everywhere) |
| `border-2` | `#363b58` | Secondary border (inputs, inner cards) |
| `text` | `#e0e8f0` | Primary text |
| `text-2` | `#8899aa` | Secondary text |
| `text-3` | `#556677` | Muted text / labels |
| `pink` | `#ff6b9d` | Encounter flash, accent |
| `pixel-cyan` | `#44ccff` | Section titles, headers |
| `pixel-gold` | `#ffcc00` | CP value, evolution, rarity stars |
| `pixel-green` | `#33dd77` | GPS active, mood happy |
| `pixel-red` | `#ff3355` | Delete, danger, error |
| `purple` | `#8b5cf6` | Primary accent (buttons, active tab) |

## Rarity Colours

| Rarity | Hex | Label |
|--------|-----|-------|
| Common | `#9ca3af` (grey) | 普通 |
| Uncommon | `#22c55e` (green) | 罕見 |
| Rare | `#3b82f6` (blue) | 稀有 |
| Epic | `#a855f7` (purple) | 史詩 |
| Legendary | `#f59e0b` (gold) | 傳說 |

## Typography

| Style | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| Title | `Press Start 2P` | 14px | 400 | Header "Pipz" logo |
| Section | `Press Start 2P` | 10px | 400 | Section titles (e.g. "🐾 寵物") |
| Key number | `Press Start 2P` | 16px | 400 | Step counter, CP, Level |
| Badge | `Press Start 2P` | 8px | 400 | Rarity badges, stat values |
| Button | `Press Start 2P` | 7-8px | 400 | All buttons |
| Nav label | `Press Start 2P` | 6px | 400 | Bottom navigation labels |
| Body | `VT323` | 15-16px | 400 | General text, descriptions |
| Body small | `VT323` | 13-14px | 400 | Labels, hints, secondary text |

## Spacing

| Token | Value |
|-------|-------|
| Page padding | 0 10px |
| Card padding | 14px |
| Card padding (sm) | 10px |
| Section margin-bottom | 10px |
| Header padding | 10px 14px 6px |
| Grid gap | 4-6px |
| Action button gap | 6px |

## Borders

All elements use **sharp corners** (no border-radius). Pixel aesthetic requires 90° angles.

| Element | Border |
|---------|--------|
| Cards | 2px solid |
| Buttons | 2px solid |
| Progress bars | 2px solid inner |
| Bottom nav | 2px solid |
| Input fields | 2px solid |
| Modals | 2px solid |

## Shadow System

Pixel drop shadows (no blur):

```
box-shadow: 4px 4px 0 rgba(0,0,0,0.4)    /* cards */
box-shadow: 2px 2px 0 rgba(0,0,0,0.4)    /* buttons */
box-shadow: 6px 6px 0 rgba(0,0,0,0.5)    /* modals */
```

## Components

### Card
```
background: #12162b
border: 2px solid #2a2f4a
box-shadow: 4px 4px 0 rgba(0,0,0,0.4)
```

### Buttons (Pixel)

| Type | Background | Border | Text |
|------|-----------|--------|------|
| Primary | `#5b2fbe` | `#8b5cf6` | white |
| Green | `#1a6b3a` | `#33dd77` | white |
| Blue | `#1a4b8a` | `#4488ff` | white |
| Amber | `#8a5a00` | `#ffcc00` | white |
| Ghost | `#1a1f38` | `#363b58` | `#8899aa` |
| Walk (idle) | `#3b1f6e` | `#7c3aed` | white |
| Walk (active) | `#5c1010` | `#ff3355` | white |

All buttons: `font-family: Press Start 2P, font-size: 7-8px, letter-spacing: 0.3px, box-shadow: 2px 2px 0 rgba(0,0,0,0.4)`
Button press: `transform: translate(1px, 1px) + reduced box-shadow`

### Bottom Navigation
```
background: #12162b
border: 2px solid #2a2f4a
box-shadow: 0 -2px 0 rgba(0,0,0,0.3)
padding: 3px
Grid: 4 columns, equal width, gap: 1px
Active tab: background rgba(139,92,246,0.2), color #8b5cf6
Inactive: color #556677
Nav label font: Press Start 2P, 6px
```

### Progress Bar (Pixel)
```
height: 8px
border: 2px solid #363b58
background: #1a1f38
fill: linear-gradient(90deg, #8b5cf6, #22d3ee) [stats]
      linear-gradient(90deg, #f59e0b, #ffd700) [evolution]
transition: width 0.3s steps(8)  (stepped, not smooth)
```

### Walk Button (Pixel FAB)
```
width: 60px, height: 60px
border: 3px solid
font-size: 24px
box-shadow: 3px 3px 0 rgba(0,0,0,0.5), inset -2px -2px 0 rgba(0,0,0,0.3), inset 2px 2px 0 rgba(255,255,255,0.1)
On press: translate(2px, 2px), reduce outer shadow
```

### Scanline Overlay
```
html::after {
  position: fixed; inset: 0; z-index: 9999; pointer-events: none;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px
  );
}
```

### Background Grid
```
.layout {
  background:
    linear-gradient(rgba(68,204,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(68,204,255,0.03) 1px, transparent 1px);
  background-size: 16px 16px;
}
```

## Pet Card (Album / P&D-style)

```
3-column grid, gap: 4px
Card: background #12162b, border 2px solid (rarity-coloured 33% alpha)
Top strip: 3px solid rarity colour
Icon: 48x48 PixelPetCanvas
Stars: Press Start 2P, 6px, rarity-coloured (★ × 1-5)
Level: Press Start 2P, 7px, #8899aa
CP badge: absolute top-right, Press Start 2P 6px, #ffcc00, dark bg
Evolution indicator: bottom-right, ▶ amber when ready, ► grey when locked
Press: translate(1px,1px)
```

## Layout

- Mobile-first, max-width: **24rem (384px)**, centered
- Height: `100dvh`
- Fixed bottom nav (with padding, ~72px total)
- Content scrolls with `padding-bottom: 72px`
- Pixel grid background (16px grid pattern)
- Scanline overlay across entire viewport

## Animations

All animations use `step-end` / `steps(N)` timing for pixel feel (no smooth easing).

| Name | Type | Duration | Timing | Usage |
|------|------|----------|--------|-------|
| slide-up | translateY(16px) → 0 | 0.3s | steps(8) | Tab content entrance |
| pulse | opacity 1 ↔ 0.2 | 1s | step-end | GPS dot, evolving |
| wiggle | rotate(-4deg) ↔ 4deg | 0.4s | step-end | Egg shaking |
| pop-in | scale(0.5)→1.15→1 | 0.6s | steps(4) | Egg cracking |
| bounce | translateY(0) ↔ -6px | 0.5s | step-end | Sparkle particles |
| pixel-ring | scale(1)→1.1, opacity 0.3→0.05 | 2s | step-end | Walk button ring |
| fade-in | opacity 0 → 1 | 0.2s | steps(4) | Encounter flash |
| evo-glow | scale(1) ↔ 1.2 | 1s | step-end | Evolution ready arrow |
