# Vij — Mobile-Compatible Version (v1.6.0)

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
1. **Companies**: Overview, Org Chart (including Vij Bank & GJ Electricity job titles), Vij Bank loan book & reserve dashboard inside `Vij Capital`, and financial ledgers for `Vijtech`, `Vij Capital`, `Vij Industries`, and `Vij Mart`.
2. **Vij Mart**: Live prices, margin moods, forecast-driven stock levels, electronics, schedules, manager AI, **Outer City Water** emergency supplier pricing & purchase log (`44px+` SimGod overrides), `"Outer City"` purchase badges, and sabotage controls.
3. **GJ Electricity**: `1–6` non-CEO staff roster (seeded at launch matched by skill/education) & role coverage, monthly subsidy absorption metrics, `44px+` CEO mood & SimGod override controls, stacked tap-to-expand household subsidy decision cards, gas plant fleet, tariffs, rationing priority, grid cuts, and demand tracking.
4. **Job Market**: Open vacancies (including Vij Bank & GJ named titles and pay bands), and candidate listings.

## Mobile Citizens & Housing Views
- **Citizen Debt Tab**: Credit score & band, total debt, DTI ratio, stacked tap-to-expand loan cards (`44px+`), perceived vs actual debt, bank trust, debt shame, repayment strategy, garnishment %, coping actions, and Why/What/How borrowing log.
- **Housing & Family Tabs**: Combined married **Household Income & Expense Pool** totals, age-scaled courtship & marriage progression (`<= 30` fastest, same-sex inclusive), guaranteed spaced conception (`100d` + age delay, `120–300d` spacing, compulsory `60d` pregnancy, unlimited children up to age 54), Family tab **Expecting · Due Day** and **Next child window** status cards, age-22 child arrivals (`22–24` dependent youth living with parents/guardians until 25 with birth housing upgrades/overcrowding tracking, `Parental Support` income, and parent-paid daily `Child Food/Water`), orphan relative guardian / City Treasury care badges, minor inheritance trust funds, and inherited debt tracking.
- **Housing Cards**: Each house card displays a clean subsidy status chip and absorbed `∆`, with a `44px+` tap-to-expand reason footer (zero hover-only details). House Detail includes a full Subsidy Status card and tap-to-expand monthly history.
- **Citizen Housing Tab**: Includes the **What I Know & Electricity Subsidy** panel showing tariff/rule beliefs, active usage conservation %, `Trust in GJ` (`0–100`), latest billing reaction, and tap-to-expand personal bill/subsidy decision history.

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
- **30s Diff-Only Autosave**: City state is split into 11 deterministic slices (`meta`, `citizens`, `companies`, `housing`, `mart`, `electricity`, `family`, `bank`, `sharity`, `chatGroups`, `events`) in IndexedDB (`citySlices` store); only slices whose signature changed are written every 30 seconds and on `pagehide`.
- **Throttled High-Speed Redraws & Load-Shedding**: At `20x–25x` (or when lagging behind), multiple sim days advance per worker tick while UI snapshots throttle to every few days; simulation logic never skips a day.
- **Windowed Charts & Lists**: Sparklines and Mart charts slice to the latest 48 points (`React.memo`), Citizens list paginates `12` cards per page on mobile, and multi-column grids collapse cleanly to `1–2` columns on phones with zero horizontal page overflow.
- **Fully Offline**: Zero network requests; all data persists locally in browser IndexedDB.
