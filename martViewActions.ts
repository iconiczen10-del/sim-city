// martViewActions.ts — Builds confirmed SimGod sabotage handlers for MartView

import { formatDelta } from './formatters';
import type { SabotageHandlers } from './MartSabotagePanel';
import {
  applyContamination,
  applyManagerPersonality,
  applyMartCashChange,
  applyPriceOverride,
  applyShopClosure,
  applyStockSabotage,
} from './simgodSabotage';
import type { CityState } from './types';

export function buildSabotageHandlers(
  confirm: (title: string, message: string, fn: (prev: CityState) => CityState) => void
): SabotageHandlers {
  return {
    onStock: (act, cat, std, pct) =>
      confirm(
        `${act === 'destroy' ? 'Destroy' : 'Steal'} Stock?`,
        `Remove ${pct}% of ${cat} L${std} from Vij Mart?`,
        (p) => applyStockSabotage(p, act, cat, std, pct)
      ),
    onContaminate: (cat, std, qty) =>
      confirm(
        'Contaminate Batch?',
        `Taint ${qty} units of ${cat} L${std}? Citizens eating it will suffer food poisoning.`,
        (p) => applyContamination(p, cat, std, qty)
      ),
    onPrice: (cat, mode, val, days) =>
      confirm(
        'Override Prices?',
        mode === 'release'
          ? `Release ${cat} price override?`
          : `Override ${cat} price (${mode} ${val}) for ${days} days?`,
        (p) => applyPriceOverride(p, cat, mode, val, days)
      ),
    onCloseShop: (days) =>
      confirm(
        days > 0 ? 'Close Vij Mart?' : 'Reopen Vij Mart?',
        days > 0 ? `Close Vij Mart for ${days} days?` : 'Reopen Vij Mart immediately?',
        (p) => applyShopClosure(p, days)
      ),
    onCash: (delta) =>
      confirm(
        delta >= 0 ? 'Add Mart Cash?' : 'Drain Mart Cash?',
        `${delta >= 0 ? 'Inject' : 'Drain'} ${formatDelta(Math.abs(delta))} in Vij Mart cash?`,
        (p) => {
          const updated = applyMartCashChange(p, delta);
          const reopened = !updated.mart.closedUntilFunded && delta > 0;
          return {
            ...updated,
            companies: updated.companies.map((c) =>
              c.id === 'vijmart'
                ? {
                    ...c,
                    cash: updated.mart.cash,
                    bankrupt: reopened ? false : c.bankrupt,
                    negativeCashStreak: reopened ? 0 : c.negativeCashStreak,
                  }
                : c
            ),
          };
        }
      ),
    onPersonality: (style, lean) =>
      confirm(
        'Change Manager Personality?',
        `Set Vij Mart manager to ${style} (lean ${lean})?`,
        (p) => applyManagerPersonality(p, style, lean)
      ),
  };
}
