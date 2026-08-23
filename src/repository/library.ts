import { and, eq, gt, sql } from 'drizzle-orm';

import { getMovieDetails, getSeasonDetails, getTvDetails, isAnimeMovie, isAnimeTv } from '@/api/tmdb';
import { db } from '@/db/client';
import {
  episodes,
  libraryItems,
  seasons,
  titles,
  watchedEpisodes,
  type LibraryStatus,
  type MediaType,
} from '@/db/schema';

export async function upsertTitleFromTmdb(tmdbId: number, mediaType: MediaType) {
  const existing = await db.query.titles.findFirst({
    where: and(eq(titles.tmdbId, tmdbId), eq(titles.mediaType, mediaType)),
  });

  if (mediaType === 'movie') {
    const movie = await getMovieDetails(tmdbId);
    const values = {
      tmdbId,
      mediaType: 'movie' as const,
      isAnime: isAnimeMovie(
        movie.genres.map((g) => g.id),
        undefined,
      ),
      name: movie.title,
      overview: movie.overview,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      releaseDate: movie.release_date,
      runtime: movie.runtime,
      genres: movie.genres.map((g) => g.name),
      statusTmdb: movie.status,
    };
    if (existing) {
      await db.update(titles).set(values).where(eq(titles.id, existing.id));
      return existing.id;
    }
    const [inserted] = await db.insert(titles).values(values).returning({ id: titles.id });
    return inserted.id;
  }

  const tv = await getTvDetails(tmdbId);
  const values = {
    tmdbId,
    mediaType: 'tv' as const,
    isAnime: isAnimeTv(
      tv.genres.map((g) => g.id),
      tv.origin_country,
    ),
    name: tv.name,
    overview: tv.overview,
    posterPath: tv.poster_path,
    backdropPath: tv.backdrop_path,
    releaseDate: tv.first_air_date,
    runtime: tv.episode_run_time[0] ?? null,
    genres: tv.genres.map((g) => g.name),
    statusTmdb: tv.status,
  };

  const titleId = existing
    ? (await db.update(titles).set(values).where(eq(titles.id, existing.id)).returning({ id: titles.id }))[0].id
    : (await db.insert(titles).values(values).returning({ id: titles.id }))[0].id;

  for (const season of tv.seasons) {
    await upsertSeasonFromTmdb(titleId, tmdbId, season.season_number);
  }

  return titleId;
}

export async function upsertSeasonFromTmdb(titleId: number, tmdbTvId: number, seasonNumber: number) {
  const season = await getSeasonDetails(tmdbTvId, seasonNumber);

  const existingSeason = await db.query.seasons.findFirst({
    where: and(eq(seasons.titleId, titleId), eq(seasons.seasonNumber, seasonNumber)),
  });

  const seasonValues = {
    titleId,
    seasonNumber,
    name: season.name,
    episodeCount: season.episodes.length,
    airDate: season.episodes[0]?.air_date ?? null,
    posterPath: null,
  };

  const seasonId = existingSeason
    ? (
        await db
          .update(seasons)
          .set(seasonValues)
          .where(eq(seasons.id, existingSeason.id))
          .returning({ id: seasons.id })
      )[0].id
    : (await db.insert(seasons).values(seasonValues).returning({ id: seasons.id }))[0].id;

  for (const ep of season.episodes) {
    const existingEpisode = await db.query.episodes.findFirst({
      where: and(eq(episodes.seasonId, seasonId), eq(episodes.episodeNumber, ep.episode_number)),
    });
    const episodeValues = {
      seasonId,
      episodeNumber: ep.episode_number,
      name: ep.name,
      overview: ep.overview,
      airDate: ep.air_date,
      runtime: ep.runtime,
      stillPath: ep.still_path,
    };
    if (existingEpisode) {
      await db.update(episodes).set(episodeValues).where(eq(episodes.id, existingEpisode.id));
    } else {
      await db.insert(episodes).values(episodeValues);
    }
  }

  return seasonId;
}

/** addedAt is only applied on first insert — an existing item keeps its original "added at" date. */
export async function addToLibrary(titleId: number, status: LibraryStatus = 'to_watch', addedAt?: number) {
  const existing = await db.query.libraryItems.findFirst({ where: eq(libraryItems.titleId, titleId) });
  if (existing) {
    await db.update(libraryItems).set({ status }).where(eq(libraryItems.id, existing.id));
    return existing.id;
  }
  const values = addedAt != null ? { titleId, status, addedAt } : { titleId, status };
  const [inserted] = await db.insert(libraryItems).values(values).returning({ id: libraryItems.id });
  return inserted.id;
}

export interface LibraryListItem {
  titleId: number;
  tmdbId: number;
  mediaType: MediaType;
  isAnime: boolean;
  name: string;
  posterPath: string | null;
  status: LibraryStatus;
  statusTmdb: string | null;
  isFavorite: boolean;
  addedAt: number;
}

export async function listLibraryItems(): Promise<LibraryListItem[]> {
  const rows = await db
    .select({
      titleId: titles.id,
      tmdbId: titles.tmdbId,
      mediaType: titles.mediaType,
      isAnime: titles.isAnime,
      name: titles.name,
      posterPath: titles.posterPath,
      status: libraryItems.status,
      statusTmdb: titles.statusTmdb,
      isFavorite: libraryItems.isFavorite,
      addedAt: libraryItems.addedAt,
    })
    .from(libraryItems)
    .innerJoin(titles, eq(libraryItems.titleId, titles.id));

  return rows;
}

/** Date du dernier épisode validé, par titre — sert à distinguer une série "en cours" activement d'une série "en pause" (aucun épisode validé depuis un moment). */
export async function getLastEpisodeWatchedAtByTitle(): Promise<Map<number, number>> {
  const rows = await db
    .select({ titleId: watchedEpisodes.titleId, lastWatchedAt: sql<number>`max(${watchedEpisodes.watchedAt})` })
    .from(watchedEpisodes)
    .groupBy(watchedEpisodes.titleId);

  return new Map(rows.map((r) => [r.titleId, r.lastWatchedAt]));
}

export async function removeFromLibrary(titleId: number) {
  await db.delete(libraryItems).where(eq(libraryItems.titleId, titleId));
}

export async function setStatus(titleId: number, status: LibraryStatus) {
  await db.update(libraryItems).set({ status }).where(eq(libraryItems.titleId, titleId));
}

export async function setFavorite(titleId: number, isFavorite: boolean) {
  await db.update(libraryItems).set({ isFavorite }).where(eq(libraryItems.titleId, titleId));
}

export async function markMovieWatched(titleId: number, watchedAt: number = Date.now()) {
  const existing = await db.query.libraryItems.findFirst({ where: eq(libraryItems.titleId, titleId) });
  const rewatchCount = existing?.watchedAt ? existing.rewatchCount + 1 : 0;

  if (existing) {
    await db
      .update(libraryItems)
      .set({ status: 'completed', watchedAt, rewatchCount })
      .where(eq(libraryItems.id, existing.id));
  } else {
    await db.insert(libraryItems).values({ titleId, status: 'completed', watchedAt, rewatchCount });
  }
}

export async function unmarkMovieWatched(titleId: number) {
  await db
    .update(libraryItems)
    .set({ status: 'to_watch', watchedAt: null, rewatchCount: 0 })
    .where(eq(libraryItems.titleId, titleId));
}

export async function markEpisodeWatched(titleId: number, episodeId: number, watchedAt: number = Date.now()) {
  const existing = await db.query.watchedEpisodes.findFirst({
    where: and(eq(watchedEpisodes.titleId, titleId), eq(watchedEpisodes.episodeId, episodeId)),
  });

  if (existing) {
    await db
      .update(watchedEpisodes)
      .set({ watchedAt, rewatchCount: existing.rewatchCount + 1 })
      .where(eq(watchedEpisodes.id, existing.id));
  } else {
    await db.insert(watchedEpisodes).values({ titleId, episodeId, watchedAt });
  }

  await maybeCompleteShow(titleId);
}

/** Marque tous les épisodes fournis comme vus en une fois — recalcule le statut du titre une seule fois à la fin plutôt qu'à chaque épisode. */
export async function markSeasonWatched(titleId: number, episodeIds: number[], watchedAt: number = Date.now()) {
  for (const episodeId of episodeIds) {
    const existing = await db.query.watchedEpisodes.findFirst({
      where: and(eq(watchedEpisodes.titleId, titleId), eq(watchedEpisodes.episodeId, episodeId)),
    });
    if (existing) {
      await db
        .update(watchedEpisodes)
        .set({ watchedAt, rewatchCount: existing.rewatchCount + 1 })
        .where(eq(watchedEpisodes.id, existing.id));
    } else {
      await db.insert(watchedEpisodes).values({ titleId, episodeId, watchedAt });
    }
  }

  await maybeCompleteShow(titleId);
}

export async function unmarkEpisodeWatched(titleId: number, episodeId: number) {
  await db
    .delete(watchedEpisodes)
    .where(and(eq(watchedEpisodes.titleId, titleId), eq(watchedEpisodes.episodeId, episodeId)));
}

/**
 * Recomputes a show's status purely from its watched-episode facts (bidirectional: can go back down to
 * to_watch just as well as up to watching/completed) — safe to call repeatedly, including as a bulk
 * recompute over existing data when the completion rules themselves change, without touching completed
 * or dropped shows (those reflect an explicit signal, not something to infer from episode counts).
 */
export async function maybeCompleteShow(titleId: number) {
  const libraryItem = await db.query.libraryItems.findFirst({ where: eq(libraryItems.titleId, titleId) });
  if (!libraryItem || libraryItem.status === 'completed' || libraryItem.status === 'dropped') return;

  // La saison 0 (spéciaux/OVA) est exclue du calcul de complétion : ce sont des épisodes bonus, pas
  // le cœur de la série — sinon une série entièrement vue reste bloquée en "en cours" tant que ces
  // extras (souvent absents du visionnage d'origine) ne sont pas cochés.
  const allEpisodes = await db
    .select({ id: episodes.id, airDate: episodes.airDate })
    .from(episodes)
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .where(and(eq(seasons.titleId, titleId), gt(seasons.seasonNumber, 0)));

  // Seuls les épisodes déjà diffusés comptent pour la complétion — sinon une série encore en cours de
  // diffusion (dont TMDB liste déjà de futurs épisodes/saisons annoncés) ne peut jamais devenir "à
  // jour" puisqu'un épisode pas encore sorti ne peut par définition pas être marqué vu.
  const today = new Date().toISOString().slice(0, 10);
  const releasedEpisodes = allEpisodes.filter((ep) => ep.airDate != null && ep.airDate <= today);

  const watched = await db.query.watchedEpisodes.findMany({ where: eq(watchedEpisodes.titleId, titleId) });
  const watchedIds = new Set(watched.map((w) => w.episodeId));
  const allWatched = releasedEpisodes.length > 0 && releasedEpisodes.every((ep) => watchedIds.has(ep.id));

  const nextStatus: LibraryStatus = allWatched ? 'completed' : watchedIds.size > 0 ? 'watching' : 'to_watch';
  if (nextStatus !== libraryItem.status) {
    await db.update(libraryItems).set({ status: nextStatus }).where(eq(libraryItems.id, libraryItem.id));
  }
}

/** Bulk, non-destructive recompute of every show's status — for applying a completion-rule fix to data already imported, without wiping and reimporting everything. */
export async function recomputeAllShowStatuses() {
  const tvTitles = await db.query.titles.findMany({ where: eq(titles.mediaType, 'tv') });
  for (const title of tvTitles) {
    await maybeCompleteShow(title.id);
  }
  return tvTitles.length;
}
