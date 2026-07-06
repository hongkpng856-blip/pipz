# Changelog

## v0.35.3 — Flag–Grid Toggle Sync (2026-07-07)

**Fix:** Property flags now follow the grid toggle strictly:
- **Default (grid OFF):** No flags, no grid overlay
- **Toggle ON:** Grid + flags appear together
- **Toggle OFF:** Grid + flags disappear together
- Removed unconditional `placeAllFlags()` on init — now gated by `gridVisibleRef.current`
- Cleaned up zoom handler on toggle OFF to prevent flag reappearance on zoom change

## v0.35.2 — Trail Overview + Day Filter (2026-07-06)

**New Features:**
- **👣 足跡總覽** — New button on map (right side, above grid toggle). Click to zoom out and see all trail polylines at once. Click again to recenter to GPS.
- **📅 Per-day filter via weekly chart** — Click a day column in the Stats Card weekly bar chart to show only that day's trail polylines on the map. Click again to show all. Active day shows amber glow border + label.
- **Day filter works at all times** — Whether trail overview is active or not, clicking a day shows only that day's trail dashed polylines.
- **Default filter = today** — On page load, only today's trails are shown (matching the `new Date().getDay()` index).

**Technical:**
- `toggleTrailOverview()` — simplified to only fitBounds + recenter. No heatmap overlay.
- Day filter state in `page.tsx`: `useState<number | null>(new Date().getDay())`.
- `trailDayFilter` prop → RealMap `useEffect` syncs ref + show/hide `L.Polyline` layers using `map.addLayer`/`map.removeLayer` with `map.hasLayer` guard.
- Weekly bar chart columns: `onClick={() => setTrailDayFilter(isFiltered ? null : dayIdx)}`. Active column: amber glow + bar highlight via `.weekly-bar-col-active` CSS.

## v0.35.1 — GPS Toggle UX + Flag Zoom Gate (previous)
## v0.35.0 — Auto-Follow Toggle + Anchor Stabilization (previous)
