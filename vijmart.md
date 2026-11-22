# Vij Mart — Complete System & Mechanics Documentation

**Version:** 0.3.0  
**Scope:** Retail store economy, autonomous AI manager, inventory & spoilage, dynamic pricing, delivery scheduling, citizen purchasing behavior, and SimGod powers in **Vij**.

---

## 1. Overview & Role in Vij

**Vij Mart** is the sole retail store in Vij. Citizens depend on it for all four consumable living-standard categories:

1. **Food** (per meal; citizens eat 3 meals/day)
2. **Water** (per day; citizens drink 1 unit/day)
3. **Clothes** (per outfit; 100 condition points, wears out over 120 days)
4. **Household Items** (per monthly pack; lasts 30 days)

Vij Mart operates on the same whole-day simulation cycle as the rest of the city, bridging individual household budgets, supply chain delays, spoilage, price psychology, and survival.

---

## 2. Store Initialization & Financial Baseline

When a new city is created (`seeder.ts` / `martSetup.ts`), Vij Mart starts with:

- **Starting Cash:** `∆15,000`
- **Starting Reputation:** `70 / 100`
- **Manager Personality:** `balanced` style, `0` profit lean (neutral between Generous and Greedy)
- **Monthly Operating Cost:** `∆1,500` (deducted at the end of every 30-day month)
- **Wholesale Supplier:** `Outside Vij Wholesale`
- **Wholesale Cost Ratio:** `65%` (`0.65`) of each SKU's base sell price
- **Total SKUs:** `20` (4 categories × 5 living standards)

### Base Price & Wholesale Cost Table

| Category | Unit | L1 Minimum | L2 Medium | L3 Good | L4 Comfortable Rich | L5 Luxury |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Food** | Per meal | `∆2` (cost `∆1.30`) | `∆3` (cost `∆1.95`) | `∆4` (cost `∆2.60`) | `∆6` (cost `∆3.90`) | `∆10` (cost `∆6.50`) |
| **Water** | Per day | `∆0.50` (cost `∆0.33`) | `∆0.80` (cost `∆0.52`) | `∆1` (cost `∆0.65`) | `∆1.50` (cost `∆0.98`) | `∆3` (cost `∆1.95`) |
| **Clothes** | Per outfit | `∆40` (cost `∆26`) | `∆60` (cost `∆39`) | `∆100` (cost `∆65`) | `∆200` (cost `∆130`) | `∆480` (cost `∆312`) |
| **Household** | Per 30d pack | `∆10` (cost `∆6.50`) | `∆20` (cost `∆13`) | `∆40` (cost `∆26`) | `∆90` (cost `∆58.50`) | `∆250` (cost `∆162.50`) |

### Starting Stock Seeding

Initial quantities are calibrated from the city's initial citizen standards:
- **Standards 1–4:** ~7 days of estimated demand (minimum floor of 4 units).
- **Standard 5 (Luxury):** ~4 days of estimated demand (stocked thinner, minimum floor of 2 units).
- **Food Age Buckets:** Initial food stock is split across Day 0 (`50%`) and Day 1 (`50%`) age buckets so expiration cycles begin naturally.

---

## 3. Daily Execution Sequence

Every simulation day (`simulation.ts` → `martEngine.ts`), Vij Mart executes in three strict phases:

### Phase 1: Start of Day (`processMartDayStart`)
1. Reset `todayRevenue` to `∆0` and `customersTodayIds` to `[]`.
2. Decrement `closedDaysLeft` and `recentSabotageDays` by 1 (if > 0).
3. Append a new daily sales bucket (`0`) to every SKU's 14-day `salesHistory`.
4. Advance all in-transit deliveries (`etaDays -= 1`):
   - **Late Delivery Check:** Non-rush orders reaching `etaDays <= 0` for the first time have a **10% chance** to slip **1–3 days late**. This sets `isLate = true`, increments `lateDeliveryCount`, and emits a `late-delivery` event.
   - **Arrival:** Orders reaching `etaDays <= 0` add their `quantity` to store inventory (into age bucket `0` for food), increment `totalDeliveryCount`, and emit a `delivery` event.

### Phase 2: Citizen Shopping (`martShopping.ts` & `dailyCitizen.ts`)
- Living citizens consume daily meals/water/wear and shop when their personal buffers run low.
- If `closedDaysLeft > 0` or `closedUntilFunded === true`, all purchases fail (`return false`), forcing citizens to rely on stored inventory or suffer hunger/thirst.

### Phase 3: End of Day (`processMartDayEnd`)
1. **Food Spoilage:** Food in Mart storage older than **4 days** (`foodAges[3]`) spoils, is removed from stock, recorded in `wasteLog`, and emits a `spoilage` event.
2. **Rationing Check:** Total Mart food units divided by total daily food forecast is checked. If `< 2` days of supply remain, `rationingActive` turns `true` and a `rationing` event is logged.
3. **Reputation Update:** Adjusts `reputation` (`0–100`) from stock-outs, rationing, gouging, and generous/clearance pricing.
4. **Demand Forecasting (`updateSalesForecasts`):** Updates `dailyForecast` per SKU.
5. **Mood & Dynamic Pricing (`updateMartMoodsAndPrices`):** Updates sticky category margin moods and recalculates uncapped `sellPrice` + `PriceFactorBreakdown` for all 20 SKUs.
6. **Autonomous Ordering (`processMartOrdering`):** Places Auto or Manual wholesale orders and logs reasoned entries to `decisionLog`.
7. **Daily Telemetry Snapshot:** Appends `{ label, revenue, avgPriceIndex, dominantMood }` to `mart.history` (last 60 days retained).

---

## 4. Autonomous Vij Mart AI

The AI manager behaves like a real store operator and uses only store-level observations (its own stock, cash, sales history, supplier reliability record, reputation, customer transactions, and observed market demand/affordability signals), never inspecting private citizen traits or private bank accounts.

### 4.1 Demand Forecasting (`martAI.ts`)
For each SKU every evening:
- Takes up to the last 7 days of `salesHistory` to compute a baseline average (`avg`).
- Compares the last 2 days (`recentAvg`) against earlier days (`olderAvg`) to derive a clamped trend multiplier (`0.75x` to `1.35x`).
- Applies a **month-end payday spike** (`1.18x`) on days `28–30` and `1–3` of each month.
- Applies realistic forecast noise (`0.90x` to `1.10x`) so forecasts are realistic and occasionally imperfect.

$$\text{dailyForecast} = \max\left(\text{floor},\; \text{avg} \times \text{trend} \times \text{paydaySpike} \times \text{noise}\right)$$

Minimum floors prevent deadlocked zero-demand SKUs: `1.5` (food), `0.5` (water), `0.1` (clothes/household).

### 4.2 Category Margin Moods
Each of the 4 categories carries an independent **Margin Mood** that remains sticky for **2–4 days** unless overridden by an urgent crisis:

| Mood | Margin Range | Typical Share | Trigger / Meaning |
| :--- | :--- | :--- | :--- |
| **Typical** | `+32%` to `+38%` (35%) | ~55% | Routine market conditions |
| **Good** | `+20%` to `+25%` (23%) | ~15% | Healthy supply & positive reputation |
| **A Little Greedy** | `+50%` to `+60%` (55%) | ~15% | Strong demand or aggressive/greedy lean |
| **Generous** | `+8%` to `+12%` (10%) | ~5% | Low reputation recovery or generous lean |
| **Clearance** | `-10%` to `0%` (-5% / -4%) | ~5% | Near-expiry food (`> 8` day-3 meals) or excess surplus (`> 11` days supply) |
| **Gouging** | `+90%` to `+115%` (92%–105%) | ~5% | Severe scarcity (`< 1.6` days supply) or cash crisis (`< ∆1,600` with `< 4` days supply) |

**Manager Personality Influence:**
- `style`: `cautious` (lower greed/gouging odds, `1.35x` safety stock), `balanced` (`1.05x` safety stock), `aggressive` (higher greed/gouging odds, `0.85x` safety stock).
- `greedyLean`: `-50` (Generous) to `+50` (Greedy), shifting mood draw weights continuously.

### 4.3 Uncapped Dynamic Pricing (`martPricing.ts`)
There is **no cap** on how high or how fast prices can rise or fall. Every SKU price is calculated from wholesale cost:

$$\text{rawPrice} = \text{buyCost} \times \left(1 + \frac{\text{baseMarginPct}}{100}\right) \times \prod \text{adjustments}$$

Adjustments combined multiplicatively:
1. **Stock & Supply Days (`stockAdjPct`):** `clamp((6 - daysLeft) * 8, -22%, +65%)`
2. **Shelf-Life Expiry (`expiryAdjPct`):** `-15%` when `> 4` food meals are 1 day from spoilage
3. **Demand Trend (`demandAdjPct`):** `clamp(((recentSales - forecast) / forecast) * 18, -12%, +24%)`
4. **Citizen Affordability (`affordabilityAdjPct`):** Responds to market purchasing power & city mood (`-15%` to `+18%`)
5. **Mart Cash Health (`cashAdjPct`):** `+18%` when cash `< ∆2,000`, `-4%` when cash `> ∆18,000`
6. **Reputation Factor (`reputationAdjPct`):** `(reputation - 70) * 0.15`
7. **Supplier Delays & Sabotage (`delaySabotageAdjPct`):** `delayRate * 25%` plus `+15%` for 5 days after sabotage

**Price Floor & Overrides:**
- Normal floor: never sells below `buyCost` (`sellPrice >= buyCost`).
- `clearance` mood floor: may discount down to `0.75 * buyCost`.
- SimGod price overrides (`fixed` or `multiplier`) replace or multiply the calculated price until `daysLeft` expires.
- Every SKU stores a `PriceFactorBreakdown` displayed in the **Why This Price** inspector.

### 4.4 Reorder Math, Fees, Discounts & Cash Protection (`martOrdering.ts`)
For each category and SKU (when not already in transit):
- **Lead Time:** `2 days` (`MART_LEAD_TIME_DAYS`)
- **Delivery Gap (`gapDays`):** `1–7` days. In `Auto` mode, AI picks `1–2d` for perishable food, `2–3d` for water, and `4–6d` for clothes/household based on manager style and cash.
- **Safety Stock:** `ceil(dailyForecast * (0.8 + delayRate * 3) * safetyMult)` — automatically pads orders as the AI observes late supplier deliveries.
- **Reorder Point:** `dailyForecast * (gapDays + leadTime) + safetyStock`
- **Shelf-Life Cap (Food):** Food orders are capped at `ceil(dailyForecast * 3.7)` so perishable food does not sit past 4 days.
- **Trip Fee & Bulk Discount:**
  - `∆40` delivery trip fee per category order trip (`MART_TRIP_FEE`).
  - `4%` bulk wholesale discount when an order subtotal exceeds `∆1,500`.
- **Emergency Rush Orders:** On a stock-out (`quantity === 0`), Mart AI immediately places a rush order (`+∆100` rush fee, `1-day` ETA) if cash permits.
- **Cash Reserve & Essential Priority:** Keeps a reserve buffer toward the `∆1,500` monthly operating cost (`reserveFloor = ∆750` when healthy). When cash is tight, **Food and Water** orders are funded first while non-essential Luxury SKUs are skipped.
- **Decision Log:** Every mood change and wholesale order records a plain-text summary and mathematical reason in `mart.decisionLog`.

### 4.5 Reputation & Insolvency
- **Reputation (`0–100`, starts `70`):**
  - Falls with stock-outs (`-0.4` per empty SKU/day), rationing (`-0.8/day`), gouging (`-0.6` per gouging category/day), and contamination poisoning (`-2.0` per incident).
  - Rises with full shelves (`+0.3/day`) and `Generous` / `Clearance` moods (`+0.4` per category/day).
  - Slightly shifts daily citizen mood (`(reputation - 70) * 0.08`).
- **2-Month Insolvency Closure (`monthlyCycle.ts`):**
  - At month-end, if `mart.cash >= ∆1,500`, the operating cost is paid and `unpaidOpMonths` resets to `0`.
  - If `mart.cash < ∆1,500`, `unpaidOpMonths` increments. After **2 consecutive unpaid months**, `closedUntilFunded` becomes `true`, closing Vij Mart until cash is injected (`>= ∆1,500`).

---

## 5. City Ripples & Citizen Behavior

Vij Mart events propagate dynamically through the 50-citizen population:

1. **Rationing:** When Mart food stock drops below `2 days` of demand, `rationingActive` limits purchases per citizen per day to `3` meals (food) and `1` unit (water/clothes/household).
2. **Stock-Out Memory (Panic Buying):** When a citizen encounters an out-of-stock item, `stockoutMemoryDays` resets to **60 days** (decaying 1/day). While active, citizens buy extra buffer days (`+3` to `+6` meals, `+2` to `+4` water days), stronger for low-discipline (`< 45`) or low-mood (`< 45`) citizens — amplifying shortages.
3. **Price Memory & Sticker Shock:** Citizens remember `lastPaidPrices[category]`.
   - If the current sell price jumps `>= +28%` over their remembered price, they suffer **Price Shock** (`-6` immediate mood, `price-shock` event, and downgrade their living standard in that category by 1 level if above `L1`).
   - If prices drop `<= -18%` below remembered price, they gain `+2` mood.
4. **One-Tier Fallback:** If a citizen's preferred standard is out of stock, they attempt to buy 1 standard lower (`L - 1`) before going without.
5. **Contamination & Food Poisoning:** Eating or drinking tainted units causes immediate poisoning (`-20` health, or `-26` if age `> 55`), `-15` mood, a `∆50–∆150` medical bill deducted from savings, and a `contamination` event. Weakened or elderly citizens risk death if health reaches `0`.
6. **Shop Closure:** During a closure (`closedDaysLeft > 0` or `closedUntilFunded`), citizens with stocked inventories survive on reserves while citizens without reserves drop to `0` hunger/thirst, lose health, and risk starvation/dehydration death.

---

## 6. SimGod Controls & Sabotage Powers

### 6.1 Delivery Control (`MartDeliveryPanel.tsx` / `simgodDeliveries.ts`)
Available per category (`Food`, `Water`, `Clothes`, `Household`):
- **Auto vs. Manual Schedule:** Set a custom delivery interval (`1–7` days) and target supply buffer (`2–14` days), or click **Return to Auto** to hand scheduling back to the AI.
- **Next Delivery Display:** Shows estimated next order or arrival countdown per category.
- **In-Transit Order Interventions** (all confirmed):
  - **Rush (`∆100`):** Sets `etaDays = 1` and flags the order as a rush delivery.
  - **Delay (`+2d`):** Pushes arrival out by 2 days and marks the order `LATE` (incrementing `lateDeliveryCount`).
  - **Cancel:** Cancels the shipment before arrival.

### 6.2 Sabotage Powers (`MartSabotagePanel.tsx` / `simgodSabotage.ts`)
Every sabotage action requires explicit confirmation via `ConfirmModal`, logs as **`simgod` (`SimGod Action`)** in the Event Log, and presents only natural symptoms to citizens and the AI:

1. **Destroy Stock (%):** Removes a percentage of a chosen SKU (`recentSabotageDays = 5`, logged as `Fire / Loss` in waste log).
2. **Steal Stock (%):** Removes a percentage of a chosen SKU (`recentSabotageDays = 5`, logged as `Theft` in waste log).
3. **Contaminate Batch:** Taints `N` units of a chosen Food or Water SKU; purchase logs flag `[TAINTED xN]` and consumers suffer food poisoning.
4. **Override / Release Price:** Force a `Fixed ∆` price or `Multiplier` on any category for `1–30` days, or release back to the AI early.
5. **Close Shop (`N` days):** Shuts Vij Mart for `0–30` days (citizens perceive a strike or inspection).
6. **Add or Drain Cash (`∆`):** Injects or drains working capital; injecting sufficient funds (`>= ∆1,500`) reopens an insolvent store.
7. **Change Manager Personality:** Switches manager style (`cautious`, `balanced`, `aggressive`) and adjusts the profit lean slider (`-50` Generous to `+50` Greedy).

---

## 7. Dashboard UI Reference (`MartView.tsx` & Related Panels)

The **Vij Mart** sidebar tab displays:
- **Top Status Banner:** Alerts immediately if the store is closed due to SimGod action or 2-month insolvency.
- **5 Always-Visible KPIs:** `Mart Cash`, `Today's Revenue` (+ customer count), `Monthly Revenue`, `Last Month Profit` (after `∆1,500` op cost), and `Stock Value (Cost)` (+ active deliveries).
- **4 Sub-Tabs:**
  1. **AI Manager & Charts:**
     - *Daily Sales Revenue* chart and *Price Index by Mart Mood* chart (line & dots colored by active mood).
     - *Store Reputation & AI* meter (`0–100`), manager style, profit lean, and late supplier rate.
     - *Category Moods & Margins* selector cards showing margin %, reason, and sticky days left.
     - *Why This Price* breakdown showing all 8 additive/multiplicative factors and effective cost markup (`x`).
     - *AI Manager Decision Log* with timestamped reasoning.
  2. **Stock & Logs:**
     - *20-SKU Stock Table* with quantity, buy cost, uncapped sell price (`%` vs base), daily forecast, supply days left, taint warnings, and status (`Nominal`, `Low Stock`, `In Transit`, `Rationed`, `Out of Stock`).
     - *Tabbed Logs:* `Customer Log`, `Deliveries`, and `Waste & Loss`.
  3. **Deliveries:** Per-category Auto/Manual schedule controls and in-transit order intervention controls.
  4. **SimGod Powers:** Confirmed sabotage controls for stock, contamination, prices, closure, cash, and manager personality.
