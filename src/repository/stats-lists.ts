import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { libraryItems, titles, watchedEpisodes } from '@/db/schema';
import type { LibraryStatus, MediaType } from '@/db/schema';

export interface WatchedMovieEntry {
  titleId: number;
  tmdbId: number;
  name: string;
  posterPath: string | null;
  watchedAt: number;
}

export async function listWatchedMovies(): Promise<WatchedMovieEntry[]> {
  const rows = await db
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

  return rows.filter((row): row is typeof row & { watchedAt: number } => row.watchedAt != null);
}

export interface WatchedEpisodesByTitleEntry {
  titleId: number;
  tmdbId: number;
  isAnime: boolean;
  name: string;
  posterPath: string | null;
  episodesWatched: number;
  lastWatchedAt: number;
}

export async function listWatchedEpisodesByTitle(): Promise<WatchedEpisodesByTitleEntry[]> {
  const rows = await db
    .select({
      titleId: titles.id,
      tmdbId: titles.tmdbId,
      isAnime: titles.isAnime,
      name: titles.name,
      posterPath: titles.posterPath,
      episodesWatched: sql<number>`count(${watchedEpisodes.id})`,
      lastWatchedAt: sql<number>`max(${watchedEpisodes.watchedAt})`,
    })
    .from(watchedEpisodes)
    .innerJoin(titles, eq(watchedEpisodes.titleId, titles.id))
    .groupBy(titles.id)
    .orderBy(desc(sql`count(${watchedEpisodes.id})`), titles.name);

  return rows;
}

export interface YearRecapEntry {
  titleId: number;
  tmdbId: number;
  mediaType: MediaType;
  isAnime: boolean;
  name: string;
  posterPath: string | null;
  count: number;
  lastWatchedAt: number;
}

export async function listYearRecap(year: number): Promise<YearRecapEntry[]> {
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();

  const movieRows = await db
    .select({
      titleId: titles.id,
      tmdbId: titles.tmdbId,
      isAnime: titles.isAnime,
      name: titles.name,
      posterPath: titles.posterPath,
      watchedAt: libraryItems.watchedAt,
    })
    .from(libraryItems)
    .innerJoin(titles, eq(libraryItems.titleId, titles.id))
    .where(and(eq(titles.mediaType, 'movie'), gte(libraryItems.watchedAt, start), lt(libraryItems.watchedAt, end)));

  const showRows = await db
    .select({
      titleId: titles.id,
      tmdbId: titles.tmdbId,
      isAnime: titles.isAnime,
      name: titles.name,
      posterPath: titles.posterPath,
      count: sql<number>`count(${watchedEpisodes.id})`,
      lastWatchedAt: sql<number>`max(${watchedEpisodes.watchedAt})`,
    })
    .from(watchedEpisodes)
    .innerJoin(titles, eq(watchedEpisodes.titleId, titles.id))
    .where(and(gte(watchedEpisodes.watchedAt, start), lt(watchedEpisodes.watchedAt, end)))
    .groupBy(titles.id);

  const movies: YearRecapEntry[] = movieRows
    .filter((row): row is typeof row & { watchedAt: number } => row.watchedAt != null)
    .map((row) => ({
      titleId: row.titleId,
      tmdbId: row.tmdbId,
      mediaType: 'movie',
      isAnime: row.isAnime,
      name: row.name,
      posterPath: row.posterPath,
      count: 1,
      lastWatchedAt: row.watchedAt,
    }));

  const shows: YearRecapEntry[] = showRows.map((row) => ({
    titleId: row.titleId,
    tmdbId: row.tmdbId,
    mediaType: 'tv',
    isAnime: row.isAnime,
    name: row.name,
    posterPath: row.posterPath,
    count: row.count,
    lastWatchedAt: row.lastWatchedAt,
  }));

  return [...movies, ...shows].sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
}

export interface FavoriteTitleEntry {
  titleId: number;
  tmdbId: number;
  mediaType: MediaType;
  name: string;
  posterPath: string | null;
  status: LibraryStatus;
  statusTmdb: string | null;
  manuallyPaused: boolean;
}

export async function listFavoriteTitles(): Promise<FavoriteTitleEntry[]> {
  return db
    .select({
      titleId: titles.id,
      tmdbId: titles.tmdbId,
      mediaType: titles.mediaType,
      name: titles.name,
      posterPath: titles.posterPath,
      status: libraryItems.status,
      statusTmdb: titles.statusTmdb,
      manuallyPaused: libraryItems.manuallyPaused,
    })
    .from(libraryItems)
    .innerJoin(titles, eq(libraryItems.titleId, titles.id))
    .where(eq(libraryItems.isFavorite, true))
    .orderBy(titles.name);
}
