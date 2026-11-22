# Vij Citizen (NPC) Architecture & Simulation Reference (`v0.4.0`)

Every citizen in Vij is an autonomous agent with demographics, career economics, 6 personality traits, per-category living standards, batch-tracked physical inventory, emotional memory with non-uniform decay, dynamic stress, scored decision records, a 60-day searchable life diary, and a monthly money ledger.

This document details **every formula, rate, behavioral loop, and data structure** governing how a citizen lives, thinks, shops, remembers, reacts, and dies in Vij `v0.4.0`.

---

## 1. Citizen Identity, Demographics & Seed Distribution

Vij initializes **50 unique adult citizens** (`seeder.ts`, `citizenFactory.ts`, `seedProfiles.ts`), ages `18–64`, mixed genders (`Female`, `Male`, `Non-Binary`), each with a unique Indian-city name and Sharity handle (`@handle` reserved for future social features).

### Role, Trait & Tier Distribution
| Role | Seed Count | Education Pool | Skill Range | Exp Range (yrs) | Age Range | Base Respect |
| --- | ---: | --- | --- | --- | --- | --- |
| **CEO** | 4 | Degree, Master's, Professional | 81–97 | 12–28 | 38–63 | 82 |
| **Executive** | 4 | Degree, Master's, Professional | 72–90 | 9–22 | 33–59 | 72 |
| **Manager** | 5 | Diploma, Degree, Master's, Prof. | 56–80 | 6–17 | 28–55 | 60 |
| **Team Lead** | 6 | School, Diploma, Degree, Master's | 44–70 | 3–12 | 25–49 | 50 |
| **Staff** | 10 | School, Diploma, Degree | 28–58 | 1–9 | 21–52 | 40 |
| **Entry** | 12 | None, School, Diploma | 8–38 | 0–3 | 18–36 | 30 |
| **Unemployed** | 9 | None, School, Diploma, Degree | 8–62 | 0–14 | 19–64 | 22 |

- **Initial Status Tiers:** Calibrated across `T1: 3`, `T2: 7`, `T3: 17`, `T4: 14`, `T5: 9`.
- **Starting Savings:** Ranges from `∆20–∆145` (T5 Unemployed) and `∆25–∆75` (T5 Entry) up to `∆7,500–∆19,500` (T1 CEO).
- **6 Personality Traits (`0–100` each, `citizenSeedHelpers.ts`):**
  - `ambition` (`15–95`) — drives salary negotiation, clothing standard preference, and unemployment frustration.
  - `greed` (`10–92`) — drives salary negotiation, housing/food/clothes splurging, impulse upgrades, and panic/caution reactions.
  - `kindness` (`15–95`) — lowers free-spending selfishness (`-8%` discretionary budget above `70`), amplifies positive memory weight, increases city-death grief.
  - `loyalty` (`20–95`) — foundational social trait reserved for employer/company retention.
  - `sociability` (`15–95`) — raises food/clothes standards, boosts mood temperament, and amplifies mourning when fellow citizens die.
  - `discipline` (`15–95`) — raises target savings rate (`2%–21%`), enables buffer stockpiling (`>= 60`), softens stress & property-loss shock, and shapes household standard priority.

---

## 2. Income, Taxes, Housing & Fixed Monthly Costs

Economics run at the end of every 30-day month (`economy.ts`, `monthlyCycle.ts`).

### Salary Formula
For employed roles (`Unemployed = ∆0`):
$$\text{RawPay} = \text{RoleMidpoint} \times \frac{\text{EduMult} \times \text{SkillMult} \times \text{ExpMult} \times \text{NegMult}}{\text{RoleExpectedMult}}$$
Clamped strictly within the role's band (`constants.ts`):
- **Entry:** `∆400–∆600` | **Staff:** `∆700–∆1,100` | **Team Lead:** `∆1,200–∆1,800`
- **Manager:** `∆1,800–∆2,800` | **Executive:** `∆2,800–∆4,500` | **CEO:** `∆4,000–∆7,000`

Multipliers:
- **Education:** None `0.90`, School `1.00`, Diploma `1.05`, Degree `1.15`, Master's `1.25`, Professional `1.35`.
- **Skill (`0–100`):** `0.80 + (skill / 100) × 0.50` (`0.80` to `1.30`).
- **Experience:** `1 + min(0.30, experience × 0.03)` (`+3%/year`, capped at `+30%`).
- **Negotiation:** `0.95 + ((greed + ambition) / 200) × 0.10` (`-5%` to `+5%`).

### Marginal Income Tax (Paid into City Treasury)
- `∆0 – ∆500`: **0%**
- `∆500 – ∆1,500`: **5%**
- `∆1,500 – ∆3,000`: **10%**
- Above `∆3,000`: **20%**

### Housing & Fixed Monthly Bills (`economy.ts`)
Citizens dynamically select housing (`selectHomeType`) from `effectiveBudget = netPay + savings × 0.08`, tilted by `spendBias = (greed - discipline) / 100`:
- **Shared Room (`shared_room`):** `∆80/mo` (default if `desired < ∆560` or Unemployed with `< ∆1,200` savings)
- **Small Flat (`small_flat`):** `∆150/mo` (`desired >= ∆560`)
- **Apartment (`apartment`):** `∆300/mo` (`desired >= ∆1,050`)
- **Villa (`villa`):** `∆700/mo` (`desired >= ∆2,100`)
- **Mansion (`mansion`):** `∆1,500/mo` (`desired >= ∆3,600`)

Fixed non-rent monthly costs total **`∆100/mo`** for every living citizen:
- Transport `∆45` + Utilities `∆30` + Healthcare `∆15` + Phone/Internet `∆10`.

If `savings + netPay - fixedCosts < 0` at month-end, savings clamp to `∆0`, mood takes an immediate `-12` penalty, respect drops `-0.4`, and a `-38` `broke` memory is recorded.

---

## 3. Per-Category Living Standards (`1–5`)

Instead of a single multiplier, every citizen chooses an independent living standard (**1 Minimum**, **2 Medium**, **3 Good**, **4 Comfortable Rich**, **5 Luxury**) for **Food**, **Water**, **Clothes**, and **Household** (`standards.ts`).

### Baseline Monthly Cost & Unit Prices (`constants.ts`)
| Category | Consumption Unit | L1 Min | L2 Med | L3 Good | L4 Rich | L5 Luxury |
| --- | --- | --- | --- | --- | --- | --- |
| **Food** | Per meal (`90/mo`) | `∆2` (`∆180/mo`) | `∆3` (`∆270/mo`) | `∆4` (`∆360/mo`) | `∆6` (`∆540/mo`) | `∆10` (`∆900/mo`) |
| **Water** | Per day (`30/mo`) | `∆0.5` (`∆15/mo`) | `∆0.8` (`∆24/mo`) | `∆1` (`∆30/mo`) | `∆1.5` (`∆45/mo`) | `∆3` (`∆90/mo`) |
| **Clothes** | Per outfit (`0.25/mo`) | `∆40` (`∆10/mo`) | `∆60` (`∆15/mo`) | `∆100` (`∆25/mo`) | `∆200` (`∆50/mo`) | `∆480` (`∆120/mo`) |
| **Household** | Per 30d pack (`1/mo`) | `∆10/mo` | `∆20/mo` | `∆40/mo` | `∆90/mo` | `∆250/mo` |

### How Standards Are Chosen
1. **Hard Poverty Floor:** Unemployed citizens with `< ∆900` savings immediately lock to `{1, 1, 1, 1}`.
2. **Discretionary Pool (`freeMoney`):** Subtracts fixed rent/bills, survival minimum (`∆215`), and personal target savings (`2%–21%` of net pay from `discipline`) from `netPay + largeSavingsBonus` (`4.5%` of savings exceeding `4×` survival minimum). High `kindness > 70` trims discretionary spend by `8%`.
3. **Trait-Weighted Split:**
   - Food weight: `1.1 + (sociability + greed) / 140`
   - Water weight: `0.75 + discipline / 220`
   - Clothes weight: `0.8 + (ambition + greed + sociability) / 170`
   - Household weight: `0.7 + discipline / 130`
4. **Budget Fit & Impulse Splurge:** If combined upgrades exceed `freeMoney + ∆5`, the citizen downgrades least-essential categories first (`household → clothes → water → food`). Conversely, greedy impulsive citizens (`greed > 68 && discipline < 42 && savings > ∆180`) have a `25%` monthly chance to impulsively upgrade clothes or food by `+1` standard.
5. **Gift Protection (`giftShieldDays`):** Receiving a gift protects against downward standard cuts for **14 days**.

---

## 4. Inventory, Consumption Rates & Shelf Life

Each citizen owns concrete, individually tracked inventory batches (`inventoryTypes.ts`, `citizenSeedHelpers.ts`, `citizenConsumption.ts`):

### Starting Inventory (Day 1)
- **Food:** `9` meals (`6` fresh age-`0` + `3` age-`1`) matching their seeded Food standard.
- **Water:** `7` day-units matching their Water standard.
- **Clothes:** `2–4` outfits with `68%–98%` condition.
- **Household:** `1` pack with `18–30` days remaining.

### Exact Daily Consumption & Decay Rates
Every simulation day executes in strict order (`citizenConsumption.ts`, `dailyCitizen.ts`):

1. **Pantry Food Spoilage (`FOOD_SPOIL_DAYS = 4`):**
   - Every stored food batch increments `daysOld += 1`. Any batch reaching `daysOld >= 4` spoils immediately, is removed from pantry, logged to `wasteLog`, and entered into the citizen's `lifeLog`.
2. **Hunger & Eating (`-36` hunger/day, up to `+39` restored):**
   - Daily hunger falls **`-36`** (`clamp(hunger - 36, 0, 100)`).
   - Citizens eat **3 meals/day** from their oldest non-spoiled batch first (`daysOld` descending).
   - Each meal restores **`+13` hunger** (3 meals = `+39`, net `+3/day` when fully fed). If a pantry has `< 3` meals, the citizen eats whatever remains (or `0`) and logs a `meal_choice` decision (`Eat Full 3 Meals`, `Partial`, or `Skip Meals`).
3. **Thirst & Drinking (`-45` thirst/day, `+47` restored):**
   - Daily thirst falls **`-45`** (`clamp(thirst - 45, 0, 100)`).
   - Citizens drink **1 day-unit/day**, restoring **`+47` thirst** (net `+2/day` when hydrated).
4. **Outfit Wear (`OUTFIT_WEAR_DAYS = 120`):**
   - Active outfit (`outfits[0]`) loses **`100 / 120` (`~0.833%`) condition per day**. At `<= 0%`, it wears out and is discarded to `wasteLog`.
5. **Household Pack Consumption (`HOUSEHOLD_PACK_DAYS = 30`):**
   - Active pack (`household[0]`) loses **`1` day/day**, discarded at `0` days left.
6. **Contamination & Food Poisoning (`citizenPoisoning.ts`):**
   - Eating/drinking any tainted unit triggers poisoning: medical bill **`∆50–∆150`** (capped at savings, logged to `monthlyLedger`), **`-20` health** (`-26` if `age > 55`), **`-15` mood**, `-2` Mart reputation, and a `-42` `illness` memory.

---

## 5. Shopping Intelligence, Panic Stockpiling & Price Memory

After consuming daily supplies, citizens decide whether and how much to shop at Vij Mart (`dailyCitizen.ts`, `martShopping.ts`).

### Buffer Buyers vs. Day-to-Day Buyers
- **Buffer Buyers (`savings >= ∆600 || discipline >= 60`):**
  - Shop for food when `< 3` meals remain (`< 6` during panic memory), targeting **`15 - totalMeals`** meals (`5 days` supply) plus panic/memory padding.
  - Shop for water when `< 2` days remain (`< 4` during panic memory), targeting **`7 - totalWater`** days (`7 days` supply) plus panic padding.
- **Hand-to-Mouth Buyers (`savings < ∆600 && discipline < 60`):**
  - Buy **`3` meals** of food or **`1` day** of water per trip (+ panic padding if scared and able to afford it).
- **Clothes & Household Triggers:** Buy `1` outfit only when `0` outfits remain or the last outfit drops `< 20%` condition; buy `1` household pack when `0` remain.

### Stock-Out Fallback, Rationing & Sticker Shock (`martShopping.ts`)
- **Stock-Out & 60-Day Panic Memory:** If preferred standard is out of stock (`qty <= 0`), `stockoutMemoryDays` jumps to `60`, a `-24` `stockout` memory is recorded, and the citizen tries **one living standard lower** (`preferred - 1`). If that is also empty (or preferred was L1), they go without today.
- **Rationing:** When Mart rationing is active (`< 2` days of food stock), purchases cap at **`3` meals of food** or **`1` unit** for other categories, creating a `-16` `rationing` memory if capped.
- **Affordability Trim:** Citizens step down purchase quantity (`qty -= 1`) until `savings >= qty × sellPrice`.
- **Price Memory & Sticker Shock:** Each citizen tracks `lastPaidPrices[category]`.
  - If `sellPrice >= remembered × 1.28`: **`-6` mood**, `-28` `price_shock` memory, and unless protected by `giftShieldDays > 0`, the citizen **permanently downgrades their category standard by `-1`** (recording both a `downgrade_upgrade` Decision Record and an `"Explain this change"` link).
  - If `sellPrice <= remembered × 0.82`: **`+2` mood** bargain relief.
- **Major Purchase Pride:** Spending `>= max(∆40, savings × 15%)` creates a `+14` `big_buy` memory.

---

## 6. Emotional Memory System (`citizenMemory.ts`)

Every citizen maintains up to **48 active memories** ranging in emotional weight from **`-100` to `+100`**.

### Weight Amplification & Non-Uniform Decay
When a memory forms, its `initialWeight` is amplified by current `stress` (`+0%` to `+25%`) and traits (`discipline`/`greed` amplify negative memories; `kindness` amplifies positive memories). Every day (`decayCitizenMemories`):
- **Strong events (`|weight| >= 70`):** Decay slowly at **`1.8%` / day**.
- **Moderate events (`40–69`):** Decay at **`3.2%` / day**.
- **Notable events (`20–39`):** Decay at **`5.0%` / day**.
- **Minor events (`< 20`):** Decay quickly at **`8.5%` / day**.
- Memories are pruned automatically once `|currentWeight| < 1`.

### Memory Triggers & Behavioral Effects (`getMemorySignals`)
- **Negative Triggers:** Property loss (`-14` to `-95`), Severe Thirst (`-42`), Ran Out of Money (`-38`), Poisoning (`-42`), Severe Hunger (`-32`), Price Shock (`-28`), Illness (`-26`), Stock-Out (`-24`), City Death (`-16` to `-45` for empathetic citizens), Rationing (`-16`).
- **Positive Triggers:** Gift Received (`+20` to `+80`), Stolen Goods Gained (`+10` to `+35`), Big Purchase (`+14`).
- **Behavioral Shifts:**
  - `cautionBonus` (`0` to `8`): Driven by `negWeight × traitMult × stressMult` — adds extra food stockpiling meals (`memExtraFood`) and shifts shopping/meal decision scores toward caution.
  - `martTrustDelta` (`-10` to `+10`): Raises/lowers shopping & standard confidence.
  - `linkedDecisionIds`: Memories tag every `DecisionRecord` they influenced, allowing two-way navigation between the **Memory** tab and **Why?** tab.

---

## 7. Stress System (`0–100`) (`citizenStress.ts`)

Stress measures daily psychological strain and reconciles into an exact signed breakdown (`stressBreakdown`):

- **Stress Drivers (Target Contributors):**
  - Baseline Vigilance (`+14`)
  - Hunger (`+11` below `55`, `+24` below `25`) & Thirst (`+13` below `55`, `+28` below `25`)
  - Poor Health (`+7` below `75`, `+16` below `50`)
  - Low Savings (`+9` under 1 month runway, `+18` under 0.25 months; **`-7`** if `>= 3` months saved)
  - Unemployment Worry (`+10`)
  - Painful Memories (`+0` to `+24` from weighted negative memories)
- **Stress Relief:** Positive Memories (`-0` to `-12`), Good Daily Living Relief (`-4` at L3+, `-7` at L4+ when fed & hydrated), Discipline Composure (`-0.08 × (discipline - 50)`).
- **Daily Drift:** Rises rapidly (`22%` of gap/day + immediate loss shocks) and heals more slowly (`12%` of gap/day).
- **Consequences:**
  - **Mood Penalty:** `-4` (`35–54`), `-10` (`55–74`), **`-16`** (`75+`).
  - **Health Drain:** `-0.4/day` (`58–69`), `-1.1/day` (`70–84`), **`-2.2/day`** (`85+`).

---

## 8. Mood, Health, Aging & Death (`citizenBreakdowns.ts`, `citizenHealthEvents.ts`)

### Signed Mood (`0–100`)
Every day, `stepMoodWithBreakdown` moves mood `14%` toward a multi-factor target (`±0.9` daily variance, minus grief from deaths today) and logs a **signed breakdown whose exact sum equals `citizen.mood`**:
- Baseline (`+54`) + Savings Runway (`-16` to `+14`) + Pay vs Living Costs (`-16` to `+9`) + Hunger (`-22`/`-10`) + Thirst (`-26`/`-12`) + Mart Stock-Out (`-6`) + Living Standards (`-4` to `+9`) + Stress Burden (`-4` to `-16`) + Memories & Trust (`-16` to `+14`) + Mart Reputation + Temperament + Grief + Daily Drift Inertia.

When citizens die, every living citizen loses `2 + ((kindness + sociability) / 200) × 4` mood (`2–6` points per death).

### Health, Illness & Death
- `agePenalty = age > 55 ? 1.2 : 1.0` (elderly citizens lose health **20% faster**).
- **`thirst <= 0`:** **`-34 × agePenalty`** health/day (`-40.8/day` over age 55 — lethal in ~3 days).
- **`hunger <= 0` (if hydrated):** **`-10 × agePenalty`** health/day.
- **Illness Roll (when fed & hydrated):** Based on `min(foodStandard, waterStandard)`:
  - **L1:** `2.5%/day` illness chance (`-10 × agePenalty` health), recovery `+1.4/day`.
  - **L2–L3:** `0.4%/day` illness chance (`-6 × agePenalty` health), recovery `+3.5/day`.
  - **L4–L5:** `0.1%/day` illness chance (`-6 × agePenalty` health), recovery `+6.0/day`.
- **Death (`health <= 0`):** Assigned cause (`dehydration` -> `starvation` -> `illness`), remaining savings transfer to City Treasury, inventory clears, and the citizen moves to the **In Memory** archive.

---

## 9. Status Score, Respect & Tier Hysteresis (`status.ts`, `monthlyTierUpdate.ts`)

Monthly status score (`0–100`) determines social tiers (**T1** `80+`, **T2** `60–79`, **T3** `40–59`, **T4** `20–39`, **T5** `<20`):
$$\text{TargetScore} = 0.40 \cdot \text{SavingsScore} + 0.25 \cdot \text{IncomeScore} + 0.20 \cdot \text{RoleScore} + 0.15 \cdot \text{Respect}$$
- `SavingsScore`: logarithmic across `∆0–∆20,000`.
- `IncomeScore`: square-root curve across `∆0–∆7,000`.
- `Respect`: rises `+0.2/mo` when net pay beats fixed bills (plus `+0.2` for L4+ clothes and `+0.1` for L4+ food), or drops `-0.4/mo` when unable to pay bills.
- **Stability Rules:** Status score can move at most **`±2.0` points/month**, and tier transitions require **`±3` hysteresis** (`83` to promote into T1, `77` to demote out of T1) to prevent oscillation.

---

## 10. Explainability, SimGod Powers & Logical Reactions

### Decision Records, Ledger & 60-Day Life Log
- **Decision Records (`citizenDecisions.ts`, `citizenSurvivalDecisions.ts`):** Every meaningful choice (`daily_shopping`, `meal_choice`, `standard_choice`, `downgrade_upgrade`, `tier_change`) records competing options, their signed factor scores, the chosen option, linked memory IDs, and a plain-language reason.
- **Monthly Money Ledger (`citizenLedger.ts`):** Tracks every income (`Salary`) and expense (`Tax`, `Housing`, `Fixed Living`, `Food`, `Water`, `Clothes`, `Household`, `Medical`) for the active month and resets cleanly on Day 1 of the next month.
- **Searchable 60-Day Life Log:** Retains a rolling 60-day personal diary covering meals eaten/skipped, purchases + prices, property losses/spoilage, gifts/gains, health/illness, mood/stress snapshots, and monthly payday/bills.
- **"Explain This Change":** Standard downgrades, mood drops (`>= 8` drop or crash `< 25`), and tier shifts link straight to the exact `DecisionRecord` in the **Why?** tab.

### SimGod Inventory Powers & Citizen Reactions (`simgodInventory*.ts`, `citizenReactions.ts`)
SimGod actions are tagged `"SimGod action"` in the global Event Log, while citizens **never perceive SimGod**—only natural causes (`Fire`, `Flood`, `Theft`, `Rats`, `Power Cut`, `Spoilage`, `Random Disaster`):
- **Destroy / Steal Loss Reaction:** Mood drops and stress spikes in proportion to lost `∆` value relative to financial cushion (`savings` + `discipline` soften the blow). Saves a weighted `loss` memory, activates `45–70` days of extra stockpiling (`stockoutMemoryDays`), and triggers an **immediate same-day Mart replacement purchase** if food (`< 3` meals) or water (`< 2` days) ran low—downgrading living standard if cash is tight, or skipping if broke.
- **Gift / Stolen Goods Received:** Receiving a gift grants `+4` to `+18` mood, reduces stress, saves a positive memory, and activates **`giftShieldDays = 14`** (preventing standard downgrades). Receiving stolen goods grants a smaller mood bump (`+2` to `+8`), records a `theft_gain` memory, and logs any SimGod-selected thief in the Event Log.
- **Direct Add / Edit:** Added food/water/clothes/household items sit directly in inventory and naturally suppress Mart purchases until consumed.
