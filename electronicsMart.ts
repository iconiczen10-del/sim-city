// electronicsMart.ts — Vij Mart electronics stock seeding, mood pricing, Vij Industries wholesale orders, and retail purchase

import { MART_CASH_RESERVE, MART_LEAD_TIME_DAYS, MART_SUPPLIER, MOOD_MARGIN_RANGES, OUTSIDE_WHOLESALE_MULT } from './constants';
import { APPLIANCE_CATALOG, createOwnedAppliance } from './electronicsCatalog';
import { ensureMartElectronics } from './electronicsMartSetup';
import type { ApplianceId, ApplianceTier, ElectronicsOrder, OwnedAppliance } from './electronicsTypes';
import { appendLedgerEntry } from './citizenLedger';
import { makeCityEvent, type SimClock } from './eventFactory';
import { round2 } from './martSetup';
import type { MarginMood, MartState } from './martTypes';
import { recordSimEvent } from './recordsStore';
import { simRand } from './rng';
import type { Citizen, CityEvent } from './types';

export { createInitialElectronicsStock, defaultElectronicsMood, ensureMartElectronics } from './electronicsMartSetup';

export function stepElectronicsMartDayStart(mart: MartState, clock: SimClock, events: CityEvent[]): void {
  ensureMartElectronics(mart);
  for (const s of mart.electronicsStock!) s.salesHistory = [...s.salesHistory.slice(-13), 0];
  const pending: ElectronicsOrder[] = [];
  for (const ord of mart.electronicsDeliveries!) {
    ord.etaDays -= 1;
    if (ord.etaDays <= 0) {
      const sku = mart.electronicsStock!.find((s) => s.applianceId === ord.applianceId && s.tier === ord.tier);
      if (sku) sku.quantity += ord.quantity;
      events.push(makeCityEvent(clock, `edeliv_${ord.id}`, {
        type: 'delivery', title: 'Electronics Restocked',
        detail: `Vij Mart received ${ord.quantity}x ${APPLIANCE_CATALOG[ord.applianceId].name} (${ord.tier}) from ${ord.supplier}.`,
      }));
    } else pending.push(ord);
  }
  mart.electronicsDeliveries = pending;
}

export function stepElectronicsMartDayEnd(
  mart: MartState,
  clock: SimClock,
  dateLabel: string,
  outsideSupplierActive: boolean
): void {
  ensureMartElectronics(mart);
  const mood = mart.electronicsMood!;
  mood.daysRemaining -= 1;
  if (mood.daysRemaining <= 0) {
    const lowStockRatio = mart.electronicsStock!.filter((s) => s.quantity <= 1).length / mart.electronicsStock!.length;
    let nextMood: MarginMood = 'typical';
    if (lowStockRatio > 0.45) nextMood = 'greedy';
    else if (mart.cash < 5000) nextMood = 'clearance';
    else if (mart.reputation < 45) nextMood = 'generous';
    else nextMood = simRand() < 0.25 ? 'good' : 'typical';
    const [lo, hi] = MOOD_MARGIN_RANGES[nextMood];
    const mFrac = lo + simRand() * (hi - lo);
    mood.mood = nextMood;
    mood.marginPct = Math.round(mFrac * 1000) / 10;
    mood.daysRemaining = 4;
    mood.reason = lowStockRatio > 0.45 ? 'Tight appliance shelves lifted margin' : 'Routine electronics pricing review';
  }
  const costMult = outsideSupplierActive ? OUTSIDE_WHOLESALE_MULT : 1;
  for (const sku of mart.electronicsStock!) {
    sku.sellPrice = Math.max(5, Math.round(sku.buyCost * costMult * (1 + mood.marginPct / 100)));
  }

  if (mart.closedDaysLeft > 0 || mart.closedUntilFunded) return;
  for (const sku of mart.electronicsStock!) {
    if (mart.electronicsDeliveries!.some((d) => d.applianceId === sku.applianceId && d.tier === sku.tier)) continue;
    const minTarget = APPLIANCE_CATALOG[sku.applianceId].essential ? 4 : 2;
    if (sku.quantity > 1) continue;
    const qty = Math.max(2, minTarget + 2 - sku.quantity);
    const totalCost = round2(qty * sku.buyCost * costMult);
    if (mart.cash - totalCost < MART_CASH_RESERVE) continue;
    mart.cash = round2(mart.cash - totalCost);
    mart.monthlyWholesaleSpend = round2(mart.monthlyWholesaleSpend + totalCost);
    mart.electronicsDeliveries!.push({
      id: `eord_${clock.totalDays}_${sku.applianceId}_${sku.tier}`,
      supplier: outsideSupplierActive ? 'Outside Vij Wholesale' : MART_SUPPLIER,
      applianceId: sku.applianceId, tier: sku.tier, quantity: qty, totalCost,
      etaDays: MART_LEAD_TIME_DAYS, orderedDate: dateLabel,
    });
  }
}

export function buyElectronicsFromMart(params: {
  citizen: Citizen;
  mart: MartState;
  applianceId: ApplianceId;
  tier: ApplianceTier;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): OwnedAppliance | null {
  const { citizen, mart, applianceId, tier, clock, dateLabel, events } = params;
  ensureMartElectronics(mart);
  if (mart.closedDaysLeft > 0 || mart.closedUntilFunded) return null;
  const sku = mart.electronicsStock!.find((s) => s.applianceId === applianceId && s.tier === tier && s.quantity > 0)
    ?? mart.electronicsStock!.find((s) => s.applianceId === applianceId && s.quantity > 0);
  if (!sku || citizen.savings < sku.sellPrice) return null;

  sku.quantity -= 1;
  sku.salesHistory[sku.salesHistory.length - 1] += 1;
  citizen.savings = Math.round((citizen.savings - sku.sellPrice) * 100) / 100;
  mart.cash = round2(mart.cash + sku.sellPrice);
  mart.todayRevenue = round2(mart.todayRevenue + sku.sellPrice);
  mart.monthlyRevenue = round2(mart.monthlyRevenue + sku.sellPrice);
  if (!mart.customersTodayIds.includes(citizen.id)) mart.customersTodayIds.push(citizen.id);

  const owned = createOwnedAppliance(
    `app_${citizen.id}_${applianceId}_${clock.totalDays}`,
    applianceId, sku.tier, sku.sellPrice, clock.totalDays, dateLabel, 1
  );
  if (!citizen.inventory.electronics) citizen.inventory.electronics = [];
  citizen.inventory.electronics = [
    ...citizen.inventory.electronics.filter((e) => e.applianceId !== applianceId || !e.broken),
    owned,
  ].slice(-18);

  appendLedgerEntry(citizen, clock.totalDays, dateLabel, 'expense', 'Electronics', `${owned.name} (${sku.tier})`, sku.sellPrice);
  recordSimEvent({
    simDay: clock.totalDays, dateLabel, category: 'electronics', subType: 'appliance_purchase',
    subjectId: citizen.id, subjectKind: 'citizen', subjectName: citizen.name,
    summary: `${citizen.name} bought ${sku.tier} ${owned.name} for ∆${sku.sellPrice} (lifespan ${owned.totalLifespanDays}d)`,
    detail: { applianceId: owned.applianceId, name: owned.name, tier: sku.tier, price: sku.sellPrice, totalLifespanDays: owned.totalLifespanDays },
  });
  events.push(makeCityEvent(clock, `ebuy_${citizen.id}_${applianceId}`, {
    type: 'appliance-buy', citizenId: citizen.id, citizenName: citizen.name, companyId: 'vijmart',
    title: 'Electronics Purchase', detail: `${citizen.name} bought a ${sku.tier} ${owned.name} for ∆${sku.sellPrice}.`,
  }));
  return owned;
}
