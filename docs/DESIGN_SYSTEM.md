# Design System

> Platform-agnostic UI specification — **VS Code Pixel Agent Theme**. iOS (SwiftUI) and Android (Jetpack Compose) agents must follow these exact values.

## Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#1e1e2e` | Page background (VS Code dark) |
| `bg-dark` | `#181828` | Header, footer, canvas bg |
| `card` | `#252535` | Card/panel background |
| `card-2` | `#2a2a3a` | Secondary card, inputs, inner panels |
| `border` | `#4a4a6a` | Card border (2px solid everywhere) |
| `border-light` | `#5a5a7a` | Hover/active border |
| `accent` | `#6030ff` | Primary accent |
| `accent-bright` | `#746fff` | Bright accent (hover, active) |
| `accent-active` | `rgb(44, 43, 109)` | Active tab / button bg |
| `text-pri` | `rgba(255,255,255,0.9)` | Primary text |
| `text-sec` | `rgba(255,255,255,0.5)` | Secondary text |
| `text-muted` | `#7a7a9a` | Muted text / labels |
| `green` | `#22c55e` | GPS active, success |
| `red` | `#ef4444` | Delete, danger |
| `amber` | `#f59e0b` | CP, evolution, rarity stars |
| `purple` | `#8b5cf6` | Legacy accent (kept for rarity) |

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
| Title | System UI (`-apple-system, 'Segoe UI', Roboto`) | 13px | 700 | Header "Pipz" logo |
| Section | System UI | 12px | 700 | Section titles |
| Key number | System UI | 18px | 700 | Step counter, CP, Level |
| Badge | System UI | 10px | 700 | Rarity badges |
| Button | System UI | 10px | 700 | All buttons |
| Nav label | System UI | 8px | 700 | Bottom navigation labels |
| Body | System UI | 11px | 400 | General text |
| Body small | System UI | 9px | 400 | Labels, hints, secondary text |

## Spacing

| Token | Value |
|-------|-------|
| Page padding | 0 8px |
| Card padding | 12px |
| Card padding (sm) | 8px |
| Section margin-bottom | 8px |
| Header padding | 8px 12px |
| Grid gap | 6px |
| Action button gap | 6px |

## Borders

All elements use **sharp corners** (no border-radius). VS Code Pixel Agent aesthetic requires 2px solid borders.

| Element | Border |
|---------|--------|
| Cards | 2px solid `#4a4a6a` |
| Buttons | 2px solid (per variant) |
| Header | 2px solid bottom |
| Modals | 2px solid |

## Shadow System

Pixel drop shadows (no blur):

```
box-shadow: 2px 2px 0px #0a0a14    /* cards, panels, buttons */
```

## Components

### Card (.card / .pixel-panel)
```
background: #252535
border: 2px solid #4a4a6a
box-shadow: 2px 2px 0px #0a0a14
```

### Canvas Card (.canvas-card)
```
background: #181828
border: 2px solid #4a4a6a
box-shadow: 2px 2px 0px #0a0a14
padding: 0, overflow: hidden
```

### Buttons

| Type | Background | Border | Text |
|------|-----------|--------|------|
| Primary | `#6030ff` | `#746fff` | white |
| Default | `#2a2a3a` | `#4a4a6a` | `rgba(255,255,255,0.9)` |
| Green | `#166534` | `#22c55e` | white |
| Blue | `#1e3a5f` | `#3b82f6` | white |
| Amber | `#5c3d0e` | `#f59e0b` | white |
| Ghost | transparent | transparent | `rgba(255,255,255,0.5)` |

All buttons: `box-shadow: 2px 2px 0px #0a0a14`, no border-radius.

### Bottom Navigation (VS Code Activity Bar style)

```
.nav-bar:
  background: #181828
  border: 2px solid #4a4a6a
  box-shadow: 2px 2px 0px #0a0a14

.nav-btn.active:
  background: rgb(44, 43, 109)   /* accent-active */
  color: #746fff                  /* accent-bright */
  box-shadow: inset 0 2px 0 #746fff
```

### Walk Button

```
background: #2a2a3a
border: 2px solid #4a4a6a
box-shadow: 2px 2px 0px #0a0a14
active: transform translate(1px, 1px), shadow 1px 1px
```

## Animations

- **Pulse**: `.gps-dot` — 1s ease-in-out infinite
- **Slide-up**: `.fade-up` — 0.3s ease-out (page transitions)
- **Pixel pulse**: `.anim-pulse` — 2s ease-in-out infinite
- **Walk**: Canvas road scroll at speed-based rate
- **Encounter**: Canvas vignette + grass part + egg appear + sparkles
