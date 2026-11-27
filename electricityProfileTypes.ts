// electricityProfileTypes.ts — Usage profile and temporary usage spike interfaces for houses and companies

import type { CompanyId } from './companyTypes';

export interface HouseUsageProfile {
  sizeLabel: string;
  workPattern: string;
  cooling: string;
  heating: string;
  cooking: string;
  appliances: string;
  lighting: string;
  waterHeating: string;
  habit: string;
  profileMult: number;
  summary: string;
}

export interface CompanyUsageProfile {
  companyId: CompanyId;
  shiftPattern: string;
  equipmentLoad: string;
  cooling: string;
  efficiency: string;
  profileMult: number;
  summary: string;
}

export interface UsageSpikeEvent {
  id: string;
  startDay: number;
  endDay: number;
  extraUnitsPerDay: number;
  reason: string;
}
