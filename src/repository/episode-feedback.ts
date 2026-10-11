import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { episodeNotes, episodeReactions } from '@/db/schema';

export const FEATURED_REACTION_SLOTS = 3;

export interface EpisodeFeedback {
  reactions: string[];
  featured: string[];
  rating: number | null;
  note: string;
}

export async function getEpisodeFeedback(episodeId: number): Promise<EpisodeFeedback> {
  const reactionRows = await db
    .select({ reaction: episodeReactions.reaction, slot: episodeReactions.slot })
    .from(episodeReactions)
    .where(eq(episodeReactions.episodeId, episodeId))
    .orderBy(episodeReactions.id);

  const [noteRow] = await db
    .select({ rating: episodeNotes.rating, note: episodeNotes.note })
    .from(episodeNotes)
    .where(eq(episodeNotes.episodeId, episodeId))
    .limit(1);

  return {
    reactions: reactionRows.map((row) => row.reaction),
    featured: reactionRows
      .filter((row): row is typeof row & { slot: number } => row.slot != null)
      .sort((a, b) => a.slot - b.slot)
      .map((row) => row.reaction),
    rating: noteRow?.rating ?? null,
    note: noteRow?.note ?? '',
  };
}

export async function toggleEpisodeReaction(episodeId: number, reaction: string) {
  const condition = and(eq(episodeReactions.episodeId, episodeId), eq(episodeReactions.reaction, reaction));
  const existing = await db.select({ id: episodeReactions.id }).from(episodeReactions).where(condition).limit(1);

  if (existing.length > 0) {
    await db.delete(episodeReactions).where(condition);
    return;
  }

  const usedSlots = await db
    .select({ slot: episodeReactions.slot })
    .from(episodeReactions)
    .where(eq(episodeReactions.episodeId, episodeId));
  const taken = new Set(usedSlots.map((row) => row.slot));
  let slot: number | null = null;
  for (let candidate = 1; candidate <= FEATURED_REACTION_SLOTS; candidate += 1) {
    if (!taken.has(candidate)) {
      slot = candidate;
      break;
    }
  }
  await db.insert(episodeReactions).values({ episodeId, reaction, slot });
}

export async function setEpisodeRating(episodeId: number, rating: number | null) {
  await db
    .insert(episodeNotes)
    .values({ episodeId, rating })
    .onConflictDoUpdate({ target: episodeNotes.episodeId, set: { rating, updatedAt: Date.now() } });
}

export async function setEpisodeNote(episodeId: number, note: string) {
  const value = note.trim() === '' ? null : note;
  await db
    .insert(episodeNotes)
    .values({ episodeId, note: value })
    .onConflictDoUpdate({ target: episodeNotes.episodeId, set: { note: value, updatedAt: Date.now() } });
}
