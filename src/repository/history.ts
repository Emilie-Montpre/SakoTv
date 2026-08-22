import { desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { episodes, libraryItems, seasons, titles, watchedEpisodes } from '@/db/schema';

export interface HistoryEntry {
  key: string;
  titleId: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  name: string;
  posterPath: string | null;
  watchedAt: number;
  episodeLabel: string | null;
}

export async function listHistory(): Promise<HistoryEntry[]> {
  const episodeRows = await db
    .select({
      titleId: titles.id,
      tmdbId: titles.tmdbId,
      name: titles.name,
      posterPath: titles.posterPath,
      watchedAt: watchedEpisodes.watchedAt,
      seasonNumber: seasons.seasonNumber,
      episodeNumber: episodes.episodeNumber,
    })
    .from(watchedEpisodes)
    .innerJoin(episodes, eq(watchedEpisodes.episodeId, episodes.id))
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .innerJoin(titles, eq(watchedEpisodes.titleId, titles.id))
    .orderBy(desc(watchedEpisodes.watchedAt));

  const movieRows = await db
    .select({
      titleId: titles.id,
      tmdbId: titles.tmdbId,
      name: titles.name,
      posterPath: titles.posterPath,
      watchedAt: libraryItems.watchedAt,
    })
    .from(libraryItems)
    .innerJoin(titles, eq(libraryItems.titleId, titles.id))
    .where(eq(titles.mediaType, 'movie'))
    .orderBy(desc(libraryItems.watchedAt));

  const entries: HistoryEntry[] = [
    ...episodeRows.map((row) => ({
      key: `ep-${row.titleId}-${row.seasonNumber}-${row.episodeNumber}`,
      titleId: row.titleId,
      tmdbId: row.tmdbId,
      mediaType: 'tv' as const,
      name: row.name,
      posterPath: row.posterPath,
      watchedAt: row.watchedAt,
      episodeLabel: `S${row.seasonNumber} · E${row.episodeNumber}`,
    })),
    ...movieRows
      .filter((row): row is typeof row & { watchedAt: number } => row.watchedAt != null)
      .map((row) => ({
        key: `movie-${row.titleId}`,
        titleId: row.titleId,
        tmdbId: row.tmdbId,
        mediaType: 'movie' as const,
        name: row.name,
        posterPath: row.posterPath,
        watchedAt: row.watchedAt,
        episodeLabel: null,
      })),
  ];

  return entries.sort((a, b) => b.watchedAt - a.watchedAt);
}
