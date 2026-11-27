// sharityUtilityTriggers.ts — Collects GJ Electricity power cut, blackout, and electronics Sharity triggers

import type { CompanyId } from './companyTypes';
import type { TriggerCandidate } from './sharityTriggers';
import type { Citizen } from './types';

export function collectUtilitySharityTriggers(params: {
  c: Citizen;
  totalDays: number;
  officialCompanyIds: CompanyId[];
  vars: Record<string, string>;
}): TriggerCandidate[] {
  const { c, totalDays, vars } = params;
  const out: TriggerCandidate[] = [];

  if (c.electricPowerCut) {
    out.push({
      authorId: c.id, topic: 'loss_hardship', triggerKey: 'power_cut_notice',
      triggerLabel: 'Home electricity disconnected', urgency: 74, isBigEvent: true, vars,
    });
  } else if (c.housePowerCutToday) {
    out.push({
      authorId: c.id, topic: 'city_mood', triggerKey: 'summer_blackout',
      triggerLabel: 'Evening grid blackout hit home', urgency: 72, isBigEvent: true, vars,
    });
  } else if (c.subsidyHistory?.[0]?.day === totalDays && c.subsidyHistory[0].amountSaved >= 10) {
    out.push({
      authorId: c.id, topic: 'daily_life', triggerKey: 'subsidy_relief',
      triggerLabel: 'Received GJ electricity subsidy', urgency: 56, isBigEvent: false, vars,
    });
  } else if (c.electricityAwareness && c.electricityAwareness.trustInGJ < 35 && c.electricityAwareness.lastKnownBill > 45) {
    out.push({
      authorId: c.id, topic: 'city_mood', triggerKey: 'bill_shock_trust',
      triggerLabel: 'Frustrated with GJ billing', urgency: 60, isBigEvent: false, vars,
    });
  }

  for (const app of c.inventory.electronics ?? []) {
    if (app.broken && app.brokenDay === totalDays) {
      out.push({
        authorId: c.id, topic: 'loss_hardship', triggerKey: 'appliance_broken',
        triggerLabel: `${app.name} broke down`, urgency: 60, isBigEvent: false,
        vars: { ...vars, item: app.name.toLowerCase(), tier: app.tier },
      });
    } else if (!app.broken && app.boughtDay === totalDays) {
      out.push({
        authorId: c.id, topic: app.tier === 'premium' ? 'status_flex' : 'daily_life',
        triggerKey: 'appliance_flex',
        triggerLabel: `Bought ${app.tier} ${app.name}`, urgency: app.tier === 'premium' ? 58 : 42, isBigEvent: false,
        vars: { ...vars, item: app.name.toLowerCase(), tier: app.tier },
      });
    }
  }

  return out;
}
