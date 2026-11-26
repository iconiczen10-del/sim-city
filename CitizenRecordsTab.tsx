// CitizenRecordsTab.tsx — Paged unlimited citizen Records tab (2 per page, matching master log, SimGod hidden)

import { RecordsPanel } from './RecordsPanel';
import type { Citizen } from './types';

interface CitizenRecordsTabProps {
  citizen: Citizen;
  totalDays: number;
}

export function CitizenRecordsTab({ citizen, totalDays }: CitizenRecordsTabProps) {
  return (
    <RecordsPanel
      pageSize={2}
      fixedSubjectId={citizen.id}
      hideSimGodTag
      refreshKey={totalDays}
      maxDay={totalDays}
    />
  );
}
