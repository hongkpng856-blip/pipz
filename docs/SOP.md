# Standard Operating Procedure (SOP)

> Step-by-step guide to set up and run the Pipz project from scratch.

## Phase 1: Project Setup

```bash
# 1. Clone the repo
git clone https://github.com/hongkpng856-blip/pipz.git
cd pipz

# 2. Install dependencies
npm install
cd packages/core && npm run build && cd ../..
cd apps/web && npm install && cd ../..

# 3. Set up environment
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 4. Run database schema
# Go to Supabase Dashboard → SQL Editor → New Query
# Paste supabase-schema.sql content → Run

# 5. Fix status constraint (if schema was run with old values)
# Run in SQL Editor:
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_status_check;
ALTER TABLE public.pets ADD CONSTRAINT pets_status_check 
  CHECK (status IN ('baby','juvenile','adult','evolved','legendary'));

# 6. Configure Supabase Auth
# Supabase Dashboard → Authentication → URL Configuration
# Site URL: https://pipz-ivory.vercel.app/
# Redirect URLs: https://pipz-ivory.vercel.app/**

# 7. Configure Brevo SMTP (if not set)
# Supabase Dashboard → Authentication → SMTP Settings
# Host: smtp-relay.brevo.com
# Port: 587
# Username: [your Brevo login email]
# Password: [Brevo API key (xsmtpsib-...)]
```

## Phase 2: Development

```bash
# Start dev server
cd apps/web
npm run dev            # http://localhost:3000

# Build packages/core after changes
cd packages/core
npm run build

# Build web
cd apps/web
npx next build
```

## Phase 3: Deployment

```bash
# IMPORTANT: Always commit and push first
git add -A
git commit -m "description of changes"
git push origin main

# Vercel auto-deploys from main branch
# Production URL: https://pipz-ivory.vercel.app/

# If auto-deploy fails, deploy manually:
cd apps/web
npx vercel deploy --prod --yes
```

### Vercel Gotchas
- `vercel link --yes --project <name>` wipes existing env vars
- To set env vars: `vercel env add NEXT_PUBLIC_XXX` (interactive) or use Dashboard
- To force fresh build: rename files (e.g., login-modal.tsx → auth-modal.tsx)
- Verify deployment by curling JS chunks
- New deployment aliases may differ from old `project.vercel.app` URL

## Phase 4: Adding New Features

### Adding a New UI Screen
1. Update `COMPONENT_CATALOG.md` with screen description
2. Update `DESIGN_SYSTEM.md` with any new components/colours
3. Build the screen in `apps/web/src/app/` or as a new component
4. Wire navigation in `page.tsx`
5. Deploy → verify

### Adding a New Data Model
1. Update `DATA_MODEL.md` with new fields/types
2. Add SQL migration to `supabase-schema.sql`
3. Run migration in Supabase SQL Editor
4. Update TypeScript types in `packages/core/src/types/`
5. Update DB helpers in `apps/web/src/lib/supabase-db.ts`

### Adding a New Game Formula
1. Update `GAME_LOGIC.md` with the formula
2. Implement in `packages/core/src/formulas/`
3. Export from `packages/core/src/index.ts`
4. Build core: `cd packages/core && npm run build`
5. Use in `page.tsx`

## Phase 5: Porting to iOS/Android

### For iOS Agent (SwiftUI)
1. Read `DESIGN_SYSTEM.md` → Implement colours, fonts, spacing, components
2. Read `COMPONENT_CATALOG.md` → Build each screen
3. Read `DATA_MODEL.md` → Create Swift structs + CoreData/Realm
4. Read `GAME_LOGIC.md` → Implement all formulas in Swift
5. Read `ARCHITECTURE.md` → Understand data flow
6. Integrate Supabase Swift SDK for auth + DB

### For Android Agent (Kotlin/Jetpack Compose)
1. Read `DESIGN_SYSTEM.md` → Implement colours, typography, components
2. Read `COMPONENT_CATALOG.md` → Build each screen
3. Read `DATA_MODEL.md` → Create Kotlin data classes + Room
4. Read `GAME_LOGIC.md` → Implement all formulas in Kotlin
5. Read `ARCHITECTURE.md` → Understand data flow
6. Integrate Supabase Kotlin SDK for auth + DB

### Cross-Platform Reuse
- `packages/core/` can be compiled to: TypeScript (web), Kotlin Multiplatform, or Swift
- Pixel pet generator is pure logic (no platform deps) — easy to port
- Game formulas are mathematical — identical implementation across platforms

## Version History

- Check `VERSION` file for current version
- Check `CHANGELOG.md` for full history

## Known Issues

1. Magic Link accounts have no password → password tab shows error
2. Vercel build cache may retain stale env vars → rename files to force fresh build
3. SQL status CHECK must use exact PetStatus enum values
