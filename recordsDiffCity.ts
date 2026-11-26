// recordsDiffCity.ts — Post-day diffs for houses, electricity daily usage, Mart/companies, and daily city totals

import { formatDelta, formatSimDate } from './formatters';
import type { PreDaySnapshot } from './recordsSnapshot';
import { recordSimEvent } from './recordsStore';
import type { CityState } from './types';

export function recordCityAndInfraDaily(snap: PreDaySnapshot, city: CityState): void {
  const simDay = city.totalDays;
  const dateLabel = formatSimDate(city.day, city.month, city.year);

  for (const h of city.housing.houses) {
    const prev = snap.houses.get(h.id);
    if (prev) {
      if (h.condition !== prev.condition) {
        recordSimEvent({
          simDay, dateLabel, category: 'housing', subType: 'house_cond',
          subjectId: h.id, subjectKind: 'house', subjectName: h.name,
          summary: `${h.name} condition ${prev.condition} → ${h.condition}/100`,
          detail: { from: prev.condition, to: h.condition },
        });
      }
      if (
        h.scores.comfort !== prev.comfort || h.scores.space !== prev.space
        || h.scores.noise !== prev.noise || h.scores.privacy !== prev.privacy || h.scores.safety !== prev.safety
      ) {
        recordSimEvent({
          simDay, dateLabel, category: 'housing', subType: 'house_scores',
          subjectId: h.id, subjectKind: 'house', subjectName: h.name,
          summary: `${h.name} scores updated (C${Math.round(h.scores.comfort)} S${Math.round(h.scores.space)} N${Math.round(h.scores.noise)} P${Math.round(h.scores.privacy)} Sf${Math.round(h.scores.safety)})`,
          detail: { prev, next: h.scores },
        });
      }
      if (h.rentPrice !== prev.rentPrice) {
        recordSimEvent({
          simDay, dateLabel, category: 'housing', subType: 'rent_change',
          subjectId: h.id, subjectKind: 'house', subjectName: h.name,
          summary: `${h.name} rent shifted ${formatDelta(prev.rentPrice)} → ${formatDelta(h.rentPrice)}/mo`,
          detail: { from: prev.rentPrice, to: h.rentPrice, district: h.district },
        });
      }
    }

    const todayU = h.electricLedger?.todayUnits ?? 0;
    if (todayU > 0) {
      recordSimEvent({
        simDay, dateLabel, category: 'electricity', subType: 'usage',
        subjectId: h.id, subjectKind: 'house', subjectName: h.name,
        summary: `${h.name} used ${todayU.toFixed(1)}u today (MTD ${(h.electricLedger?.monthUnits ?? 0).toFixed(1)}u)`,
        detail: { units: todayU, monthUnits: h.electricLedger?.monthUnits ?? 0, district: h.district },
      });
    }
  }

  for (const comp of city.companies) {
    const cu = city.electricity?.companyLedgers[comp.id]?.todayUnits ?? 0;
    if (cu > 0) {
      recordSimEvent({
        simDay, dateLabel, category: 'electricity', subType: 'usage',
        subjectId: comp.id, subjectKind: comp.id === 'gjelectricity' ? 'gjelectricity' : 'company', subjectName: comp.name,
        summary: `${comp.name} drew ${cu.toFixed(1)}u today`,
        detail: { units: cu, monthUnits: city.electricity?.companyLedgers[comp.id]?.monthUnits ?? 0 },
      });
    }
    if (snap.companyFreeze[comp.id] !== undefined && snap.companyFreeze[comp.id] !== comp.payFreeze) {
      recordSimEvent({
        simDay, dateLabel, category: 'companies', subType: 'pay_change',
        subjectId: comp.id, subjectKind: 'company', subjectName: comp.name,
        summary: `${comp.name} ${comp.payFreeze ? 'enacted pay freeze' : 'lifted pay freeze'}`,
        detail: { payFreeze: comp.payFreeze, cash: comp.cash },
      });
    }
    if (snap.companyRep[comp.id] !== undefined && Math.abs(Math.round(comp.reputation) - snap.companyRep[comp.id]) >= 2) {
      recordSimEvent({
        simDay, dateLabel, category: 'companies', subType: 'company_finances',
        subjectId: comp.id, subjectKind: 'company', subjectName: comp.name,
        summary: `${comp.name} reputation ${snap.companyRep[comp.id]} → ${Math.round(comp.reputation)}`,
        detail: { from: snap.companyRep[comp.id], to: Math.round(comp.reputation) },
      });
    }
  }

  const nextMartRep = Math.round(city.mart.reputation);
  if (nextMartRep !== snap.martRep) {
    recordSimEvent({
      simDay, dateLabel, category: 'mart', subType: 'mart_reputation',
      subjectId: 'vijmart', subjectKind: 'mart', subjectName: 'Vij Mart',
      summary: `Vij Mart reputation ${snap.martRep} → ${nextMartRep}`,
      detail: { from: snap.martRep, to: nextMartRep },
    });
  }
  for (const [cat, state] of Object.entries(city.mart.categoryMoods)) {
    if (snap.martMoods[cat] && snap.martMoods[cat] !== state.mood) {
      recordSimEvent({
        simDay, dateLabel, category: 'mart', subType: 'mart_mood',
        subjectId: 'vijmart', subjectKind: 'mart', subjectName: 'Vij Mart',
        summary: `Vij Mart ${cat} mood shifted ${snap.martMoods[cat]} → ${state.mood} (${state.marginPct}%)`,
        detail: { category: cat, from: snap.martMoods[cat], to: state.mood, marginPct: state.marginPct },
      });
    }
  }

  const alive = city.citizens.filter((c) => c.alive);
  const unemployed = alive.filter((c) => c.roleLevel === 'Unemployed').length;
  const homeless = alive.filter((c) => !c.homeId).length;
  const avgMood = alive.length > 0 ? Math.round((alive.reduce((s, c) => s + c.mood, 0) / alive.length) * 10) / 10 : 0;
  recordSimEvent({
    simDay, dateLabel, category: 'city', subType: 'daily_city',
    subjectId: 'city', subjectKind: 'city', subjectName: 'City of Vij',
    summary: `Day ${simDay}: ${alive.length} alive (${alive.length - unemployed} emp, ${unemployed} unemp, ${homeless} homeless), Treasury ${formatDelta(city.treasury)}, Avg mood ${avgMood}`,
    detail: {
      population: alive.length,
      employed: alive.length - unemployed,
      unemployed,
      deaths: city.citizens.length - alive.length,
      homeless,
      treasury: Math.round(city.treasury * 100) / 100,
      avgMood,
    },
  });
}
