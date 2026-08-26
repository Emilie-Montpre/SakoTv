import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { episodes, libraryItems, seasons, titles, watchedEpisodes, type LibraryStatus, type MediaType } from '@/db/schema';

export interface EpisodeWithWatched {
  id: number;
  episodeNumber: number;
  name: string | null;
  overview: string | null;
  airDate: string | null;
  runtime: number | null;
  stillPath: string | null;
  watchedAt: number | null;
  rewatchCount: number;
}

export interface SeasonWithEpisodes {
  id: number;
  seasonNumber: number;
  name: string | null;
  episodes: EpisodeWithWatched[];
}

export interface TitleLocalState {
  titleId: number;
  mediaType: MediaType;
  isAnime: boolean;
  name: string;
  status: LibraryStatus | null;
  isFavorite: boolean;
  manuallyPaused: boolean;
  movieWatchedAt: number | null;
  movieRewatchCount: number;
  seasons: SeasonWithEpisodes[];
}

export async function loadTitleLocalState(titleId: number): Promise<TitleLocalState | null> {
  const title = await db.query.titles.findFirst({ where: eq(titles.id, titleId) });
  if (!title) return null;

  const libraryItem = await db.query.libraryItems.findFirst({ where: eq(libraryItems.titleId, titleId) });

  const seasonRows = (
    await db.query.seasons.findMany({
      where: eq(seasons.titleId, titleId),
      orderBy: asc(seasons.seasonNumber),
    })
  ).sort((a, b) => (a.seasonNumber === 0 ? 1 : b.seasonNumber === 0 ? -1 : 0));

  const watchedRows = await db.query.watchedEpisodes.findMany({ where: eq(watchedEpisodes.titleId, titleId) });
  const watchedByEpisodeId = new Map(watchedRows.map((w) => [w.episodeId, w]));

  const seasonsWithEpisodes: SeasonWithEpisodes[] = [];
  for (const season of seasonRows) {
    const episodeRows = await db.query.episodes.findMany({
      where: eq(episodes.seasonId, season.id),
      orderBy: asc(episodes.episodeNumber),
    });
    seasonsWithEpisodes.push({
      id: season.id,
      seasonNumber: season.seasonNumber,
      name: season.name,
      episodes: episodeRows.map((ep) => {
        const watched = watchedByEpisodeId.get(ep.id);
        return {
          id: ep.id,
          episodeNumber: ep.episodeNumber,
          name: ep.name,
          overview: ep.overview,
          airDate: ep.airDate,
          runtime: ep.runtime,
          stillPath: ep.stillPath,
          watchedAt: watched?.watchedAt ?? null,
          rewatchCount: watched?.rewatchCount ?? 0,
        };
      }),
    });
  }

  return {
    titleId,
    mediaType: title.mediaType,
    isAnime: title.isAnime,
    name: title.name,
    status: libraryItem?.status ?? null,
    isFavorite: libraryItem?.isFavorite ?? false,
    manuallyPaused: libraryItem?.manuallyPaused ?? false,
    movieWatchedAt: libraryItem?.watchedAt ?? null,
    movieRewatchCount: libraryItem?.rewatchCount ?? 0,
    seasons: seasonsWithEpisodes,
  };
}
