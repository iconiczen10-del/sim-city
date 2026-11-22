// sharityTypes.ts — Data models for Sharity profiles, badges, 16-topic posts, voices, and trending

import type { TierId } from './cityBaseTypes';

export type SharitySubTab = 'feed' | 'people' | 'network';

export type SharityTopicId =
  | 'work_career' | 'money' | 'vij_mart' | 'housing'
  | 'companies' | 'daily_life' | 'social_drama' | 'status_flex'
  | 'city_mood' | 'health_survival' | 'natural_events' | 'crime_conflict'
  | 'ambition' | 'opinions' | 'loss_hardship' | 'celebrations';

export type SharityVoice =
  | 'humble' | 'show_off' | 'bitter' | 'kind' | 'funny'
  | 'anxious' | 'angry' | 'hopeful' | 'neutral';

export type SharitySentiment = 'positive' | 'neutral' | 'negative';

export interface SharityBadgeEntry {
  id: string;
  kind: 'earned' | 'lost';
  badge: string;
  tier?: TierId;
  totalDay: number;
  dateLabel: string;
  detail: string;
}

export interface SharityProfile {
  id: string;
  kind: 'citizen' | 'company';
  name: string;
  handle: string;
  joinedDay: number;
  bio: string;
  bioUpdatedDay: number;
  verified: boolean;
  risingTier?: TierId;
  badgeHistory: SharityBadgeEntry[];
  followerMilestonesLogged: number[];
}

export interface SharityPostWhy {
  trigger: string;
  gateScores: {
    sociability: number;
    eventStrength: number;
    socialNeed: number;
    moodSwing: number;
    postWeight: number;
  };
  voiceReason: string;
  templateId: string;
  styleNote: string;
}

export interface SharityPost {
  id: string;
  authorId: string;
  handle: string;
  createdDay: number;
  dateLabel: string;
  topic: SharityTopicId;
  triggerKey: string;
  voice: SharityVoice;
  sentiment: SharitySentiment;
  text: string;
  hashtags: string[];
  mentions: string[];
  urgencyWeight: number;
  why: SharityPostWhy;
  likes: number;
  dislikes: number;
  replies: number;
  reposts: number;
  score: number;
}

export interface SharityDailyStat {
  day: number;
  dateLabel: string;
  count: number;
  pos: number;
  neu: number;
  neg: number;
}

export interface SharityState {
  profiles: Record<string, SharityProfile>;
  affinities: Record<string, number>;
  follows: Record<string, string[]>;
  monthStartFollowers: Record<string, number>;
  posts: SharityPost[];
  unreadPostCount: number;
  lastTickDay: number;
  lastTickBudget: number;
  lastTickReason: string;
  recentTexts?: { day: number; text: string }[];
  authorLastTemplateDay?: Record<string, Record<string, number>>;
  authorLastPostDay?: Record<string, number>;
  dailyStats?: SharityDailyStat[];
  handledEventIds?: string[];
  lastMartClosed?: boolean;
}
