// sharityReactionTypes.ts — Data types for S3 public reactions, comment types, nested threads, and argument tracking

export type SharityCommentType =
  | 'support'
  | 'congratulation'
  | 'sympathy'
  | 'offer_help'
  | 'joke'
  | 'agreement'
  | 'disagreement'
  | 'shade'
  | 'question'
  | 'envy'
  | 'defense'
  | 'callout';

export type SharityReactionKind = 'like' | 'dislike' | 'share';

export interface SharityReactionFactor {
  label: string;
  value: number;
  detail: string;
}

export interface SharityReaction {
  id: string;
  postId: string;
  citizenId: string;
  kind: SharityReactionKind;
  totalDay: number;
  dateLabel: string;
  shareNote?: string;
  reason: string;
  factors: SharityReactionFactor[];
}

export interface SharityComment {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  handle: string;
  createdDay: number;
  dateLabel: string;
  type: SharityCommentType;
  text: string;
  score: number;
  isEscalation?: boolean;
  reason: string;
  factors: SharityReactionFactor[];
}

export type SharityArgumentState = 'none' | 'active' | 'ended';
export type SharityHeatFilter = 'all' | 'hot' | 'heated';
