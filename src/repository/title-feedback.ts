import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { titleNotes, titleReactions } from '@/db/schema';
import { FEATURED_REACTION_SLOTS, type EpisodeFeedback } from '@/repository/episode-feedback';

export async function getTitleFeedback(titleId: number): Promise<EpisodeFeedback> {
  const reactionRows = await db
    .select({ reaction: titleReactions.reaction, slot: titleReactions.slot })
    .from(titleReactions)
    .where(eq(titleReactions.titleId, titleId))
    .orderBy(titleReactions.id);

  const [noteRow] = await db
    .select({ rating: titleNotes.rating, note: titleNotes.note })
    .from(titleNotes)
    .where(eq(titleNotes.titleId, titleId))
    .limit(1);

  return {
    imported: [],
    reactions: reactionRows.map((row) => row.reaction),
    featured: reactionRows
      .filter((row): row is typeof row & { slot: number } => row.slot != null)
      .sort((a, b) => a.slot - b.slot)
      .map((row) => row.reaction),
    rating: noteRow?.rating ?? null,
    note: noteRow?.note ?? '',
  };
}

export async function toggleTitleReaction(titleId: number, reaction: string) {
  const condition = and(eq(titleReactions.titleId, titleId), eq(titleReactions.reaction, reaction));
  const existing = await db.select({ id: titleReactions.id }).from(titleReactions).where(condition).limit(1);

  if (existing.length > 0) {
    await db.delete(titleReactions).where(condition);
    return;
  }

  const usedSlots = await db
    .select({ slot: titleReactions.slot })
    .from(titleReactions)
    .where(eq(titleReactions.titleId, titleId));
  const taken = new Set(usedSlots.map((row) => row.slot));
  let slot: number | null = null;
  for (let candidate = 1; candidate <= FEATURED_REACTION_SLOTS; candidate += 1) {
    if (!taken.has(candidate)) {
      slot = candidate;
      break;
    }
  }
  await db.insert(titleReactions).values({ titleId, reaction, slot });
}

export async function setTitleRating(titleId: number, rating: number | null) {
  await db
    .insert(titleNotes)
    .values({ titleId, rating })
    .onConflictDoUpdate({ target: titleNotes.titleId, set: { rating, updatedAt: Date.now() } });
}

export async function setTitleNote(titleId: number, note: string) {
  const value = note.trim() === '' ? null : note;
  await db
    .insert(titleNotes)
    .values({ titleId, note: value })
    .onConflictDoUpdate({ target: titleNotes.titleId, set: { note: value, updatedAt: Date.now() } });
}
