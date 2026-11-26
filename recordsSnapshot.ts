// recordsSnapshot.ts — Lightweight pre-day snapshot for deterministic state-diff record logging

import type { Citizen, CityState } from './types';

export interface CitizenPreSnap {
  mood: number;
  stress: number;
  hunger: number;
  thirst: number;
  energy: number;
  hygiene: number;
  safety: number;
  social: number;
  fun: number;
  shelter: number;
  physical: number;
  mental: number;
  immunity: number;
  fitness: number;
  illnessDaysLeft: number;
  inBreakdown: boolean;
  emotions: Record<string, number>;
  traits: Record<string, number>;
  standards: Record<string, number>;
  homeId: string | null;
  lastGrossPay: number;
  employerId: string | null;
  roleLevel: string;
  memoryCount: number;
  alive: boolean;
}

export interface HousePreSnap {
  condition: number;
  rentPrice: number;
  comfort: number;
  space: number;
  noise: number;
  privacy: number;
  safety: number;
}

export interface PreDaySnapshot {
  citizens: Map<string, CitizenPreSnap>;
  houses: Map<string, HousePreSnap>;
  martRep: number;
  martMoods: Record<string, string>;
  companyFreeze: Record<string, boolean>;
  companyRep: Record<string, number>;
}

function snapCitizen(c: Citizen, simDay: number): CitizenPreSnap {
  const emotions: Record<string, number> = {};
  for (const [k, em] of Object.entries(c.emotions)) emotions[k] = Math.round(em.value);
  return {
    mood: Math.round(c.mood * 10) / 10,
    stress: Math.round(c.stress * 10) / 10,
    hunger: Math.round(c.hunger),
    thirst: Math.round(c.thirst),
    energy: Math.round(c.needs.energy.value),
    hygiene: Math.round(c.needs.hygiene.value),
    safety: Math.round(c.needs.safety.value),
    social: Math.round(c.needs.social.value),
    fun: Math.round(c.needs.fun.value),
    shelter: Math.round(c.needs.shelter.value),
    physical: Math.round(c.healthProfile.physical),
    mental: Math.round(c.healthProfile.mental),
    immunity: Math.round(c.healthProfile.immunity),
    fitness: Math.round(c.healthProfile.fitness),
    illnessDaysLeft: c.healthProfile.illnessDaysLeft ?? 0,
    inBreakdown: Boolean(c.healthProfile.breakdownUntilDay && c.healthProfile.breakdownUntilDay >= simDay),
    emotions,
    traits: { ...(c.traits as unknown as Record<string, number>) },
    standards: { ...c.standards },
    homeId: c.homeId ?? null,
    lastGrossPay: c.lastGrossPay,
    employerId: c.employerId,
    roleLevel: c.roleLevel,
    memoryCount: c.memories.length,
    alive: c.alive,
  };
}

export function capturePreDaySnapshot(city: CityState): PreDaySnapshot {
  const citizens = new Map<string, CitizenPreSnap>();
  for (const c of city.citizens) citizens.set(c.id, snapCitizen(c, city.totalDays));

  const houses = new Map<string, HousePreSnap>();
  for (const h of city.housing.houses) {
    houses.set(h.id, {
      condition: h.condition,
      rentPrice: h.rentPrice,
      comfort: h.scores.comfort,
      space: h.scores.space,
      noise: h.scores.noise,
      privacy: h.scores.privacy,
      safety: h.scores.safety,
    });
  }

  const martMoods: Record<string, string> = {};
  for (const [k, v] of Object.entries(city.mart.categoryMoods)) martMoods[k] = v.mood;
  const companyFreeze: Record<string, boolean> = {};
  const companyRep: Record<string, number> = {};
  for (const comp of city.companies) {
    companyFreeze[comp.id] = comp.payFreeze;
    companyRep[comp.id] = Math.round(comp.reputation);
  }
  return { citizens, houses, martRep: Math.round(city.mart.reputation), martMoods, companyFreeze, companyRep };
}
