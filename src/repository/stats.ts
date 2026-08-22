import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { episodes, libraryItems, seasons, titles, watchedEpisodes } from '@/db/schema';

export interface StatsSummary {
  moviesWatched: number;
  episodesWatched: number;
  showsInLibrary: number;
  favoritesCount: number;
  totalMinutesWatched: number;
  topGenres: { genre: string; count: number }[];
  byYear: { year: number; movies: number; episodes: number }[];
}

export async function computeStats(): Promise<StatsSummary> {
  const watchedMovies = await db
    .select({
      runtime: titles.runtime,
      genres: titles.genres,
      watchedAt: libraryItems.watchedAt,
    })
    .from(libraryItems)
    .innerJoin(titles, eq(libraryItems.titleId, titles.id))
    .where(eq(titles.mediaType, 'movie'));

  const moviesWatchedRows = watchedMovies.filter((m) => m.watchedAt != null);

  const watchedEpisodeRows = await db
    .select({
      runtime: episodes.runtime,
      watchedAt: watchedEpisodes.watchedAt,
      genres: titles.genres,
    })
    .from(watchedEpisodes)
    .innerJoin(episodes, eq(watchedEpisodes.episodeId, episodes.id))
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .innerJoin(titles, eq(watchedEpisodes.titleId, titles.id));

  const libraryCount = await db.select({ status: libraryItems.status, isFavorite: libraryItems.isFavorite }).from(libraryItems);

  const totalMinutesWatched =
    moviesWatchedRows.reduce((sum, m) => sum + (m.runtime ?? 0), 0) +
    watchedEpisodeRows.reduce((sum, e) => sum + (e.runtime ?? 0), 0);

  const genreCounts = new Map<string, number>();
  for (const row of [...moviesWatchedRows, ...watchedEpisodeRows]) {
    for (const genre of row.genres ?? []) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCounts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const byYearMap = new Map<number, { movies: number; episodes: number }>();
  for (const m of moviesWatchedRows) {
    const year = new Date(m.watchedAt!).getFullYear();
    const entry = byYearMap.get(year) ?? { movies: 0, episodes: 0 };
    entry.movies += 1;
    byYearMap.set(year, entry);
  }
  for (const e of watchedEpisodeRows) {
    const year = new Date(e.watchedAt).getFullYear();
    const entry = byYearMap.get(year) ?? { movies: 0, episodes: 0 };
    entry.episodes += 1;
    byYearMap.set(year, entry);
  }
  const byYear = [...byYearMap.entries()]
    .map(([year, counts]) => ({ year, ...counts }))
    .sort((a, b) => b.year - a.year);

  return {
    moviesWatched: moviesWatchedRows.length,
    episodesWatched: watchedEpisodeRows.length,
    showsInLibrary: libraryCount.length,
    favoritesCount: libraryCount.filter((l) => l.isFavorite).length,
    totalMinutesWatched,
    topGenres,
    byYear,
  };
}
