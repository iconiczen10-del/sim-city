// citizenFactory.ts — Constructs individual calibrated citizens with starting inventory, memory, and stress

import { buildMoodFactors } from './citizenBreakdowns';
import { createSeedEmotions } from './citizenEmotions';
import { createSeedHealthProfile } from './citizenHealthSystem';
import { createSeedNeeds } from './citizenNeeds';
import { buildStressFactors } from './citizenStress';
import { evaluateSurvivalLadder } from './citizenSurvivalEngine';
import { MART_BASE_PRICES, SAVINGS_MILESTONES } from './constants';
import {
  calibrateInitialScore,
  createSeedInventory,
  createSeedTraits,
  pick,
  randInt,
} from './citizenSeedHelpers';
import {
  calculateFixedMonthlyCosts,
  calculateMarginalTax,
  calculateMonthlyPay,
  clamp,
  selectHomeType,
} from './economy';
import { formatMonthYear } from './formatters';
import { ROLE_CONFIGS, type SeedSlot } from './seedProfiles';
import { chooseLivingStandards } from './standards';
import { computeTargetStatusScore, initialTierFromScore } from './status';
import type { Citizen } from './types';

export function buildSeedCitizen(
  index: number,
  slot: SeedSlot,
  nameEntry: { name: string; gender: Citizen['gender'] },
  existingTraitSigs?: Set<string>
): Citizen {
  const id = `cit_${index + 1}`;
  const cfg = ROLE_CONFIGS[slot.role];
  const traits = createSeedTraits(existingTraitSigs);
  const age = randInt(cfg.ageRange[0], cfg.ageRange[1]);
  const experience = Math.min(Math.max(0, age - 18), randInt(cfg.expRange[0], cfg.expRange[1]));
  const skill = randInt(cfg.skillRange[0], cfg.skillRange[1]);
  const education = pick(cfg.edus);

  const grossPay = calculateMonthlyPay({ roleLevel: slot.role, education, skill, experience, traits });
  const tax = calculateMarginalTax(grossPay);
  const netPay = grossPay - tax;
  const savings = randInt(slot.savingsRange[0], slot.savingsRange[1]);
  const respect = Math.round(clamp(cfg.respectBase + (traits.kindness + traits.discipline - 100) * 0.14, 10, 96));
  const homeType = selectHomeType(netPay, savings, traits.greed, traits.discipline);
  const standards = chooseLivingStandards({ roleLevel: slot.role, netPay, savings, homeType, traits });
  const fixedCosts = calculateFixedMonthlyCosts(homeType).total;

  const rawScore = computeTargetStatusScore({ savings, roleLevel: slot.role, respect }, grossPay);
  const statusScore = calibrateInitialScore(rawScore, slot.targetTier);
  const tier = initialTierFromScore(statusScore);
  const highestMilestone = [...SAVINGS_MILESTONES].reverse().find((m) => savings >= m) ?? 0;

  const citizen: Citizen = {
    id,
    name: nameEntry.name,
    age,
    gender: nameEntry.gender,
    education,
    skill,
    experience,
    traits,
    savings,
    rentArrears: 0,
    mood: 60,
    stress: 18,
    hunger: randInt(86, 98),
    thirst: randInt(88, 98),
    health: randInt(68, 95),
    alive: true,
    roleLevel: slot.role,
    respect,
    statusScore,
    tier,
    homeType,
    standards,
    inventory: createSeedInventory(id, standards),
    recentPurchases: [],
    stockoutMemoryDays: 0,
    giftShieldDays: 0,
    memories: [],
    decisions: [],
    moodBreakdown: [],
    stressBreakdown: [],
    monthlyLedger: [],
    lifeLog: [{
      id: `life_init_${id}`,
      totalDay: 1,
      dateLabel: '1 Jan, Year 1',
      category: 'mood',
      summary: `Settled into ${homeType.replace('_', ' ')} as ${slot.role}.`,
    }],
    changeExplanations: [],
    lastPaidPrices: {
      food: MART_BASE_PRICES.food[standards.food],
      water: MART_BASE_PRICES.water[standards.water],
      clothes: MART_BASE_PRICES.clothes[standards.clothes],
      household: MART_BASE_PRICES.household[standards.household],
    },
    lastGrossPay: grossPay,
    lastTax: tax,
    lastFixedCosts: fixedCosts,
    highestMilestone,
    moodCrashed: false,
    hungerAlerted: false,
    thirstAlerted: false,
    history: [],
    employerId: null,
    bossId: null,
    bossRelationship: 0,
    tenureMonths: 0,
    monthsSincePromotion: 0,
    performanceScore: 0,
    unemployedDays: 0,
    jobHunting: false,
    workHistory: [],
    householdId: null,
    sharityHandle: `@${nameEntry.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}`,
    socialReputation: Math.round(clamp(50 + (respect - 50) * 0.4, 20, 85)),
    sharityMoodLines: [],
    sharityStressLines: [],
    sharityWorkNotes: [],
    needs: createSeedNeeds(homeType, traits, 92, 94),
    healthProfile: createSeedHealthProfile(age, traits, 82),
    emotions: createSeedEmotions(traits),
    emotionHistory: [],
    survivalPriority: [],
    survivalState: 'Stable',
  };
  citizen.needs.hunger.value = citizen.hunger;
  citizen.needs.thirst.value = citizen.thirst;
  citizen.healthProfile.physical = citizen.health;
  evaluateSurvivalLadder(citizen);

  const stressInfo = buildStressFactors(citizen);
  citizen.stress = Math.round(stressInfo.targetStress * 10) / 10;
  citizen.stressBreakdown = stressInfo.factors;
  const moodInfo = buildMoodFactors(citizen, netPay, false, 70);
  citizen.mood = Math.round(moodInfo.targetMood * 10) / 10;
  citizen.moodBreakdown = moodInfo.factors;
  citizen.moodCrashed = citizen.mood < 25;
  citizen.history.push({ totalDay: 1, label: formatMonthYear(1, 1), savings: citizen.savings, mood: citizen.mood, statusScore: citizen.statusScore });

  return citizen;
}
