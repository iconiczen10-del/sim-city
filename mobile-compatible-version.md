# Vij — Mobile-Compatible Version (v1.2.0)

## Scope & Breakpoint
- **Phone layout** activates automatically on narrow screens (`< 640px`, matching Tailwind `sm:` boundary via `matchMedia('(max-width: 639px)')`).
- Desktop screens (`>= 640px`) render the unchanged PC layout (`pc-version.md`).

## Top Bar & Phone Speeds
- Displays: **city name**, **sim date**, **current speed badge**, **treasury in ∆**, and a **`44px × 44px` gear button** that opens Settings.
- Displays a `"Running behind"` warning badge whenever the simulation worker falls behind at high speed, plus `"Storage XX% full"` if IndexedDB quota reaches `80%+`.
- **Phone speed selector** (`44px+` minimum touch targets):
  - `Pause`, `1x`, `2x`, `5x`, `10x`, `20x`, `25x`.
  - If a higher desktop speed was active before resizing to phone width, speed clamps cleanly to `25x`.
  - Time remains on the whole-day cycle (`10 real seconds / speed` per sim day).

## Mobile Navigation
- **Bottom Navigation Bar** contains **4 items only**:
  1. `Overview`
  2. `Citizens`
  3. `Companies`
  4. `Settings`
- All section sub-tabs render as **horizontally scrollable rows** (`overflow-x-auto`) rather than sidebars or nested drawers.
- Removed from mobile main navigation: standalone `Event Log` tab (moved to `Settings -> City Events`), standalone `Vij Mart` & `Job Market` tabs (moved to `Companies`), and Overview's `Tier Movement This Month` block (moved to `Settings -> Tier Movement`).

## Mobile Companies Section (4 Horizontally Scrollable Tabs)
1. **Companies**: Overview, Org Chart, and financial ledgers for `Vijtech`, `Vij Capital`, `Vij Industries`, and `Vij Mart` (Board & Full Ledger tabs remain accessible).
2. **Vij Mart**: Live prices, margin moods, stock levels, electronics, schedules, manager AI, and sabotage controls.
3. **GJ Electricity**: Gas plant fleet, build/repair controls, tariffs, rationing priority, grid cuts, and demand tracking.
4. **Job Market**: Open vacancies, salary bands, and candidate listings.

## Mobile Settings Screen
1. **Export**: Downloads the full local JSON records file (`vij-records-day-[simDay]-[date].json`).
2. **Import**: Loads a saved city and simulation records JSON file from device storage.
3. **New City**: Prompts for confirmation (with optional deterministic seed) before starting a fresh city.
4. **City Events**: Opens the cursor-paged master Simulation Records log (`3` items per page, Previous/Next, category/subject/day-range search, Jump to Day).
5. **Tier Movement**: Opens the uncapped, newest-first log of every citizen promotion and demotion (`day`, `citizen name`, `old tier → new tier`, `reason`), paginated at `12` per page with zero caps or trimming.
6. **Sharity**: Opens the full civic social network (`Feed`, `People`, and `Network` tabs plus profile inspection, post reasoning, and comment threads) with unread post badge and direct routing from citizen Sharity links.

## Performance & Responsive Engineering
- **Web Worker Simulation**: Daily simulation ticks run off the main UI thread (`simWorker.ts`), keeping scrolling, tabs, and touch buttons responsive at `20x–25x`.
- **Background Batched Records**: Simulation Records buffer in memory and flush every 50 entries or every 2 seconds in the worker without stalling day progression.
- **30s Diff-Only Autosave**: City state is split into 9 deterministic slices (`meta`, `citizens`, `companies`, `housing`, `mart`, `electricity`, `sharity`, `chatGroups`, `events`) in IndexedDB (`citySlices` store); only slices whose signature changed are written every 30 seconds and on `pagehide`.
- **Throttled High-Speed Redraws & Load-Shedding**: At `20x–25x` (or when lagging behind), multiple sim days advance per worker tick while UI snapshots throttle to every few days; simulation logic never skips a day.
- **Windowed Charts & Lists**: Sparklines and Mart charts slice to the latest 48 points (`React.memo`), Citizens list paginates `12` cards per page on mobile, and multi-column grids collapse cleanly to `1–2` columns on phones with zero horizontal page overflow.
- **Fully Offline**: Zero network requests; all data persists locally in browser IndexedDB.
