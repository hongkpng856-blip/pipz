# Design System

> Platform-agnostic UI specification. iOS (SwiftUI) and Android (Jetpack Compose) agents should follow these exact values.

## Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#0b1120` | Page background |
| `card` | `#141b2d` | Card background |
| `card-2` | `#1a2338` | Secondary card / input bg |
| `border` | `#1e2a45` | Card border |
| `border-2` | `#2a3a5a` | Secondary border (inputs, inner cards) |
| `text` | `#f0f4f8` | Primary text |
| `text-2` | `#94a5b8` | Secondary text |
| `text-3` | `#5a6d85` | Muted text / labels |
| `purple` | `#8b5cf6` | Primary accent (buttons, active tab) |
| `cyan` | `#22d3ee` | Secondary accent (progress fill) |
| `amber` | `#f59e0b` | CP value, evolution |
| `green` | `#22c55e` | Success, GPS active |
| `red` | `#ef4444` | Error, logout, stop |
| `purple-gradient` | `linear-gradient(135deg, #8b5cf6, #7c3aed)` | Primary buttons |
| `evo-gradient` | `linear-gradient(135deg, #f59e0b, #d97706)` | Evolution button |

## Rarity Colours

| Rarity | Hex | Label |
|--------|-----|-------|
| Common | `#9ca3af` (grey) | 普通 |
| Uncommon | `#22c55e` (green) | 罕見 |
| Rare | `#3b82f6` (blue) | 稀有 |
| Epic | `#a855f7` (purple) | 史詩 |
| Legendary | `#f59e0b` (gold) | 傳說 |

## Mood Emojis

| Mood | Emoji |
|------|-------|
| happy | 😊 |
| excited | 🤩 |
| hungry | 🍽️ |
| sleepy | 😴 |
| sad | 😢 |

## Typography

| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| Title | 18px | 800 | Header "Pipz" logo |
| Header | 14px | 700 | Section titles |
| Body | 13px | 400 | General text |
| Small | 11px | 500 | Stats, badges |
| Tiny | 9-10px | 400 | Labels, progress text, timestamps |
| Steps | 20px | 700 | Step counter numbers |

Font family: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

## Spacing

| Token | Value |
|-------|-------|
| Page padding | 0 12px |
| Card padding | 16px |
| Card padding (sm) | 12px |
| Section margin-bottom | 10px |
| Header padding | 12px 16px 8px |
| Grid gap | 8px |
| Action button gap | 8px |

## Border Radius

| Element | Radius |
|---------|--------|
| Cards | 16px |
| Secondary cards | 12px |
| Buttons | 20px (pill) |
| Bottom nav | 18px |
| Input | 12px |
| Badge | 20px |
| Avatar/glow circle | 50% |

## Components

### Card
```
background: #141b2d
border: 1px solid #1e2a45
border-radius: 16px
box-shadow: 0 0 20px rgba(139, 92, 246, 0.06)
```

### Secondary Card (`card-2`)
```
background: #1a2338
border: 1px solid #2a3a5a
border-radius: 12px
```

### Buttons

| Type | Background | Text | Border |
|------|-----------|------|--------|
| Primary | `linear-gradient(135deg, #8b5cf6, #7c3aed)` | white | none |
| Green | `#16a34a` | white | none |
| Blue | `#2563eb` | white | none |
| Amber | `#d97706` | white | none |
| Ghost | `#1a2338` | `#94a5b8` | none |
| Walk (active) | `linear-gradient(145deg, #dc2626, #b91c1c)` | white | none |
| Walk (idle) | `linear-gradient(145deg, #7c3aed, #6d28d9)` | white | none |

All buttons: `border: none, cursor: pointer, font-family: inherit`

### Bottom Navigation
```
background: #141b2d
border: 1px solid #1e2a45
border-radius: 18px
padding: 4px
Grid: 4 columns, equal width
Active tab: background rgba(139,92,246,0.3), color #c084fc
Inactive: color #5a6d85
```

### Progress Bar
```
height: 6px (standard) / 8px (evolution)
border-radius: 3px / 4px
background: #1a2338
fill: linear-gradient(90deg, #8b5cf6, #22d3ee) [stats]
       linear-gradient(90deg, #f59e0b, #ffd700) [evolution]
transition: width 0.3s ease
```

### Input Fields
```
background: #1a2338
border: 1px solid #2a3a5a
border-radius: 12px
padding: 10px 14px
color: #f0f4f8
font-size: 14px
```

### Walk Button (FAB)
```
width: 64px, height: 64px
border-radius: 50%
font-size: 28px
box-shadow: 0 4px 20px rgba(124,58,237,0.35), inset 0 -3px 6px rgba(0,0,0,0.3)
On press: transform: scale(0.92)
Ring animation: ::after pseudo-element, 2.5s pulse
```

## Layout

- Mobile-first, max-width: **24rem (384px)**, centered
- Height: `100dvh`
- Fixed bottom nav (62px height with padding)
- Content scrolls with `padding-bottom: 62px`
- Header sticky top

## Animations

| Name | Type | Duration | Usage |
|------|------|----------|-------|
| slide-up | translateY(12px) → translateY(0) | 0.35s | Tab content entrance |
| pulse | opacity 1 → 0.3 → 1 | 1s | GPS dot, egg hatching |
| wiggle | rotate(-3deg) ↔ rotate(3deg) | 0.4s | Egg shaking |
| pop-in | scale(0.5) → scale(1.2) → scale(1) | 0.6s | Egg cracking |
| bounce | translateY(0) → translateY(-8px) | 0.5s | Sparkle particles |
| ring-pulse | scale(1)→scale(1.2), opacity 0.3→0.05 | 2.5s | Walk button ring |
| fade-in | opacity 0 → 1 | 0.25s | Encounter flash |
| scale-down | scale(1) → scale(0.92) | 0.15s | Button press feedback |

## Pet Canvas (PixelPetCanvas)

- Canvas element with `image-rendering: pixelated`
- Default size: 16x16 pixel grid + 60px padding (width) + 30px padding (height)
- Pixel size parameter: 2.8 (small), 3.2 (grid), 5 (normal), 6 (large)
- Glow effect via `ctx.shadowColor` + `ctx.shadowBlur` for legendary/epic pets

### Animation States

| State | Behaviour |
|-------|-----------|
| `idle` | Gentle vertical bob (sin * 1.5px) |
| `walk` | Left/right movement (20px range) + bounce (sin * 3px) |
| `happy` | Vertical bounce in place (sin * 6px) |
| `jump` | Sudden upward motion (bounce * 15px), decays over time |

## Pet Detail Modal

- Full-screen overlay (position: fixed, inset: 0)
- Content constrained to `max-width: 24rem`, centered
- Background: `#0b1120`
- Header with back arrow + title
- Scrollable content with card sections
- Each section: `margin-bottom: 12px`
