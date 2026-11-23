# Changelog

## v0.5.7 — 2026-11-23
- Added the seeded **VI Employee** WhatsApp-style company chat with live payroll, board, hiring, layoff, leadership, and city-event conversations; archetype voices, one-time Day 1–4 history, topic maturity, and bounded anti-repeat selection.
- Added dynamic message slots, tone variation, membership and CEO system notices, forwarded posts, vibe scoring, reactions, pins, deletion, member details, unread indicators, and a 90-day active archive backed by IndexedDB and JSON export/import.
- Optimized the mobile Companies navigation and extracted navigation, migration, and day-advance responsibilities into focused root-level modules.

## v0.5.6 — 2026-11-22
- Implemented **Sharity (S2: Posts, Templates, Topics, Trending, Company Pages)** driving live citizen and company posts from real simulation events and active states across all 16 topic categories.
- Built the weighted citizen posting pipeline (`sociability × (event strength + social need + mood swing)`), 2-day per-citizen post cooldown (bypassed on major events), quiet suppression when mood/sociability are very low under high stress, and full deceased-citizen silence.
- Added 9 distinct voices (`humble`, `show_off`, `bitter`, `kind`, `funny`, `anxious`, `angry`, `hopeful`, `neutral`), education/age/stress-driven writing styles, `@handle` mentions, and a 300+ template/fragment library with 14-day global anti-repeat and per-citizen template cooldowns.
- Enabled verified event-driven official posts from `@vijtech`, `@vijcapital`, `@vijindustries`, and `@vijmart` with CEO trait spin (`greed` vs `kindness`) on vacancies, layoffs, pay freezes, monthly profit/loss, board resolutions, and Vij Mart closures, rationing, delays, or price moves.
- Upgraded the **Feed** view with live post cards, **Why this post?** breakdowns (trigger, gate scores, voice reason, template ID), topic filter chips across all 16 categories, author/text/hashtag filters, clickable **Top 10 Trending Hashtags (Last 7 Days)** with rising/falling arrows, author profile post lists, and **Network** analytics charts (posts per day, topic mix bar, and city voice sentiment over time).

## v0.5.5 — 2026-11-22
- Added **Sharity (S1 Foundation)** as a new sidebar tab with **Feed**, **People**, and **Network** sub-views plus full profile drill-down pages; SimGod operates strictly in observer mode (`No posts yet` shell ready for S2).
- Created unique lowercase Sharity handles (`@firstname.lastname`, plus `@vijtech`, `@vijcapital`, `@vijindustries`, `@vijmart`), tier-colored initial avatars, Day-1 join dates, official company bios, and event/trait/status-driven citizen bios with a 10-day refresh cooldown and `In memory` preservation for deceased citizens.
- Implemented **Verified & Rising Badges**: company pages stay permanently verified while citizens earn a **Rising** verified badge on upward tier moves and lose it if they fall below the tier where it was earned, with full profile badge history and `sharity` Event Log entries.
- Built the pairwise citizen **Affinity** matrix (`-100` to `+100`) seeded from workplace, boss ties, trait similarity, tier distance, and greed/kindness clashes with slow monthly drift, displaying Top 5 highest and lowest affinity peers on each Sharity profile.
- Added the seeded **Follower Network** (`>= 2` citizen follows each, employer + Vij Mart follows, skewed status/sociability distribution), monthly/event-driven follow updates, `10 / 25 / 50` follower milestones, and the **Posting Rate Engine** (`0.7–1` expected posts/day with `0–3` variation, `5+` surge on major city events, `0` when paused; added `2x` and `10x` speed controls).
- Added a Sharity preview section inside the Citizen Profile Modal linking directly to that citizen's Sharity profile, and updated IndexedDB/JSON save migration cleanly.

## v0.5.4 — 2026-11-22
- Updated Vij Industries' simulated export payout clamp from `∆13,000–∆44,000` to **`∆10,000–∆25,000`** (`∆10,000` prior-export floor and `∆20,000–∆24,500` Month 1 export range) in `companyFinances.ts`.
- Removed the personal survival-floor exemption from compulsory Vij Industries board contributions so all 4 directors share compulsory calls evenly (with zero-cash shortfall redistribution across directors).
- Calibrated compulsory board contribution tiers to **`∆5,000–∆10,000`** during low-cash danger and **`∆10,000–∆25,000`** when cash/runway is severely distressed (`cash < 0`, negative cash streak, or `< 0.7` months runway).
- Updated board voting and emergency meeting triggers so board contributions only activate in genuine danger/low cash, and the board actively fights bankruptcy using hiring freezes, pay cuts, targeted layoffs, and capital calls instead of passive waiting or premature wind-down.

## v0.5.3 — 2026-11-22
- Added the **Company Full Ledger** tab inside Companies alongside **All Companies** and **Vij Industries Board**, with **Per Day**, **Per Week**, and **Per Month** sub-tabs.
- Implemented real transaction ledger recording (`CompanyLedgerEntry`) with exact running cash balances across all four companies: Vij Mart retail sales, wholesale stock orders, monthly staff payroll, 5% business revenue taxes, Vij Industries export revenue, Vijtech/Vij Capital client & banking revenue, compulsory board capital calls, employee investments, investor principal repayments, and store cash/rush adjustments.
- Added company selector buttons, category filtering (`Retail Sales`, `Wholesale`, `Export Revenue`, `Client Revenue`, `Staff Payroll`, `Business Tax`, `Board Capital`, `Staff Investment`, `Debt Repayment`, `Cash Adjustment`), summary KPI cards, and clickable period rows that drill down into the full transaction journal.

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
