// electronicsMartSetup.ts — Initial Vij Mart electronics inventory seeding and default margin mood

import { MART_WHOLESALE_RATIO } from './constants';
import { APPLIANCE_CATALOG, APPLIANCE_IDS, APPLIANCE_TIERS } from './electronicsCatalog';
import type { ElectronicsStockItem } from './electronicsTypes';
import { round2 } from './martSetup';
import type { CategoryMoodState, MartState } from './martTypes';

export function createInitialElectronicsStock(): ElectronicsStockItem[] {
  const items: ElectronicsStockItem[] = [];
  for (const applianceId of APPLIANCE_IDS) {
    const spec = APPLIANCE_CATALOG[applianceId];
    for (const tier of APPLIANCE_TIERS) {
      const basePrice = spec.prices[tier];
      const buyCost = round2(basePrice * MART_WHOLESALE_RATIO);
      const qty = spec.essential ? (tier === 'basic' ? 8 : tier === 'mid' ? 6 : 4) : (tier === 'basic' ? 5 : tier === 'mid' ? 4 : 3);
      items.push({
        applianceId,
        tier,
        quantity: qty,
        basePrice,
        buyCost,
        sellPrice: basePrice,
        dailyForecast: spec.essential ? 0.35 : 0.15,
        salesHistory: [0],
      });
    }
  }
  return items;
}

export function defaultElectronicsMood(): CategoryMoodState {
  return { mood: 'typical', marginPct: 48, daysRemaining: 4, reason: 'Standard retail electronics margin' };
}

export function ensureMartElectronics(mart: MartState): void {
  if (!Array.isArray(mart.electronicsStock) || mart.electronicsStock.length === 0) {
    mart.electronicsStock = createInitialElectronicsStock();
  }
  if (!mart.electronicsMood) mart.electronicsMood = defaultElectronicsMood();
  if (!Array.isArray(mart.electronicsDeliveries)) mart.electronicsDeliveries = [];
}
