// outerCityWaterPurchase.ts — Emergency unlimited L1-L5 Outer City Water fulfillment, lost Mart sales, memories, and logs

import { addInventoryToCitizen } from './citizenInventoryGrant';
import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import type { SimClock } from './eventFactory';
import { formatPrice, STANDARD_LABELS } from './formatters';
import type { DistrictId } from './housingPrefTypes';
import type { HousingState } from './housingTypes';
import { findStockItem, round2 } from './martSetup';
import type { LivingStandard, MartState } from './martTypes';
import { DISTRICT_WATER_DIST_MULT, ensureOuterCityWater, OUTER_SUPPLIER_LABELS } from './outerCityWater';
import { recordSimEvent } from './recordsStore';
import type { Citizen, CityEvent } from './types';

function computeBuyerUnitPrice(
  mart: MartState,
  level: LivingStandard,
  district: DistrictId | 'edge',
  qty: number,
  priorBuys: number
): { unitPrice: number; martPrice: number } {
  const ocw = ensureOuterCityWater(mart);
  const baseSnap = ocw.pricesByLevel[level] ?? 1;
  const martPrice = findStockItem(mart, 'water', level)?.sellPrice ?? baseSnap;
  const distMult = DISTRICT_WATER_DIST_MULT[district] ?? 1.05;
  const qtyMult = qty >= 4 ? 0.94 : qty === 1 ? 1.04 : 1.0;
  const regularMult = priorBuys >= 3
    ? (ocw.personality === 'fair_trader' ? 0.92 : ocw.personality === 'opportunist' ? 0.98 : 1.06)
    : 1.0;
  let unit = round2(baseSnap * distMult * qtyMult * regularMult);
  if (!ocw.override) {
    unit = Math.max(unit, round2(martPrice * 1.15));
  }
  return { unitPrice: Math.max(0.6, unit), martPrice };
}

export function buyOuterCityWater(params: {
  payer: Citizen;
  recipient?: Citizen;
  mart: MartState;
  housing?: HousingState;
  preferredStandard: LivingStandard;
  desiredQty: number;
  reason: string;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
  ledgerCategory?: string;
}): number {
  const { payer, mart, housing, preferredStandard, desiredQty, reason, clock, dateLabel } = params;
  const recipient = params.recipient ?? payer;
  if (desiredQty <= 0) return 0;

  const ocw = ensureOuterCityWater(mart);
  const district: DistrictId | 'edge' = payer.homeId
    ? (housing?.houses.find((h) => h.id === payer.homeId)?.district ?? 'edge')
    : 'edge';
  const priorBuys = ocw.buyerCounts[payer.id] ?? 0;

  let chosenLevel = preferredStandard;
  let pricing = computeBuyerUnitPrice(mart, chosenLevel, district, desiredQty, priorBuys);
  if (payer.savings < pricing.unitPrice) {
    for (let l = preferredStandard - 1; l >= 1; l -= 1) {
      const cand = computeBuyerUnitPrice(mart, l as LivingStandard, district, desiredQty, priorBuys);
      if (payer.savings >= cand.unitPrice) {
        chosenLevel = l as LivingStandard;
        pricing = cand;
        break;
      }
    }
  }

  let qty = desiredQty;
  while (qty > 0 && payer.savings < round2(qty * pricing.unitPrice)) qty -= 1;
  if (qty <= 0) return 0;

  const finalPricing = computeBuyerUnitPrice(mart, chosenLevel, district, qty, priorBuys);
  while (qty > 0 && payer.savings < round2(qty * finalPricing.unitPrice)) qty -= 1;
  if (qty <= 0) return 0;

  const totalCost = round2(qty * finalPricing.unitPrice);
  const lostRev = round2(qty * finalPricing.martPrice);
  payer.savings = round2(payer.savings - totalCost);
  addInventoryToCitizen(recipient, 'water', chosenLevel, qty, 0, clock.totalDays);
  recipient.lastPaidPrices.water = finalPricing.unitPrice;

  ocw.buyerCounts[payer.id] = priorBuys + 1;
  ocw.totalUnitsSold += qty;
  ocw.totalRevenue = round2(ocw.totalRevenue + totalCost);
  ocw.lostMartSalesCount += qty;
  ocw.lostMartRevenue = round2(ocw.lostMartRevenue + lostRev);
  ocw.lostMartTodayCount += qty;

  const rec = {
    id: `ocw_${clock.totalDays}_${payer.id}_${ocw.purchaseLog.length}`,
    totalDay: clock.totalDays, dateLabel, category: 'water' as const,
    standard: chosenLevel, quantity: qty, unitPrice: finalPricing.unitPrice, totalPrice: totalCost,
    source: 'outer_city' as const,
  };
  recipient.recentPurchases = [rec, ...recipient.recentPurchases].slice(0, 12);
  mart.salesLog.unshift({ ...rec, citizenId: recipient.id, citizenName: recipient.name });
  ocw.purchaseLog.unshift({
    id: rec.id, day: clock.totalDays, dateLabel,
    buyerId: payer.id, buyerName: payer.name,
    recipientId: recipient.id !== payer.id ? recipient.id : undefined,
    recipientName: recipient.id !== payer.id ? recipient.name : undefined,
    district, level: chosenLevel, quantity: qty,
    unitPrice: finalPricing.unitPrice, totalPrice: totalCost, martUnitPrice: finalPricing.martPrice, reason,
  });
  ocw.purchaseLog = ocw.purchaseLog.slice(0, 120);

  addCitizenMemory(payer, clock, dateLabel, 'outer_water', `Had to buy ${qty}x L${chosenLevel} water from Outer City (${formatPrice(totalCost)}) — ${reason}.`, -16);
  appendLedgerEntry(payer, clock.totalDays, dateLabel, 'expense', params.ledgerCategory ?? 'Outer City Water', `${qty}x L${chosenLevel} water (${reason})`, totalCost);
  appendLifeLog(payer, clock.totalDays, dateLabel, 'shop', `Bought ${qty}x L${chosenLevel} (${STANDARD_LABELS[chosenLevel]}) Outer City water for ${formatPrice(totalCost)} (${reason}).`);
  recordSimEvent({
    simDay: clock.totalDays, dateLabel, category: 'shopping', subType: 'outer_city_water',
    subjectId: payer.id, subjectKind: 'citizen', subjectName: payer.name,
    summary: `${payer.name} bought ${qty}x L${chosenLevel} Outer City Water (${formatPrice(totalCost)}) — ${reason}`,
    detail: { level: chosenLevel, quantity: qty, unitPrice: finalPricing.unitPrice, martUnitPrice: finalPricing.martPrice, totalCost, district, personality: OUTER_SUPPLIER_LABELS[ocw.personality], reason, recipientId: recipient.id },
  });
  return qty;
}
