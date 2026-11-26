// simgodTypes.ts — SimGod mass inventory selection types

import type { LivingStandard, ShoppingCategory } from './inventoryTypes';

export type MassTargetScope = 'single' | 'tier' | 'role' | 'all' | 'random';

export interface SimGodInvSelection {
  scope: MassTargetScope;
  citizenId?: string;
  tier?: 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
  role?: string;
  randomCount?: number;
  category: ShoppingCategory;
  standard: LivingStandard;
  quantity: number;
}
