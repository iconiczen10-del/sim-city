// sharityTrending.ts — Last-7-day trending hashtags, topic distribution, and sentiment summary

import { TOPIC_LABELS } from './sharityBankExtra';
import type { SharityPost, SharityState, SharityTopicId } from './sharityTypes';

export interface TrendingHashtag {
  tag: string;
  count: number;
  prevCount: number;
  trend: 'up' | 'down' | 'flat';
}

export function computeTrendingHashtags(posts: SharityPost[], currentDay: number, limit = 10): TrendingHashtag[] {
  const curCounts = new Map<string, number>();
  const prevCounts = new Map<string, number>();

  for (const p of posts) {
    const age = currentDay - p.createdDay;
    if (age < 0 || age >= 14) continue;
    const target = age < 7 ? curCounts : prevCounts;
    for (const tag of p.hashtags) {
      target.set(tag, (target.get(tag) ?? 0) + 1);
    }
  }

  return [...curCounts.entries()]
    .map(([tag, count]) => {
      const prevCount = prevCounts.get(tag) ?? 0;
      const trend: TrendingHashtag['trend'] = count > prevCount ? 'up' : count < prevCount ? 'down' : 'flat';
      return { tag, count, prevCount, trend };
    })
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export function computeTopicMix(posts: SharityPost[]): { topic: SharityTopicId; label: string; count: number; pct: number }[] {
  if (posts.length === 0) return [];
  const counts = new Map<SharityTopicId, number>();
  for (const p of posts) counts.set(p.topic, (counts.get(p.topic) ?? 0) + 1);
  return [...counts.entries()]
    .map(([topic, count]) => ({
      topic,
      label: TOPIC_LABELS[topic] ?? topic,
      count,
      pct: Math.round((count / posts.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function computeSentimentBreakdown(sharity: SharityState): {
  pos: number;
  neu: number;
  neg: number;
  total: number;
  netScore: number;
} {
  let pos = 0;
  let neu = 0;
  let neg = 0;
  for (const p of sharity.posts) {
    if (p.sentiment === 'positive') pos += 1;
    else if (p.sentiment === 'negative') neg += 1;
    else neu += 1;
  }
  const total = sharity.posts.length;
  const netScore = total > 0 ? Math.round(((pos - neg) / total) * 100) : 0;
  return { pos, neu, neg, total, netScore };
}
