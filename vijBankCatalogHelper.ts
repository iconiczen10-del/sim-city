// vijBankCatalogHelper.ts — Lightweight education rank lookup and Vij Bank label re-exports for borrowing checks

import type { EducationLevel } from './cityBaseTypes';
export { BANK_PERSONALITIES, LOAN_LABELS } from './vijBankCatalog';

export const EDU_LABELS_EDU_RANK: Record<EducationLevel, number> = {
  none: 0,
  school: 1,
  diploma: 2,
  degree: 3,
  masters: 4,
  professional: 5,
};
