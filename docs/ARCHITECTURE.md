# Pipz Architecture

## Overview

Pipz is a mobile-first web app where users walk in real life to hatch and evolve AI-generated pixel pets. The architecture is designed to be **platform-agnostic** — the same game logic and data model can be reused for iOS and Android native apps.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (React 19) |
| Language | TypeScript |
| Styling | Pure custom CSS (no Tailwind) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Password + Magic Link) |
| Email | Brevo SMTP |
| Hosting | Vercel (auto-deploy from GitHub main) |
| PWA | Service worker + Manifest (standalone, iOS home screen) |
| Icon generation | Sharp (lightning SVG → 192/512 PNG) |
| Map tiles | CartoDB Voyager (Google Maps-style, clean light tiles, no API key needed) |
| Monorepo | npm workspaces |

## Project Structure

```
Pipz/
├── apps/
│   └── web/                    # Next.js web app
│       ├── src/
│       │   ├── app/
│   │   │   ├── page.tsx            # Main page (5 tabs)
│       │   │   ├── layout.tsx          # Root layout
│       │   │   ├── auth-modal.tsx       # Login modal
│       │   │   ├── auth-wrapper.tsx     # Auth guard wrapper
│       │   │   ├── globals.css         # All styles
│       │   │   ├── not-found.tsx       # 404 page
│       │   │   └── api/auth/callback/route.ts  # Server-side Auth callback
│       │   ├── components/
│       │   │   ├── PixelPet.tsx         # (deprecated) Old SVG pet
│       │   │   ├── PixelPetCanvas.tsx   # Canvas pet renderer + animation
│       │   │   ├── RealMap.tsx          # Leaflet GPS map with pixel art pet marker
│       │   │   ├── EventModal.tsx       # Roguelike event popup
│       │   │   ├── InventoryModal.tsx   # Equipment/consumables modal
│       │   │   ├── ProfileModal.tsx     # User profile modal
│       │   │   ├── NotificationModal.tsx# Notification popup
│       │   │   └── PetDetailModal.tsx   # Pet detail screen
│       │   └── lib/
│       │       ├── auth-context.tsx     # Auth provider + hooks
│       │       ├── supabase-client.ts   # Supabase client factory
│       │       └── supabase-db.ts       # DB CRUD operations
│       ├── public/
│       │   ├── manifest.json        # PWA manifest
│       │   ├── sw.js                # Service worker (cache-first static)
│       │   ├── icon-192.png         # PWA app icon
│       │   ├── icon-512.png         # PWA app icon (high-res)
│       │   ├── favicon.svg          # Browser tab icon
│       │   └── pixel-gen/
│       │       └── sprites/         # 50 PICO-8 dithered PNG sprites (0-49.png)
│       ├── scripts/
│       │   └── gen-icons.mjs        # Generate PNG icons via Sharp
│       └── next.config.ts           # Next.js config
│
├── packages/
│   └── core/                    # Cross-platform game logic
│       └── src/
│           ├── types/           # Data model interfaces
│           ├── formulas/        # Game formulas
│           ├── utils/           # Utility functions
│           └── pixel-gen/       # Procedural pixel art generator
│
├── supabase-schema.sql          # Database schema
├── VERSION                      # Current version
└── CHANGELOG.md                 # Version history
```

## Data Flow

```
User walks (GPS) → Step counter → Encounter system → Spawn pet
                                                    ↓
User interacts ← Pet displayed ← Pet stored in Supabase
    ↓
Feed / Pet / Play → Mood + XP updates → Evolution check
```

### Map Marker Data Flow (v0.15.0+)

```
activePet (from page.tsx state) 
  → RealMap props
    → buildPetIcon() 
      → petSpriteDataUrl(pet)
        → generatePixelPet({ seed, rarity, evolutionStage })
        → drawPixelGrid(canvas, grid, pixelSize)
        → canvas.toDataURL() (base64 PNG)
      → L.divIcon({ html: `<img src="${dataUrl}">` })
    → marker.setIcon(divIcon)
```

## Auth Flow

```
1. User opens app → AuthProvider checks session
2. Not logged in → AuthModal (Password tab / Magic Link tab)
3. Password login → signInWithPassword(email, password)
4. Password register → signUp(email, password) → auto sign-in
5. Magic Link → signInWithOtp(email) → email with link
6. Click link → callback route → client-side exchangeCodeForSession
7. Session restored → onAuthStateChange → user available
```

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| Pure CSS | Tailwind v4 broke mid-project |
| Brevo SMTP | Free tier, no domain required |
| Vercel | Free hosting, auto-deploy from GitHub |
| Canvas pixel art | Free, no API key needed for procedural fallback; PICO-8 PNG sprites via Pollinations.ai for primary display; `generatePixelPet()` + `drawPixelGrid()` on Leaflet map marker via canvas `toDataURL()` |
| Monorepo | Core logic reusable across platforms |
| Client-side auth callback | Server-side always returned null user |
|| Server API route for cross-user data | `/api/market` uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for market |
|| Property system API | `/api/properties` (GET/POST/DELETE) uses `SUPABASE_SERVICE_ROLE_KEY` for ownership checks, buying, and selling across users. Client-side `supabase-db.ts` also has direct Supabase functions (`loadProperties`, `buyProperty`, `sellProperty`) that rely on RLS. |
| Env vars via vercel.json | `SUPABASE_SERVICE_ROLE_KEY` set in `vercel.json` at project root + `apps/web/.env.production` for Next.js |
| **React Portal for all modals** | Leaflet GPU compositing (`translate3d`) creates stacking context that overrides CSS z-index. All full-screen modals render via `createPortal()` to `document.body` to escape `.layout`'s stacking context. Modal CSS class `.fixed-modal-layer` uses `z-index: 9999; isolation: isolate` to ensure it renders above Leaflet tile pane (internal z-index 200). |

## Critical Patterns (Cross-Platform)

### CSS `!important` Discipline
- **Only use `!important` on `position: fixed` and `z-index`** — these must always win
- **Never use `!important` on positioning properties** (`inset`, `top`, `left`, `right`, `bottom`) — individual modal components need to override these for layout (e.g., notification modal needs `bottom: 85px` for nav space)
- Violation: `.fixed-modal-layer` had `inset: 0 !important` which blocked inline `bottom: 85px` from working

### iOS Stacking Context Golden Rules
1. **`position: fixed` inside `transform`/`will-change` ancestors** breaks on iOS Safari — the fixed element attaches to the transformed ancestor instead of the viewport
2. **Leaflet tiles use GPU compositing** (`translateZ(0)`) that creates a layer above regular positioned elements — always use `z-index: 9999` for overlays
3. **`body { overflow: hidden }` + `position: fixed`** causes iOS PWA click dead zones — use `overflow: hidden` on body, never `position: fixed`
4. **React Portal (`createPortal` to `document.body`)** is the only reliable way to escape Leaflet/transform stacking contexts

### Leaflet Stacking Context (iOS-specific)
- Leaflet internally uses `z-index: 200` on `.leaflet-tile-pane` and `translate3d` on tiles
- `position: fixed` overlays need `z-index` **above 200** to appear above the map
- Even with correct z-index, iOS may still render fixed elements behind Leaflet if any ancestor has `will-change`, `transform`, or `-webkit-overflow-scrolling`
- Solution: render modals as direct children of `document.body` (React createPortal) with `isolation: isolate`

## Deployment

- GitHub repo → `git push main` → Vercel auto-deploys
- Production URL: https://pipz-ivory.vercel.app/
- GitHub Pages: https://hongkpng856-blip.github.io/pipz/
- Supabase project: mxbuffmxvyuioidjzaet
- Supabase SMTP: Brevo (smtp-relay.brevo.com:587)
