// recordTypes.ts — Core data structures for append-only simulation records, indexing, filters, and storage quota

export type RecordCategory =
  | 'citizens'
  | 'shopping'
  | 'housing'
  | 'electricity'
  | 'companies'
  | 'mart'
  | 'gjelectricity'
  | 'electronics'
  | 'simgod'
  | 'city';

export type RecordSubjectKind = 'citizen' | 'company' | 'house' | 'gjelectricity' | 'mart' | 'city';

export interface SimRecordEntry {
  seq: number;
  id: string;
  simDay: number;
  dateLabel: string;
  category: RecordCategory;
  subType: string;
  subjectId: string;
  subjectKind: RecordSubjectKind;
  subjectName: string;
  summary: string;
  detail: Record<string, unknown>;
  simgodMarked?: boolean;
}

export interface RecordsDayIndex {
  minSeq: number;
  maxSeq: number;
  count: number;
}

export interface RecordsIndex {
  totalCount: number;
  nextSeq: number;
  byCategory: Record<RecordCategory, number>;
  bySubject: Record<string, number>;
  byDay: Record<number, RecordsDayIndex>;
}

export interface RecordsFilter {
  category?: RecordCategory | 'all';
  subType?: string;
  subjectId?: string;
  dayFrom?: number;
  dayTo?: number;
  query?: string;
  hideSimGodTag?: boolean;
}

export interface RecordsPageResult {
  items: SimRecordEntry[];
  totalMatched: number;
  page: number;
  totalPages: number;
}

export interface StorageQuotaStatus {
  usageBytes: number;
  quotaBytes: number;
  usagePct: number;
  warning: boolean;
}

export const RECORD_CATEGORY_LABELS: Record<RecordCategory, string> = {
  citizens: 'Citizens',
  shopping: 'Food, Water & Shopping',
  housing: 'Housing',
  electricity: 'Electricity',
  companies: 'Companies & Jobs',
  mart: 'Vij Mart',
  gjelectricity: 'GJ Electricity',
  electronics: 'Electronics',
  simgod: 'SimGod',
  city: 'City-Wide',
};

export const ALL_RECORD_CATEGORIES: RecordCategory[] = [
  'citizens',
  'shopping',
  'housing',
  'electricity',
  'companies',
  'mart',
  'gjelectricity',
  'electronics',
  'simgod',
  'city',
];
