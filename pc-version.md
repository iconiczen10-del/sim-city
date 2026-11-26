# Vij — PC Version (v1.2.0)

## Scope & Breakpoint
- **PC layout** renders on screens `>= 640px` (`sm:` and wider) with its full desktop layout, sidebar navigation, and high-speed controls completely unchanged.

## Top Bar & PC Speeds
- Displays **city name**, **sim date**, **city seed** (`xl+`), **speed bar**, **treasury in ∆**, **living population**, `"Running behind"` warning if active, and `"Storage XX% full"` quota alert if storage reaches `80%+`.
- **PC speed selector**:
  - `Pause`, `1x`, `2x`, `5x`, `10x`, `20x`, `30x`, `40x`, `50x`.
  - Runs on the whole-day cycle (`10 real seconds / speed` per sim day).

## PC Sidebar Navigation (8 Tabs + Save Tools)
1. **Overview**: City KPIs, Treasury & Mood sparklines, GJ Electricity grid metrics, Homelessness Index, **Tier Movement This Month**, Company cash list, and recent City Events preview.
2. **Citizens**: Searchable, tier-filterable directory of all 50 citizens with Citizen Inspector modal (`Overview`, `Inventory`, `Housing`, `Needs`, `Health`, `Traits`, `Decisions`, `Why?`, `Emotions`, `Memories`, `Records`).
3. **Housing**: 60 houses across 5 fictional districts (`Old Town`, `Mill Quarter`, `Greenfield`, `Riverside`, `Hilltop`), Preferences directory, Market Dynamics, House Detail, and SimGod controls.
4. **Companies**: 5-company corporate cards (`Vijtech`, `Vij Capital`, `Vij Industries`, `Vij Mart`, `GJ Electricity`), Org Charts, Full Ledger (`Per Day` / `Per Week` / `Per Month`), GJ Electricity Operations, and Board Meetings.
5. **Job Market**: Open vacancies, salary bands, and candidate matching.
6. **Vij Mart**: Inventory levels across food, water, clothes, household goods, and 9 electronics appliances; pricing moods; delivery controls; manager AI; and sabotage tools.
7. **Sharity**: Local social feed, reaction waves, trending hashtags, citizen profiles, and Employee Chat channels.
8. **Event Log**: Simulation Records master archive browser (`3` rows/page, category/subject/day search, Jump to Day, expandable full JSON event details).
- **Sidebar Footer Tools**: `Export` menu (**Download to PC** / **Upload to SimCity Saves**), `Import` JSON, and `New City` reset.

## Worker, Records & Autosave Architecture
- **Web Worker Engine (`simWorker.ts`)**: Advances every simulation day deterministically off the main UI thread, throttling high-speed UI redraws at `20x–50x` (and shedding redraw frames first when lagging) without skipping any simulation day.
- **Simulation Records**: Append-only IndexedDB `records` store flushed in background batches of 50 entries or every 2 seconds, never trimmed or capped.
- **30-Second Slice-Diff Autosave**: Saves only modified slices to IndexedDB (`citySlices`) every 30 seconds and on `pagehide`, maintaining full backward compatibility with legacy JSON save imports.
- **Fully Offline**: Zero external API or network requests.
