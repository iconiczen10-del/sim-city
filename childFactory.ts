// childFactory.ts — Constructs newly arrived age-18 child citizens with inherited traits, skills, and starting funds

import { buildMoodFactors } from './citizenBreakdowns';
import { createSeedEmotions } from './citizenEmotions';
import { createSeedHealthProfile } from './citizenHealthSystem';
import { createSeedNeeds } from './citizenNeeds';
import { createSeedInventory } from './citizenSeedHelpers';
import { buildStressFactors } from './citizenStress';
import { evaluateSurvivalLadder } from './citizenSurvivalEngine';
import { EDU_RANK } from './companyRules';
import { MART_BASE_PRICES } from './constants';
import { calculateFixedMonthlyCosts, clamp } from './economy';
import { seedCitizenElectronics } from './electronicsCitizen';
import type { SimClock } from './eventFactory';
import { extractSurname } from './familyTreeEngine';
import { formatMonthYear } from './formatters';
import { seedHousingPreferences } from './housingPreferences';
import { CITIZEN_NAME_POOL } from './names';
import { simPick, simRandInt } from './rng';
import { buildUniqueHandle } from './sharityBios';
import { chooseLivingStandards } from './standards';
import { computeTargetStatusScore, initialTierFromScore } from './status';
import type { Citizen, CitizenTraits, CityState } from './types';

function inheritTraits(p1: Citizen, p2: Citizen): CitizenTraits {
  const keys = Object.keys(p1.traits) as (keyof CitizenTraits)[];
  const out = {} as CitizenTraits;
  for (const k of keys) {
    out[k] = Math.round(clamp((p1.traits[k] + p2.traits[k]) / 2 + simRandInt(-15, 15), 5, 95));
  }
  return out;
}

function pickChildName(p1: Citizen, p2: Citizen, existingNames: Set<string>): { name: string; gender: Citizen['gender'] } {
  const entry = simPick(CITIZEN_NAME_POOL);
  const first = entry.name.split(' ')[0];
  const s1 = extractSurname(p1.name);
  const s2 = extractSurname(p2.name);
  const proud = Math.max(p1.traits.pride, p2.traits.pride) >= 72;
  const surname = s1 !== s2 && proud ? `${s1}-${s2}` : s1;
  let full = `${first} ${surname}`;
  if (existingNames.has(full)) full = `${first} ${simPick(CITIZEN_NAME_POOL).name.split(' ')[0]} ${surname}`;
  return { name: full, gender: entry.gender };
}

export function buildBornChildCitizen(params: {
  childId: string;
  p1: Citizen;
  p2: Citizen;
  livingParent: Citizen | null;
  isOrphan: boolean;
  familyId: string;
  city: CityState;
  clock: SimClock;
  existingNames: Set<string>;
  takenHandles: Set<string>;
}): Citizen {
  const { childId, p1, p2, livingParent, isOrphan, familyId, city, clock, existingNames, takenHandles } = params;
  const { name, gender } = pickChildName(p1, p2, existingNames);
  existingNames.add(name);
  const traits = inheritTraits(p1, p2);
  const eduBonus = Math.round(((EDU_RANK[p1.education] + EDU_RANK[p2.education]) / 2) * 3);
  const skill = Math.round(clamp(simRandInt(15, 35) + eduBonus + (traits.curiosity - 50) * 0.15, 10, 68));

  let giftSavings = 0;
  if (!isOrphan) {
    const targetGift = simRandInt(100, 300);
    const donor = p1.alive && p1.savings >= targetGift ? p1 : p2.alive && p2.savings >= targetGift ? p2 : livingParent;
    if (donor && donor.savings >= 50) {
      giftSavings = Math.min(targetGift, Math.floor(donor.savings * 0.25));
      donor.savings = Math.round((donor.savings - giftSavings) * 100) / 100;
    }
  }

  const homeType = livingParent?.homeType ?? 'shared_room';
  const standards = chooseLivingStandards({ roleLevel: 'Unemployed', netPay: 0, savings: Math.max(giftSavings, 200), homeType, traits });
  const statusScore = computeTargetStatusScore({ savings: giftSavings, roleLevel: 'Unemployed', respect: 32 }, 0);
  const lucky = simRandInt(1, 10) === 1;
  const child: Citizen = {
    id: childId, name, age: 18, gender, education: 'school', skill, experience: 0, traits,
    birthDay: clock.day, birthMonth: clock.month, birthYear: clock.year - 18,
    lucky, luckyExtraYears: lucky ? simRandInt(1, 15) : 0, luckyYearsUsed: 0, retired: false, highMoodMonths: 0,
    savings: giftSavings, rentArrears: 0, mood: isOrphan ? 42 : 66, stress: isOrphan ? 46 : 16,
    hunger: 92, thirst: 94, health: 86, alive: true, roleLevel: 'Unemployed', respect: 34, statusScore,
    tier: initialTierFromScore(statusScore), homeType, standards, inventory: createSeedInventory(childId, standards),
    recentPurchases: [], stockoutMemoryDays: 0, giftShieldDays: 0, memories: [], decisions: [],
    moodBreakdown: [], stressBreakdown: [], monthlyLedger: [], lifeLog: [], changeExplanations: [],
    lastPaidPrices: { food: MART_BASE_PRICES.food[standards.food], water: MART_BASE_PRICES.water[standards.water], clothes: MART_BASE_PRICES.clothes[standards.clothes], household: MART_BASE_PRICES.household[standards.household] },
    lastGrossPay: 0, lastTax: 0, lastFixedCosts: calculateFixedMonthlyCosts(homeType).total, highestMilestone: 0,
    moodCrashed: false, hungerAlerted: false, thirstAlerted: false,
    history: [{ totalDay: clock.totalDays, label: formatMonthYear(clock.month, clock.year), savings: giftSavings, mood: isOrphan ? 42 : 66, statusScore }],
    employerId: null, bossId: null, bossRelationship: 0, tenureMonths: 0, monthsSincePromotion: 0, performanceScore: 0,
    unemployedDays: 0, jobHunting: false, workHistory: [], householdId: null,
    sharityHandle: buildUniqueHandle(name, takenHandles), socialReputation: 45, sharityMoodLines: [], sharityStressLines: [], sharityWorkNotes: [],
    needs: createSeedNeeds(homeType, traits, 92, 94), healthProfile: createSeedHealthProfile(18, traits, 86),
    emotions: createSeedEmotions(traits), emotionHistory: [], survivalPriority: [], survivalState: 'Stable',
    familyId, generation: Math.max(p1.generation ?? 1, p2.generation ?? 1) + 1,
    parentIds: [p1.id, p2.id], childrenIds: [], youngAdultPhase: isOrphan ? 'independent' : 'dependent_youth',
    capabilityScore: Math.round(clamp(skill * 0.55 + traits.discipline * 0.3, 15, 78)),
    parentBond: { love: isOrphan ? 35 : 74, financialTension: isOrphan ? 0 : 12, independenceTension: 14, gratitude: isOrphan ? 10 : 62 },
    childSupportShortfalls: 0,
    relationship: { stage: 'single', partnerId: null, stageSinceDay: clock.totalDays, pastSpouseIds: [], exPartnerIds: [] },
  };
  seedCitizenElectronics(child);
  child.housingPrefs = seedHousingPreferences(child);
  evaluateSurvivalLadder(child);
  child.stress = Math.round(buildStressFactors(child).targetStress * 10) / 10;
  child.mood = Math.round(buildMoodFactors(child, 0, false, city.mart.reputation).targetMood * 10) / 10;
  return child;
}
