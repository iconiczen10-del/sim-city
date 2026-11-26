// familyAchievements.ts — Once-per-family achievement evaluation across Economic, Social, Education, Survival, and Dark tiers

import { makeCityEvent, type SimClock } from './eventFactory';
import { ensureFamilyState } from './familyTreeEngine';
import type { FamilyAchievementCategory, FamilyLine } from './familyTypes';
import { recordSimEvent } from './recordsStore';
import type { Citizen, CityEvent, CityState } from './types';

function awardAchievement(params: {
  line: FamilyLine;
  key: string;
  title: string;
  category: FamilyAchievementCategory;
  member: Citizen;
  detail: string;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { line, key, title, category, member, detail, clock, dateLabel, events } = params;
  if (line.achievements.some((a) => a.key === key)) return;
  const ach = {
    id: `ach_${line.id}_${key}_${clock.totalDays}`,
    key,
    title,
    category,
    memberId: member.id,
    memberName: member.name,
    day: clock.totalDays,
    dateLabel,
    detail,
  };
  line.achievements.unshift(ach);
  events.push(makeCityEvent(clock, `fach_${line.id}_${key}`, {
    type: 'family-achievement',
    citizenId: member.id,
    citizenName: member.name,
    title: `Family Achievement: ${title}`,
    detail: `${line.surname} family earned "${title}" (${category}) via ${member.name}: ${detail}`,
  }));
  recordSimEvent({
    simDay: clock.totalDays,
    dateLabel,
    category: 'citizens',
    subType: 'family_achievement',
    subjectId: member.id,
    subjectKind: 'citizen',
    subjectName: member.name,
    summary: `${line.surname} family unlocked [${category}] ${title} (${member.name})`,
    detail: { familyId: line.id, surname: line.surname, key, title, category, memberId: member.id, memberName: member.name, detail },
  });
}

export function evaluateFamilyAchievements(city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): void {
  const fam = ensureFamilyState(city);
  const byId = new Map(city.citizens.map((c) => [c.id, c]));

  for (const line of Object.values(fam.families)) {
    const nodes = Object.values(fam.nodes).filter((n) => n.familyId === line.id);
    const members = nodes.map((n) => byId.get(n.citizenId)).filter((c): c is Citizen => Boolean(c));
    if (members.length === 0) continue;

    for (const m of members) {
      if (m.savings >= 10000) awardAchievement({ line, key: 'econ_10k', title: '∆10,000 Milestone', category: 'Economic', member: m, detail: 'Saved ∆10,000+.', clock, dateLabel, events });
      if (m.savings >= 50000) awardAchievement({ line, key: 'econ_50k', title: 'Dynasty Fortune', category: 'Economic', member: m, detail: 'Reached ∆50,000+ in savings.', clock, dateLabel, events });
      if ((m.ownedHouseIds?.length ?? 0) >= 1) awardAchievement({ line, key: 'econ_home', title: 'Homeowner Roots', category: 'Economic', member: m, detail: 'Purchased first family property.', clock, dateLabel, events });
      if (m.tier === 'T1') awardAchievement({ line, key: 'econ_t1', title: 'City Elite (T1)', category: 'Economic', member: m, detail: 'Ascended to Tier 1 status.', clock, dateLabel, events });
      if (m.roleLevel === 'CEO') awardAchievement({ line, key: 'econ_ceo', title: 'Corner Office CEO', category: 'Economic', member: m, detail: 'Led a Vij company as CEO.', clock, dateLabel, events });

      if (m.relationship?.stage === 'married') awardAchievement({ line, key: 'soc_marriage', title: 'First Vows', category: 'Social', member: m, detail: 'Celebrated family marriage.', clock, dateLabel, events });
      if ((m.childrenIds?.length ?? 0) >= 1) awardAchievement({ line, key: 'soc_child', title: 'Next Generation', category: 'Social', member: m, detail: 'Welcomed a child into the line.', clock, dateLabel, events });
      if ((m.generation ?? 1) >= 3) awardAchievement({ line, key: 'soc_gen3', title: 'Three Generations', category: 'Social', member: m, detail: 'Family reached 3rd generation.', clock, dateLabel, events });
      if ((fam.nodes[m.id]?.stepParentIds.length ?? 0) > 0) awardAchievement({ line, key: 'soc_blended', title: 'Blended Family', category: 'Social', member: m, detail: 'United a blended household.', clock, dateLabel, events });

      if (m.education === 'degree' || m.education === 'masters') awardAchievement({ line, key: 'edu_degree', title: 'University Graduate', category: 'Education', member: m, detail: 'Earned higher education degree.', clock, dateLabel, events });
      if (m.education === 'professional') awardAchievement({ line, key: 'edu_prof', title: 'Master Scholar', category: 'Education', member: m, detail: 'Earned Professional credentials.', clock, dateLabel, events });

      if (m.alive && m.age >= 75) awardAchievement({ line, key: 'surv_75', title: 'Elder Wisdom', category: 'Survival', member: m, detail: 'Reached age 75 in Vij.', clock, dateLabel, events });
      if (m.alive && m.age >= 80 && m.lucky) awardAchievement({ line, key: 'surv_lucky80', title: 'Charmed Longevity', category: 'Survival', member: m, detail: 'Lucky survivor reached age 80+.', clock, dateLabel, events });
      if (m.alive && m.memories.some((mem) => mem.kind === 'hunger' || mem.kind === 'thirst') && m.health >= 70) {
        awardAchievement({ line, key: 'surv_rebound', title: 'Crisis Survivor', category: 'Survival', member: m, detail: 'Recovered to full health after famine/thirst scare.', clock, dateLabel, events });
      }

      if (m.savings <= 0 && m.memories.some((mem) => mem.kind === 'broke')) awardAchievement({ line, key: 'dark_broke', title: 'Family Ruin', category: 'Dark', member: m, detail: 'Fell to ∆0 savings.', clock, dateLabel, events });
      if ((m.evictionRecords?.length ?? 0) > 0) awardAchievement({ line, key: 'dark_evict', title: 'Lost Shelter', category: 'Dark', member: m, detail: 'Suffered an eviction.', clock, dateLabel, events });
      if (m.memories.some((mem) => mem.kind === 'theft_guilt')) awardAchievement({ line, key: 'dark_theft', title: 'Desperate Act', category: 'Dark', member: m, detail: 'Resorted to theft to survive.', clock, dateLabel, events });
      if (m.memories.some((mem) => mem.kind === 'breakdown')) awardAchievement({ line, key: 'dark_break', title: 'Breaking Point', category: 'Dark', member: m, detail: 'Suffered a mental breakdown.', clock, dateLabel, events });
      if (m.memories.some((mem) => mem.kind === 'orphan')) awardAchievement({ line, key: 'dark_orphan', title: 'Orphaned Line', category: 'Dark', member: m, detail: 'Arrived without living parents.', clock, dateLabel, events });
      if (!m.alive && m.age < 50) awardAchievement({ line, key: 'dark_early_loss', title: 'Untimely Loss', category: 'Dark', member: m, detail: `Lost ${m.name} before age 50.`, clock, dateLabel, events });
    }
  }
}
