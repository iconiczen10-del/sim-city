// martOrderHelpers.ts — Auto delivery gap selection and manager-attributed decision logging

import { MART_RUSH_FEE } from './constants';
import { CATEGORY_LABELS, formatDelta } from './formatters';
import type { MartManagerTraits } from './martManager';
import type { MartState, MartStockItem, ShoppingCategory } from './martTypes';

export function chooseAutoGapDays(mart: MartState, cat: ShoppingCategory): number {
  if (cat === 'food') return 3;
  if (cat === 'water') return mart.cash < 3000 ? 3 : 4;
  return mart.personality.style === 'aggressive' ? 6 : 4;
}

export function logOrderDecision(
  mart: MartState,
  item: MartStockItem,
  qty: number,
  useRush: boolean,
  rushPaidNow: boolean,
  totalDays: number,
  dateLabel: string,
  profile: MartManagerTraits
): void {
  const gt = Math.round(item.groundTruthForecast ?? item.dailyForecast);
  const ema = Math.round(item.salesEma ?? item.dailyForecast);
  const unitLabel = item.category === 'food' ? 'meals' : CATEGORY_LABELS[item.category].toLowerCase();
  const rushNote = useRush
    ? ` Stock-out rush (1d ETA${rushPaidNow ? `, +${formatDelta(MART_RUSH_FEE)} fee` : ''}).`
    : '';
  mart.decisionLog.unshift({
    id: `dec_o_${totalDays}_${item.category}_${item.standard}`,
    dateLabel,
    category: item.category,
    managerName: profile.managerName,
    summary: `${profile.managerName} ordered ${qty} ${unitLabel} (L${item.standard})`,
    reason: `Forecast: ground truth ${gt} + EMA ${ema} (${Math.round(profile.gtWeight * 100)}/${Math.round(profile.emaWeight * 100)}). ${profile.safetyReason}. Cash reserve protected.${rushNote}`,
  });
  mart.decisionLog = mart.decisionLog.slice(0, 80);
}
