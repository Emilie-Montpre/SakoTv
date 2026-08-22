import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { episodes, libraryItems, seasons, watchedEpisodes } from '@/db/schema';
import type { ImportMovieCandidate, ImportShowCandidate } from '@/import/types';

import { addToLibrary, maybeCompleteShow, setFavorite, upsertTitleFromTmdb } from './library';

export async function importShow(tmdbId: number, candidate: ImportShowCandidate) {
  const titleId = await upsertTitleFromTmdb(tmdbId, 'tv');
  // Toujours "à regarder" au départ (sauf abandon explicite) — c'est le passage des épisodes réellement
  // vus ci-dessous, via maybeCompleteShow, qui fait passer en "en cours" ou "terminé" si justifié.
  const initialStatus = candidate.isArchived ? 'dropped' : 'to_watch';
  await addToLibrary(titleId, initialStatus, candidate.addedAt ?? undefined);
  if (candidate.isFavorite) await setFavorite(titleId, true);

  let matchedEpisodes = 0;
  for (const watch of candidate.episodeWatches.values()) {
    const season = await db.query.seasons.findFirst({
      where: and(eq(seasons.titleId, titleId), eq(seasons.seasonNumber, watch.seasonNumber)),
    });
    if (!season) continue;
    const episode = await db.query.episodes.findFirst({
      where: and(eq(episodes.seasonId, season.id), eq(episodes.episodeNumber, watch.episodeNumber)),
    });
    if (!episode) continue;

    const existing = await db.query.watchedEpisodes.findFirst({
      where: and(eq(watchedEpisodes.titleId, titleId), eq(watchedEpisodes.episodeId, episode.id)),
    });
    if (existing) {
      await db
        .update(watchedEpisodes)
        .set({
          watchedAt: Math.max(existing.watchedAt, watch.watchedAt),
          rewatchCount: Math.max(existing.rewatchCount, watch.rewatchCount),
        })
        .where(eq(watchedEpisodes.id, existing.id));
    } else {
      await db
        .insert(watchedEpisodes)
        .values({ titleId, episodeId: episode.id, watchedAt: watch.watchedAt, rewatchCount: watch.rewatchCount });
    }
    matchedEpisodes++;
  }

  await maybeCompleteShow(titleId);
  return { titleId, matchedEpisodes, totalWatches: candidate.episodeWatches.size };
}

export async function importMovie(tmdbId: number, candidate: ImportMovieCandidate) {
  const titleId = await upsertTitleFromTmdb(tmdbId, 'movie');

  if (candidate.watchedAt != null) {
    const existing = await db.query.libraryItems.findFirst({ where: eq(libraryItems.titleId, titleId) });
    const values = { status: 'completed' as const, watchedAt: candidate.watchedAt, rewatchCount: candidate.rewatchCount };
    if (existing) {
      await db.update(libraryItems).set(values).where(eq(libraryItems.id, existing.id));
    } else {
      const addedAt = candidate.addedAt ?? candidate.watchedAt;
      await db.insert(libraryItems).values({ titleId, ...values, addedAt });
    }
  } else {
    await addToLibrary(titleId, 'to_watch', candidate.addedAt ?? undefined);
  }

  return { titleId };
}
