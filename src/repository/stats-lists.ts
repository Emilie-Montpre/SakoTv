import { desc, eq, sql } from 'drizzle-orm';

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
