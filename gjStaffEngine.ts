// gjStaffEngine.ts — GJ Electricity CEO hiring priority (1-6 seats), low-cash seat trimming, and subsidy assessor lookup

import type { Company, CompanyVacancy } from './companyTypes';
import type { SimClock } from './eventFactory';
import { GJ_STAFF_SPECS, inferGJTitle } from './gjStaffCatalog';
import type { GJStaffTitle } from './gjSubsidyTypes';
import { openVacancy } from './jobScoring';
import { recordSimEvent } from './recordsStore';
import type { Citizen } from './types';

export interface GJAssessorInfo {
  assessorId: string | null;
  assessorTitle: GJStaffTitle | 'None';
  accuracy: number; // 0.65..1.0
  monthlyReach: number; // households reachable per month
}

export function getGJAssessorInfo(citizens: Citizen[], gj?: Company): GJAssessorInfo {
  if (!gj || gj.bankrupt) return { assessorId: null, assessorTitle: 'None', accuracy: 0.5, monthlyReach: 0 };
  const staff = citizens.filter((c) => c.alive && c.employerId === 'gjelectricity');
  const cro = staff.find((c) => inferGJTitle(c) === 'Customer Relations Officer');
  const clerkCount = staff.filter((c) => inferGJTitle(c) === 'Billing Clerk').length;
  const nonCeoCount = staff.filter((c) => c.roleLevel !== 'CEO').length;

  if (cro) {
    const acc = Math.min(1, 0.86 + cro.skill * 0.0014);
    const reach = Math.min(60, 8 + nonCeoCount * 2 + clerkCount * 4);
    return { assessorId: cro.id, assessorTitle: 'Customer Relations Officer', accuracy: acc, monthlyReach: reach };
  }
  const fin = staff.find((c) => inferGJTitle(c) === 'Finance Officer');
  if (fin) {
    const acc = Math.min(0.84, 0.72 + fin.skill * 0.001);
    const reach = Math.min(25, 4 + nonCeoCount + clerkCount * 2);
    return { assessorId: fin.id, assessorTitle: 'Finance Officer', accuracy: acc, monthlyReach: reach };
  }
  const ceo = staff.find((c) => c.roleLevel === 'CEO');
  if (ceo) {
    return { assessorId: ceo.id, assessorTitle: 'CEO', accuracy: 0.68, monthlyReach: 2 + clerkCount };
  }
  return { assessorId: null, assessorTitle: 'None', accuracy: 0.55, monthlyReach: 1 };
}

export function getGJStaffWithTitles(citizens: Citizen[]): { citizen: Citizen; title: GJStaffTitle }[] {
  return citizens
    .filter((c) => c.alive && c.employerId === 'gjelectricity')
    .map((c) => {
      const title = inferGJTitle(c);
      if (!c.gjJobTitle) c.gjJobTitle = title;
      return { citizen: c, title };
    });
}

export function syncGJStaffSeatsAndVacancies(
  gj: Company,
  citizens: Citizen[],
  vacancies: CompanyVacancy[],
  clock: SimClock,
  dateLabel: string
): void {
  if (gj.bankrupt) return;
  const staff = getGJStaffWithTitles(citizens);
  const hasCeo = staff.some((s) => s.title === 'CEO');
  const nonCeo = staff.filter((s) => s.title !== 'CEO');
  const filledTitles = new Set(nonCeo.map((s) => s.title));
  const seenOpen = new Set<string>();
  for (let i = vacancies.length - 1; i >= 0; i--) {
    const v = vacancies[i];
    if (v.companyId !== 'gjelectricity') continue;
    if (v.role === 'CEO' && hasCeo) { vacancies.splice(i, 1); continue; }
    if (v.gjJobTitle && (filledTitles.has(v.gjJobTitle) || seenOpen.has(v.gjJobTitle))) { vacancies.splice(i, 1); continue; }
    if (v.gjJobTitle) seenOpen.add(v.gjJobTitle);
  }
  const openTitles = new Set(vacancies.filter((v) => v.companyId === 'gjelectricity').map((v) => v.gjJobTitle));

  // Target headcount (1-6 non-CEO) scales realistically with cash health
  const targetSeats =
    gj.cash >= 28000 && gj.negativeProfitStreak === 0 ? 6
    : gj.cash >= 16000 && gj.negativeCashStreak === 0 ? 4
    : gj.cash >= 9000 ? 3
    : gj.cash >= 4000 ? 2
    : 1;

  // Drop lower-priority open vacancies if cash tightened
  if (filledTitles.size >= targetSeats) {
    for (let i = vacancies.length - 1; i >= 0; i--) {
      const v = vacancies[i];
      if (v.companyId === 'gjelectricity' && v.role !== 'CEO') vacancies.splice(i, 1);
    }
    return;
  }

  for (const spec of GJ_STAFF_SPECS) {
    if (filledTitles.size + openTitles.size >= targetSeats) break;
    if (filledTitles.has(spec.title) || openTitles.has(spec.title)) continue;
    openVacancy(vacancies, gj, spec.roleLevel, `${spec.title} needed (${spec.duty})`, clock, dateLabel, spec.title);
    openTitles.add(spec.title);
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'gjelectricity', subType: 'staff_vacancy',
      subjectId: 'gjelectricity', subjectKind: 'gjelectricity', subjectName: 'GJ Electricity',
      summary: `GJ CEO opened ${spec.title} (${spec.roleLevel}, ∆${spec.minPay}–${spec.maxPay})`,
      detail: { title: spec.title, roleLevel: spec.roleLevel, cash: gj.cash, targetSeats },
    });
  }
}
