# Changelog

## v0.5.2 — 2026-11-22
- Rebalanced monthly survival baseline: citizens now protect minimum food and water spending before rent (recording unpaid rent in `rentArrears` and falling back to lower-tier food/water when needed), Entry (`∆620–∆920`) and Unemployed (`∆660–∆1,080`) start with ~45 days of savings, Vij Industries starting payroll targets ~70–85% of revenue, and bankrupt Vij Industries loses Mart wholesale revenue while Vij Mart falls back to `Outside Vij Wholesale` (`1.24x` cost).
- Replaced all simulation `Math.random()` calls with deterministic seeded `mulberry32` PRNG (`rng.ts`), storing `seed` and `rngState` in `CityState`, displaying `City seed: <seed>` in the header, and adding an optional `Start with seed` input on New City.
- Migrated browser persistence from `localStorage` to IndexedDB (`city` and `boardMeetings` stores) with async startup loading screen, one-time legacy `localStorage` import and cleanup, debounced auto-saves (every 5 days, month-end, `pagehide`), visible storage error warnings, and JSON Export / Import bundle buttons.
- Implemented Vij Industries 4-seat Board Engine (`1 CEO, 2 Executives, 1 Manager`) with internal promotions, monthly & emergency cash-runway meetings, 60-day severe-action cooldowns, trait/memory-driven softmax option scoring across 13 resolutions, and 2-2 CEO tie-breaking.
- Added compulsory weighted Board Contribution calls above a 4-month survival reserve (with 38% cap, default redistribution, non-revenue cash accounting, negative-cash streak reset, and personality/resignation reactions) plus voluntary 9-choice Employee Investment drives, proportional profit repayments, and bankruptcy write-offs.
- Added Vij Industries Boardroom tab in Companies (unread badge, seat stances, 1x/5x/Instant transcript playback with `Hide thoughts` and `Jump to vote`, live probability & post-vote breakdown, filterable meeting archive) plus `board`, `contribution`, and `investment` Event Log categories and a 712-fragment render-time template composition engine.

## v0.5.1 — 2026-11-21
- Rewrote Vij Mart demand forecasting around living citizens' ground-truth daily consumption (80%) blended with a 14-day sales EMA (20%) and a 1.08x days 28–30 payday cap, capping food orders at 4 days of shelf life and enforcing a ∆2,250 cash reserve floor on all orders.
- Enforced a strict 1.0x wholesale cost price floor on every SKU across all moods and SimGod overrides, disabled clearance pricing on water, and raised clearance trigger threshold above 8 days of supply.
- Guarded emergency rush fees to at most once per category per run, skipped rush fees when Mart cash is below ∆3,000, and skipped rush fees on L3–L5 SKUs when L1 or L2 of the same category is in stock.
- Updated Day-30 end-of-month settlement to execute company payroll, operating expenses, and job market clearing before Vij Mart ordering spends cash, and capped citizen food hoarding at 9 meals max (14-day stockout memory, +2 max panic padding).
- Calibrated Unemployed starting savings to ∆300–∆500, Entry T5 minimum starting savings to ∆200, raised Vij Mart default Typical margin from 35% to 48% (Clearance 2–5%, Generous 18%, Good 30%, Greedy 68%, Gouging 110%+), and slimmed Vij Mart to 4 seats (1 CEO, 1 Team Lead floor manager, 2 Entry).
- Added the live Team Lead Floor Manager NPC driving Vij Mart discipline/skill/ambition/experience/greed/kindness/mood/stress behaviors, monthly CEO performance reviews with 2-month under-30 dismissal, manager-attributed decision logs, the Mart Manager Card with Citizen Profile link, and a confirmed SimGod Fire Manager action.

## v0.5.0 — 2026-11-21
- Updated simulation clock so 1 day equals 10 seconds IRL at 1x speed (2s at 5x, 0.5s at 20x).
- Added 4 live companies starting with ∆40,000 cash each: Vijtech Systems (1.15x IT), Vij Capital (1.10x Finance), Vij Industries (1.00x Factory & Exports + Vij Mart wholesale supplier), and Vij Mart (0.90x Retail with real payroll replacing the ∆1,500 placeholder and AI manager personality driven by the Mart CEO's greed and discipline).
- Assigned all 41 working citizens into 6-level company hierarchies (CEO, Executive, Manager, Team Lead, Staff, Entry) with 9 unemployed adults, dynamic direct-boss trees, boss-employee relationships (-100 to +100), performance scores, tenure tracking, and work histories.
- Updated monthly salaries to scale by company health multiplier (0.75x–1.15x) and industry multiplier, with proportional payroll fallback on low cash, marginal income tax, 5% flat business revenue tax into the city treasury, 2-month negative profit layoffs, and 3-month negative cash bankruptcy.
- Built dynamic Job Market with vacancy opening, candidate scoring, internal promotion priority cascading downward, quitting, performance firing, 60-day unemployment flexibility, and 90-day skill decay.
- Added Companies tab (cards, financials, clickable CEO-to-Entry org chart tree, profit chart, company events), Job Market tab (vacancies, applicant queues, career transitions), Citizen career/boss section, Overview employment/payroll/company health summaries, and 9 new job/company Event Log categories.

## v0.4.0 — 2026-11-21
- Added citizen Memory system: events (property loss, gifts, stolen goods, stock-outs, price shocks, hunger, thirst, illness, city deaths, running out of money, big purchases, rationing) create weighted (-100 to +100) memories that fade over time and influence stockpiling, caution, Mart trust, and mood.
- Added citizen Stress (0–100) rising from losses, hunger, thirst, illness, low savings, and negative memories while recovering on good days, draining health at severe levels and lowering mood.
- Added Decision Records logging scored options, factor breakdowns, plain-language reasons, and linked memory IDs for shopping, meal consumption, living standard shifts, and tier transitions.
- Added SimGod Inventory Powers on every citizen's Inventory tab (add, remove/destroy with perceived natural causes, steal & give to another citizen, direct qty/condition edit) plus a Mass Actions panel on the Citizens tab with live ∆ value previews and confirmations.
- Added logical citizen reactions to item losses, thefts, gifts, and granted supplies, including immediate replacement shopping, downgrade resistance after gifts, and 60-day post-loss stockpiling.
- Added the "Why?" Inspector tab, Memory tab, and searchable 60-day Life Log tab on Citizen Profiles with signed Mood/Stress breakdowns matching exact totals, monthly Money Ledger, Status Score breakdown, and "Explain this change" links.
- Added Hungry/Thirsty/Stressed/Sick status icons on Citizen Cards and Average Stress + state counts on the Overview dashboard.

## v0.3.0 — 2026-11-21
- Replaced the ±20% Step 2A price cap with an autonomous Vij Mart AI manager running daily (deliveries, shopping, spoilage, forecasting, sticky category margin moods, uncapped factor-based pricing, and reasoned ordering).
- Added demand forecasting from recent sales, trends, and month-end payday spikes, plus reorder point math with ∆40 trip fees, 4% bulk discounts above ∆1,500, shelf-life limits on food, ∆100 emergency rush orders, rationing below 2 days of supply, and 10% late delivery tracking.
- Added 6 category margin moods (Clearance, Generous, Good, Typical, A Little Greedy, Gouging), manager personalities (Cautious, Balanced, Aggressive + Generous/Greedy lean), 0–100 store reputation, AI decision log, and 2-month insolvency closure.
- Added SimGod Delivery Control (per-category Auto/Manual 1–7d gap and target supply days, Return to Auto, next delivery ETA, and Rush/Delay/Cancel per in-transit order) and confirmed SimGod Sabotage Powers (destroy/steal stock, contaminate batches, override/release prices, close shop, add/drain cash, change manager personality).
- Added city-wide economic ripples: 60-day citizen stock-out panic buying, price memory and sticker shock downgrades, rationing limits, and food/water poisoning medical costs (`∆50–∆150`).
- Expanded the Vij Mart dashboard with AI Manager mood/factor breakdown, Decision Log, Reputation meter, mood-colored Price History chart, Delivery Control, SimGod Powers panel, and new Event Log categories (`simgod`, `mood-change`, `late-delivery`, `rationing`, `contamination`, `price-shock`).

## v0.2.0 — 2026-11-21
- Replaced the monthly lifestyle multiplier with 5 per-category living standards (Minimum to Luxury) across Food, Water, Clothes, and Household items.
- Added Vij Mart starting with ∆15,000 cash, 20 SKUs across all categories and standards, 65% wholesale cost, 2-day deliveries from Outside Vij Wholesale, ∆1,500 monthly operating cost, ±20% stock-based dynamic pricing, 4-day food spoilage, and 1-tier fallback on stock-outs.
- Added citizen inventories (food batches with expiry, water, outfits with 0–100 condition wearing out over 120 days, 30-day household packs) and daily consumption/shopping simulation.
- Added hunger, thirst, and health meters (0–100), quality-dependent illness & recovery, starvation/dehydration death (faster over age 55), estate transfer to city treasury, and city-wide grief mood impact.
- Added Vij Mart dashboard tab (KPIs, stock table, revenue & price index charts, customer log, deliveries in transit, waste log), Citizen Profile survival/inventory/purchases panels, Citizens "In Memory" filter, Overview hunger/thirst/death/Mart status cards, and expanded Event Log filters.

## v0.1.0 — 2026-11-21
- Initialized the Vij city simulator foundation starting 1 Jan, Year 1 with 30-day months and ∆20,000 municipal treasury.
- Added speed controls (Pause, 1x, 5x, 20x) and automatic local save/resume with New City restart confirmation.
- Implemented 50 unique adult citizens with realistic Indian city names, role distribution (4 CEO, 4 Executive, 5 Manager, 6 Team Lead, 10 Staff, 12 Entry, 9 Unemployed), education, skill, experience, and 6 personality traits.
- Built monthly salary, marginal income tax, housing/lifestyle selection, and ∆305 base living cost cycles.
- Added daily mood drift, status score calculation, ±2 monthly score cap, ±3 tier hysteresis, and ~3/7/17/14/9 tier seeding across T1–T5.
- Built dark control-room dashboard with Overview, Citizens (search, tier/role filters, sorting, and full profile modal with history charts), and searchable/filterable Event Log.
