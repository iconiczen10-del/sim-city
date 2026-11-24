// electronicsCitizen.ts — Citizen appliance seeding, daily wear/breakdown, broken-item penalties, and buying AI

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { applyEmotionPulse } from './citizenEmotions';
import { appendLifeLog } from './citizenLedger';
import { clamp } from './economy';
import { getSeasonFromMonth } from './electricityCatalog';
import { APPLIANCE_CATALOG, createOwnedAppliance } from './electronicsCatalog';
import { buyElectronicsFromMart, ensureMartElectronics } from './electronicsMart';
import type { ApplianceId, ApplianceTier, OwnedAppliance } from './electronicsTypes';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import type { MartState } from './martTypes';
import { simRand, simRandFloat } from './rng';
import type { Citizen, CityEvent } from './types';

function tierForCitizen(c: Citizen): ApplianceTier {
  if (c.tier === 'T1' || c.tier === 'T2') return 'premium';
  if (c.tier === 'T3') return 'mid';
  return 'basic';
}

export function seedCitizenElectronics(citizen: Citizen): void {
  if (citizen.inventory.electronics && citizen.inventory.electronics.length > 0) return;
  const tier = tierForCitizen(citizen);
  const ratio = () => simRandFloat(0.35, 0.92);
  const owned: OwnedAppliance[] = [
    createOwnedAppliance(`app_${citizen.id}_phone_0`, 'phone', tier, APPLIANCE_CATALOG.phone.prices[tier], 1, '1 Jan, Year 1', ratio()),
    createOwnedAppliance(`app_${citizen.id}_lamp_0`, 'lamp', tier, APPLIANCE_CATALOG.lamp.prices[tier], 1, '1 Jan, Year 1', ratio()),
  ];
  if (citizen.homeType !== 'shared_room' || citizen.savings >= 500) {
    owned.push(createOwnedAppliance(`app_${citizen.id}_cooker_0`, 'cooker', tier, APPLIANCE_CATALOG.cooker.prices[tier], 1, '1 Jan, Year 1', ratio()));
    owned.push(createOwnedAppliance(`app_${citizen.id}_fridge_0`, 'fridge', tier, APPLIANCE_CATALOG.fridge.prices[tier], 1, '1 Jan, Year 1', ratio()));
  }
  if (citizen.tier === 'T1' || citizen.tier === 'T2' || citizen.tier === 'T3') {
    owned.push(createOwnedAppliance(`app_${citizen.id}_fan_0`, 'fan', tier, APPLIANCE_CATALOG.fan.prices[tier], 1, '1 Jan, Year 1', ratio()));
    owned.push(createOwnedAppliance(`app_${citizen.id}_tv_0`, 'television', tier, APPLIANCE_CATALOG.television.prices[tier], 1, '1 Jan, Year 1', ratio()));
  }
  if (citizen.tier === 'T1' || citizen.tier === 'T2') {
    owned.push(createOwnedAppliance(`app_${citizen.id}_heater_0`, 'heater', tier, APPLIANCE_CATALOG.heater.prices[tier], 1, '1 Jan, Year 1', ratio()));
    owned.push(createOwnedAppliance(`app_${citizen.id}_washer_0`, 'washing_machine', tier, APPLIANCE_CATALOG.washing_machine.prices[tier], 1, '1 Jan, Year 1', ratio()));
    owned.push(createOwnedAppliance(`app_${citizen.id}_laptop_0`, 'laptop', tier, APPLIANCE_CATALOG.laptop.prices[tier], 1, '1 Jan, Year 1', ratio()));
  }
  citizen.inventory.electronics = owned;
}

export function hasWorkingAppliance(citizen: Citizen, applianceId: ApplianceId): boolean {
  if (citizen.housePowerCutToday) return false;
  return (citizen.inventory.electronics ?? []).some((e) => e.applianceId === applianceId && !e.broken);
}

export function stepCitizenElectronicsDaily(
  citizen: Citizen,
  mart: MartState,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): void {
  if (!citizen.inventory.electronics) seedCitizenElectronics(citizen);
  ensureMartElectronics(mart);
  const season = getSeasonFromMonth(clock.month);

  for (const item of citizen.inventory.electronics!) {
    if (item.broken) continue;
    item.daysLeft -= 1;
    if (item.daysLeft <= 0) {
      item.daysLeft = 0;
      item.broken = true;
      item.brokenDay = clock.totalDays;
      appendLifeLog(citizen, clock.totalDays, dateLabel, 'loss', `${item.name} (${item.tier}) broke down after ${item.totalLifespanDays}d.`);
      applyEmotionPulse(citizen.emotions, 'sadness', 5, `${item.name} broke`, clock, dateLabel);
      events.push(makeCityEvent(clock, `ebrk_${citizen.id}_${item.applianceId}_${clock.totalDays}`, {
        type: 'appliance-broke', citizenId: citizen.id, citizenName: citizen.name,
        title: `${item.name} Broke Down`, detail: `${citizen.name}'s ${item.tier} ${item.name} failed after ${item.totalLifespanDays} days.`,
      }));
    }
  }

  // Daily broken / missing / power-cut penalties
  const n = citizen.needs;
  if (!hasWorkingAppliance(citizen, 'phone')) {
    n.social.value = clamp(n.social.value - 3.5, 0, 100);
    n.fun.value = clamp(n.fun.value - 2.0, 0, 100);
  }
  if (season === 'Summer' && !hasWorkingAppliance(citizen, 'fan')) {
    citizen.stress = clamp(citizen.stress + 2.2, 0, 100);
    citizen.mood = clamp(citizen.mood - 1.5, 0, 100);
  }
  if (season === 'Winter' && !hasWorkingAppliance(citizen, 'heater')) {
    citizen.health = clamp(citizen.health - 1.2, 0, 100);
    citizen.mood = clamp(citizen.mood - 1.2, 0, 100);
  }
  if (hasWorkingAppliance(citizen, 'television')) n.fun.value = clamp(n.fun.value + 4, 0, 100);
  else if ((citizen.inventory.electronics ?? []).some((e) => e.applianceId === 'television' && e.broken)) n.fun.value = clamp(n.fun.value - 1.5, 0, 100);
  if (hasWorkingAppliance(citizen, 'laptop')) n.fun.value = clamp(n.fun.value + 3, 0, 100);
  if (hasWorkingAppliance(citizen, 'washing_machine')) n.hygiene.value = clamp(n.hygiene.value + 3.5, 0, 100);
  if (!hasWorkingAppliance(citizen, 'lamp')) citizen.mood = clamp(citizen.mood - 1.0, 0, 100);

  // Buying / replacement logic
  if (citizen.housePowerCutToday || mart.closedDaysLeft > 0 || mart.closedUntilFunded) return;
  const wantOrder: ApplianceId[] = [
    'phone', 'lamp', 'cooker', 'fridge',
    ...(season === 'Summer' ? ['fan' as const] : []),
    ...(season === 'Winter' ? ['heater' as const] : []),
    ...(citizen.tier === 'T1' || citizen.tier === 'T2' || citizen.savings > 1800 ? ['washing_machine' as const, 'television' as const, 'laptop' as const] : []),
  ];
  const preferredTier = tierForCitizen(citizen);
  for (const appId of wantOrder) {
    const owned = (citizen.inventory.electronics ?? []).find((e) => e.applianceId === appId);
    if (owned && !owned.broken) continue;
    const targetTier: ApplianceTier = citizen.traits.thriftiness > 70 || citizen.savings < 900 ? 'basic' : preferredTier;
    const sku = mart.electronicsStock!.find((s) => s.applianceId === appId && s.tier === targetTier && s.quantity > 0)
      ?? mart.electronicsStock!.find((s) => s.applianceId === appId && s.quantity > 0);
    if (!sku) continue;
    const cushion = APPLIANCE_CATALOG[appId].essential ? 90 : 500;
    if (citizen.savings < sku.sellPrice + cushion) continue;
    if (!owned && simRand() > (APPLIANCE_CATALOG[appId].essential ? 0.35 : 0.12)) continue;

    const bought = buyElectronicsFromMart({ citizen, mart, applianceId: appId, tier: sku.tier, clock, dateLabel, events });
    if (bought) {
      recordConsequentialDecision({
        citizen, clock, dateLabel, kind: 'daily_shopping', category: 'household',
        title: `${owned ? 'Replace' : 'Buy'} ${bought.name}`,
        chosenOption: `Buy ${bought.tier} ${bought.name} (${formatDelta(bought.purchasePrice)})`,
        altOption: 'Defer Purchase',
        chosenReason: owned ? `Replaced broken ${bought.name} while keeping ${formatDelta(citizen.savings)} reserve.` : `Upgraded household with ${bought.name}.`,
        chosenFactors: [{ label: APPLIANCE_CATALOG[appId].essential ? 'Essential Need' : 'Lifestyle Upgrade', value: 22 }, { label: 'Savings Cushion', value: 14 }],
        altFactors: [{ label: 'Thriftiness', value: Math.round(citizen.traits.thriftiness * 0.25) }],
        diarySentence: `${owned ? 'Replaced broken' : 'Bought'} ${bought.tier} ${bought.name} at Vij Mart.`,
      });
      break; // max 1 appliance per day
    }
  }
}
