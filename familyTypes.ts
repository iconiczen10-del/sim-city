// familyTypes.ts — Data structures for aging, courtship, marriage, children, family tree, achievements, and rankings

export type RelationshipStage =
  | 'single'
  | 'awareness'
  | 'interest'
  | 'pursuit'
  | 'dating'
  | 'cohabiting'
  | 'married'
  | 'widowed';

export type YoungAdultPhase = 'none' | 'dependent_youth' | 'independent' | 'stay_home';

export interface ParentBond {
  love: number;
  financialTension: number;
  independenceTension: number;
  gratitude: number;
}

export interface PregnancyRecord {
  id: string;
  carrierId: string;
  partnerId: string;
  familyId: string;
  conceivedDay: number;
  dueDay: number;
}

export interface CitizenRelationshipState {
  stage: RelationshipStage;
  partnerId: string | null;
  stageSinceDay: number;
  datingSinceDay?: number;
  cohabitingSinceDay?: number;
  marriedSinceDay?: number;
  griefUntilDay?: number;
  compatibility?: number;
  pastSpouseIds: string[];
  exPartnerIds: string[];
}

export type FamilyAchievementCategory = 'Economic' | 'Social' | 'Education' | 'Survival' | 'Dark';

export interface FamilyAchievement {
  id: string;
  key: string;
  title: string;
  category: FamilyAchievementCategory;
  memberId: string;
  memberName: string;
  day: number;
  dateLabel: string;
  detail: string;
}

export interface FamilyGenPeak {
  generation: number;
  peakSavings: number;
  peakStatus: number;
  bestRole: string;
  memberName: string;
}

export interface FamilyLine {
  id: string;
  surname: string;
  foundedDay: number;
  founderIds: string[];
  achievements: FamilyAchievement[];
  genPeaks: Record<number, FamilyGenPeak>;
  legacyLine: string;
}

export interface FamilyTreeNode {
  citizenId: string;
  name: string;
  surname: string;
  familyId: string;
  generation: number;
  birthYear: number;
  alive: boolean;
  parentIds: string[];
  spouseIds: string[];
  pastSpouseIds: string[];
  childrenIds: string[];
  stepParentIds: string[];
  stepChildIds: string[];
  peakSavings: number;
  peakRole: string;
}

export interface CityFamilyState {
  nextCitizenSeq: number;
  families: Record<string, FamilyLine>;
  nodes: Record<string, FamilyTreeNode>;
  pregnancies: PregnancyRecord[];
}

export interface CitizenFamilyFields {
  birthDay?: number;
  birthMonth?: number;
  birthYear?: number;
  lucky?: boolean;
  luckyExtraYears?: number;
  luckyYearsUsed?: number;
  retired?: boolean;
  retiredDay?: number;
  highMoodMonths?: number;
  relationship?: CitizenRelationshipState;
  familyId?: string;
  generation?: number;
  parentIds?: string[];
  childrenIds?: string[];
  youngAdultPhase?: YoungAdultPhase;
  capabilityScore?: number;
  parentBond?: ParentBond;
  childSupportShortfalls?: number;
  pregnancy?: PregnancyRecord | null;
}
