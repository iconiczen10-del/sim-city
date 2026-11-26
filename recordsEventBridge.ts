// recordsEventBridge.ts — Maps CityEvent notifications into structured Simulation Records categories

import { recordSimEvent } from './recordsStore';
import type { RecordCategory, RecordSubjectKind } from './recordTypes';
import type { CityEvent, CityState } from './types';

function classifyEvent(evt: CityEvent): { category: RecordCategory; subType: string; simgodMarked?: boolean } {
  const t = evt.type;
  if (t === 'simgod' || evt.title.startsWith('SimGod')) return { category: 'simgod', subType: t, simgodMarked: true };
  if (t === 'appliance-buy' || t === 'appliance-broke') return { category: 'electronics', subType: t };
  if (t === 'plant-built' || t === 'plant-failed' || t === 'tariff-change') return { category: 'gjelectricity', subType: t };
  if (t === 'electric-bill' || t === 'power-cut' || t === 'blackout') return { category: 'electricity', subType: t };
  if (t === 'eviction' || t === 'bought-house' || t === 'moved' || t === 'homeless' || t === 'housing-search' || t === 'roommate-conflict' || t === 'sold-house' || t === 'rent-raise') {
    return { category: 'housing', subType: t };
  }
  if (t === 'stock-out' || t === 'shortage' || t === 'delivery' || t === 'late-delivery' || t === 'rationing' || t === 'contamination') {
    return { category: 'mart', subType: t };
  }
  if (t === 'spoilage' || t === 'price-shock') return { category: 'shopping', subType: t };
  if (t === 'hired' || t === 'fired' || t === 'quit' || t === 'promoted' || t === 'layoff' || t === 'pay-cut' || t === 'late-pay' || t === 'company-milestone' || t === 'bankruptcy' || t === 'board' || t === 'contribution' || t === 'investment' || t === 'work-consequence') {
    return { category: 'companies', subType: t };
  }
  if (t === 'system') return { category: 'city', subType: t };
  return { category: 'citizens', subType: t };
}

export function bridgeDayEventsToRecords(events: CityEvent[], city: CityState): void {
  const compNames = new Map(city.companies.map((c) => [c.id, c.name]));
  for (const evt of events) {
    const cls = classifyEvent(evt);
    let subjectId = 'city';
    let subjectKind: RecordSubjectKind = 'city';
    let subjectName = 'City of Vij';

    if (evt.citizenId) {
      subjectId = evt.citizenId;
      subjectKind = 'citizen';
      subjectName = evt.citizenName ?? evt.citizenId;
    } else if (evt.companyId) {
      subjectId = evt.companyId;
      subjectKind = evt.companyId === 'gjelectricity' ? 'gjelectricity' : evt.companyId === 'vijmart' ? 'mart' : 'company';
      subjectName = compNames.get(evt.companyId) ?? evt.companyId;
    } else if (cls.category === 'mart') {
      subjectId = 'vijmart';
      subjectKind = 'mart';
      subjectName = 'Vij Mart';
    } else if (cls.category === 'gjelectricity') {
      subjectId = 'gjelectricity';
      subjectKind = 'gjelectricity';
      subjectName = 'GJ Electricity';
    }

    recordSimEvent({
      simDay: evt.totalDay,
      dateLabel: evt.dateLabel,
      category: cls.category,
      subType: cls.subType,
      subjectId,
      subjectKind,
      subjectName,
      summary: `${evt.title}: ${evt.detail}`,
      detail: { eventId: evt.id, eventType: evt.type, title: evt.title, detail: evt.detail, citizenId: evt.citizenId, companyId: evt.companyId },
      simgodMarked: cls.simgodMarked,
    });
  }
}
