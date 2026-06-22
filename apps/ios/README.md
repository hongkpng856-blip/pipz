# Pipz iOS App

Native SwiftUI iOS app for Pipz — 陪你每一步。

## Requirements

- macOS 14+ (Sonoma)
- Xcode 15+
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)
- [Supabase Swift SDK](https://github.com/supabase/supabase-swift) (SPM)

## Setup

### 1. Generate Xcode Project

```bash
cd apps/ios
xcodegen generate
open Pipz.xcodeproj
```

### 2. Add Supabase SDK (SPM)

In Xcode:
1. File → Add Package Dependencies...
2. Search: `https://github.com/supabase/supabase-swift`
3. Add to Pipz target

### 3. Configure Supabase Keys

Edit `Services/SupabaseService.swift`:
- Update `supabaseURL` with your project URL
- Update `supabaseKey` with your anon key

### 4. Run

Select iPhone simulator or connected device and run.

## Project Structure

```
apps/ios/
├── project.yml                    # XcodeGen project spec
├── Pipz/
│   ├── PipzApp.swift              # App entry point
│   ├── Info.plist                 # App metadata
│   ├── Assets.xcassets/           # App icons & assets
│   ├── Models/
│   │   └── Pet.swift              # Data models (Pet, User, enums)
│   ├── Services/
│   │   └── SupabaseService.swift   # Supabase API client
│   ├── Views/
│   │   ├── ContentView.swift      # Root view (auth gate)
│   │   └── PetCompanionView.swift  # Main pet companion screen
│   └── Rendering/
│       └── PixelPetCanvas.swift    # Pixel pet renderer (Canvas)
```

## Features

- **Pet Companion View** — Full-screen interactive pet with autonomous behavior
- **Pixel Art Renderer** — Canvas-based pet drawing with room background
- **Auto Behavior** — Pet walks, idles, does mischief automatically
- **Tap Interaction** — Tap pet for happy reaction + hearts
- **Mood Display** — Emoji above pet head
- **Action Buttons** — Feed, pet, play
- **Step Tracking** — Total steps + evolution stage
- **Auth** — Email/password via Supabase
- **Supabase Sync** — Pets, profiles, notifications

## Design

- Dark theme (`#0b1120` background)
- Room scene with wall, checkered floor, and rug
- Pet drawn with Core Graphics/Canvas (SwiftUI)
- Rarity colors match web app

## TODO

- [ ] Step tracking with HealthKit (pedometer)
- [ ] Push notifications
- [ ] Egg hatching animation
- [ ] Market (buy/sell pets)
- [ ] Evolution animation
- [ ] Pet naming
- [ ] Widget (iOS 17+)

## Source

Web app: https://pipz-ivory.vercel.app/
GitHub: https://github.com/hongkpng856-blip/pipz
