// familyRankings.ts — City-wide family rankings (wealthiest, oldest line, achievements, dark achievements, largest living)

import { ensureFamilyState } from './familyTreeEngine';
import type { Citizen, CityState } from './types';

export interface FamilyRankEntry {
  familyId: string;
  surname: string;
  founderName: string;
  totalWealth: number;
  maxGeneration: number;
  foundedDay: number;
  livingCount: number;
  totalMembers: number;
  achievementCount: number;
  darkAchievementCount: number;
}

export interface CityFamilyRankings {
  wealthiest: FamilyRankEntry[];
  oldestLine: FamilyRankEntry[];
  mostAchievements: FamilyRankEntry[];
  mostDarkAchievements: FamilyRankEntry[];
  largestLiving: FamilyRankEntry[];
}

export function computeCityFamilyRankings(city: CityState, limit = 5): CityFamilyRankings {
  const fam = ensureFamilyState(city);
  const byCit = new Map(city.citizens.map((c) => [c.id, c]));
  const houseValByOwner = new Map<string, number>();
  for (const h of city.housing.houses) {
    if (h.ownerId !== 'gov' && !h.condemned) {
      houseValByOwner.set(h.ownerId, (houseValByOwner.get(h.ownerId) ?? 0) + (h.buyPrice ?? h.originalBuyPrice ?? 0));
    }
  }

  const rows: FamilyRankEntry[] = Object.values(fam.families).map((line) => {
    const nodes = Object.values(fam.nodes).filter((n) => n.familyId === line.id);
    const living = nodes.map((n) => byCit.get(n.citizenId)).filter((c): c is Citizen => Boolean(c && c.alive));
    const totalWealth = Math.round(living.reduce((s, c) => s + c.savings + (houseValByOwner.get(c.id) ?? 0), 0));
    const maxGeneration = nodes.reduce((m, n) => Math.max(m, n.generation), 1);
    const founder = byCit.get(line.founderIds[0]);
    const darkCount = line.achievements.filter((a) => a.category === 'Dark').length;
    return {
      familyId: line.id,
      surname: line.surname,
      founderName: founder?.name ?? line.surname,
      totalWealth,
      maxGeneration,
      foundedDay: line.foundedDay,
      livingCount: living.length,
      totalMembers: nodes.length,
      achievementCount: line.achievements.length,
      darkAchievementCount: darkCount,
    };
  });

  return {
    wealthiest: [...rows].sort((a, b) => b.totalWealth - a.totalWealth || b.livingCount - a.livingCount).slice(0, limit),
    oldestLine: [...rows].sort((a, b) => b.maxGeneration - a.maxGeneration || a.foundedDay - b.foundedDay || b.totalMembers - a.totalMembers).slice(0, limit),
    mostAchievements: [...rows].sort((a, b) => b.achievementCount - a.achievementCount || b.totalWealth - a.totalWealth).slice(0, limit),
    mostDarkAchievements: [...rows].filter((r) => r.darkAchievementCount > 0).sort((a, b) => b.darkAchievementCount - a.darkAchievementCount || b.totalMembers - a.totalMembers).slice(0, limit),
    largestLiving: [...rows].sort((a, b) => b.livingCount - a.livingCount || b.totalMembers - a.totalMembers).slice(0, limit),
  };
}
