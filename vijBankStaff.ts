// vijBankStaff.ts — Vij Bank staff seat syncing, vacancy creation, and branch size helper

import type { Company, CompanyVacancy } from './companyTypes';
import type { SimClock } from './eventFactory';
import { openVacancy } from './jobScoring';
import { recordSimEvent } from './recordsStore';
import type { Citizen } from './types';
import { BANK_STAFF_SPECS, inferBankTitle } from './vijBankCatalog';
import type { BankJobTitle } from './vijBankTypes';

export function getBankStaffWithTitles(citizens: Citizen[]): { citizen: Citizen; title: BankJobTitle }[] {
  return citizens
    .filter((c) => c.alive && c.employerId === 'vijcapital')
    .map((c) => {
      const title = inferBankTitle(c);
      if (!c.bankJobTitle) c.bankJobTitle = title;
      return { citizen: c, title };
    });
}

export function syncBankStaffSeatsAndVacancies(
  comp: Company,
  citizens: Citizen[],
  vacancies: CompanyVacancy[],
  clock: SimClock,
  dateLabel: string
): void {
  if (comp.bankrupt || comp.id !== 'vijcapital') return;
  const staff = getBankStaffWithTitles(citizens);
  const hasCeo = staff.some((s) => s.title === 'CEO');
  const filledTitles = new Set(staff.filter((s) => s.title !== 'CEO').map((s) => s.title));
  const seenOpen = new Set<string>();

  for (let i = vacancies.length - 1; i >= 0; i--) {
    const v = vacancies[i];
    if (v.companyId !== 'vijcapital') continue;
    if (v.role === 'CEO' && hasCeo) { vacancies.splice(i, 1); continue; }
    if (v.bankJobTitle && (filledTitles.has(v.bankJobTitle) || seenOpen.has(v.bankJobTitle))) { vacancies.splice(i, 1); continue; }
    if (v.bankJobTitle) seenOpen.add(v.bankJobTitle);
  }
  const openTitles = new Set(vacancies.filter((v) => v.companyId === 'vijcapital').map((v) => v.bankJobTitle));

  const targetSeats = comp.cash >= 26000 ? 5 : comp.cash >= 14000 ? 4 : comp.cash >= 7000 ? 3 : 2;
  if (filledTitles.size >= targetSeats) return;

  for (const spec of BANK_STAFF_SPECS) {
    if (filledTitles.size + openTitles.size >= targetSeats) break;
    if (filledTitles.has(spec.title) || openTitles.has(spec.title)) continue;
    openVacancy(vacancies, comp, spec.roleLevel, `${spec.title} needed (${spec.duty})`, clock, dateLabel, undefined, spec.title);
    openTitles.add(spec.title);
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'companies', subType: 'staff_vacancy',
      subjectId: 'vijcapital', subjectKind: 'company', subjectName: 'Vij Capital (Vij Bank)',
      summary: `Vij Bank opened ${spec.title} (${spec.roleLevel}, ∆${spec.minPay}–${spec.maxPay})`,
      detail: { title: spec.title, roleLevel: spec.roleLevel, cash: comp.cash, targetSeats },
    });
  }
}
