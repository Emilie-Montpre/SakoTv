import { normalizeName, parseBool, parseIntOr, parseIntOrNull, parseTimestamp } from './parse-helpers';
import type { ImportCandidate, ImportEpisodeWatch, ImportMovieCandidate, ImportShowCandidate, ParsedCsvFile } from './types';

export interface ExtractStats {
  /** Rows that referenced a show/movie but had no usable name — can't be matched to anything. */
  emptyNameRows: number;
}

export interface ExtractResult {
  candidates: ImportCandidate[];
  stats: ExtractStats;
}

function getOrCreateShow(
  map: Map<string, ImportShowCandidate>,
  name: string,
  stats: ExtractStats,
): ImportShowCandidate | null {
  const trimmed = name?.trim();
  if (!trimmed) {
    stats.emptyNameRows++;
    return null;
  }
  const key = normalizeName(trimmed);
  let show = map.get(key);
  if (!show) {
    show = {
      kind: 'tv',
      key,
      displayName: trimmed,
      isFollowed: false,
      isForLater: false,
      isFavorite: false,
      isArchived: false,
      specialStatus: null,
      addedAt: null,
      episodeWatches: new Map(),
    };
    map.set(key, show);
  }
  return show;
}

/** Keeps the earliest date seen across source rows — the closest thing we have to "when this was actually added on TV Time". */
function considerAddedAt(candidate: { addedAt: number | null }, timestamp: number | null) {
  if (timestamp == null) return;
  candidate.addedAt = candidate.addedAt == null ? timestamp : Math.min(candidate.addedAt, timestamp);
}

function getOrCreateMovie(
  map: Map<string, ImportMovieCandidate>,
  name: string,
  stats: ExtractStats,
): ImportMovieCandidate | null {
  const trimmed = name?.trim();
  if (!trimmed) {
    stats.emptyNameRows++;
    return null;
  }
  const key = normalizeName(trimmed);
  let movie = map.get(key);
  if (!movie) {
    movie = { kind: 'movie', key, displayName: trimmed, watchedAt: null, rewatchCount: 0, addedAt: null };
    map.set(key, movie);
  }
  return movie;
}

function mergeEpisodeWatch(
  show: ImportShowCandidate,
  seasonNumber: number,
  episodeNumber: number,
  watchedAt: number | null,
  rewatchCount: number,
) {
  const epKey = `${seasonNumber}-${episodeNumber}`;
  const existing = show.episodeWatches.get(epKey);
  const merged: ImportEpisodeWatch = {
    seasonNumber,
    episodeNumber,
    watchedAt: Math.max(existing?.watchedAt ?? 0, watchedAt ?? 0),
    rewatchCount: Math.max(existing?.rewatchCount ?? 0, rewatchCount),
  };
  if (merged.watchedAt > 0) show.episodeWatches.set(epKey, merged);
}

function processTrackingRecordsV2(rows: Record<string, string>[], shows: Map<string, ImportShowCandidate>, stats: ExtractStats) {
  for (const row of rows) {
    const show = getOrCreateShow(shows, row.series_name, stats);
    if (!show) continue;

    if (parseBool(row.is_followed)) show.isFollowed = true;
    if (parseBool(row.is_for_later)) show.isForLater = true;
    if (parseBool(row.is_archived)) show.isArchived = true;
    considerAddedAt(show, parseTimestamp(row.followed_at) ?? parseTimestamp(row.created_at));

    const seasonNumber = parseIntOrNull(row.season_number);
    const episodeNumber = parseIntOrNull(row.episode_number);
    // ep_watch_count est vide sur les lignes qui représentent un visionnage d'épisode (confirmé sur données
    // réelles) — le vrai signal, c'est la présence même de season_number/episode_number sur ce type de ligne
    // (bulk_type="season", clé "watch-episode-…"/"rewatch-episode-…").
    if (seasonNumber != null && episodeNumber != null) {
      const watchedAt = parseTimestamp(row.updated_at) ?? parseTimestamp(row.created_at) ?? Date.now();
      mergeEpisodeWatch(show, seasonNumber, episodeNumber, watchedAt, parseIntOr(row.rewatch_count, 0));
    }
  }
}

function processTrackingRecords(rows: Record<string, string>[], movies: Map<string, ImportMovieCandidate>, stats: ExtractStats) {
  for (const row of rows) {
    const typeField = (row.type || row.entity_type || '').toLowerCase();
    if (typeField && (typeField.includes('tv') || typeField.includes('series') || typeField.includes('show'))) continue;

    const movie = getOrCreateMovie(movies, row.movie_name, stats);
    if (!movie) continue;
    considerAddedAt(movie, parseTimestamp(row.created_at));

    // "type" distingue le genre de ligne — confirmé sur données réelles (Encanto/Barbie/Don't Look Up/
    // Oxygène) : watch_date_range_key n'est rempli que sur les lignes type="watch". Les lignes
    // follow/towatch/rewatch/rewatch_count l'ont toujours vide ; rewatch(_count) porte quand même un
    // rewatch_count non nul mais ne re-déclenche pas looksLikeWatch — sans incidence puisque le
    // visionnage initial est nécessairement déjà couvert par une ligne type="watch" distincte, et
    // rewatchCount est capturé indépendamment ci-dessous quel que soit le type de ligne.
    const looksLikeWatch = !!row.watch_date_range_key;
    const watchCount = Math.max(parseIntOr(row.watch_count, 0), parseIntOr(row.watches, 0));

    if (looksLikeWatch || watchCount > 0) {
      const watchedAt = parseTimestamp(row.updated_at) ?? parseTimestamp(row.created_at) ?? Date.now();
      movie.watchedAt = Math.max(movie.watchedAt ?? 0, watchedAt);
    }
    movie.rewatchCount = Math.max(movie.rewatchCount, parseIntOr(row.rewatch_count, 0));
  }
}

function processShowSeenEpisodeLatest(rows: Record<string, string>[], shows: Map<string, ImportShowCandidate>, stats: ExtractStats) {
  for (const row of rows) {
    const show = getOrCreateShow(shows, row.tv_show_name, stats);
    if (!show) continue;
    show.isFollowed = true;
    considerAddedAt(show, parseTimestamp(row.created_at));
  }
}

function processWatchedOnEpisode(rows: Record<string, string>[], shows: Map<string, ImportShowCandidate>, stats: ExtractStats) {
  for (const row of rows) {
    const show = getOrCreateShow(shows, row.tv_show_name, stats);
    if (!show) continue;
    const seasonNumber = parseIntOrNull(row.episode_season_number);
    const episodeNumber = parseIntOrNull(row.episode_number);
    if (seasonNumber == null || episodeNumber == null) continue;
    const watchedAt = parseTimestamp(row.updated_at) ?? parseTimestamp(row.created_at) ?? Date.now();
    considerAddedAt(show, watchedAt);
    mergeEpisodeWatch(show, seasonNumber, episodeNumber, watchedAt, 0);
  }
}

function processRewatchedEpisode(rows: Record<string, string>[], shows: Map<string, ImportShowCandidate>, stats: ExtractStats) {
  for (const row of rows) {
    const show = getOrCreateShow(shows, row.tv_show_name, stats);
    if (!show) continue;
    const seasonNumber = parseIntOrNull(row.episode_season_number);
    const episodeNumber = parseIntOrNull(row.episode_number);
    if (seasonNumber == null || episodeNumber == null) continue;
    const watchedAt = parseTimestamp(row.updated_at) ?? parseTimestamp(row.created_at) ?? Date.now();
    considerAddedAt(show, watchedAt);
    mergeEpisodeWatch(show, seasonNumber, episodeNumber, watchedAt, parseIntOr(row.cpt, 0));
  }
}

function processUserShowSpecialStatus(rows: Record<string, string>[], shows: Map<string, ImportShowCandidate>, stats: ExtractStats) {
  for (const row of rows) {
    const show = getOrCreateShow(shows, row.tv_show_name, stats);
    if (!show || !row.status) continue;
    show.specialStatus = row.status;
    // La seule valeur observée dans cette table est "for_later" — même signal que is_for_later ailleurs.
    if (row.status.toLowerCase() === 'for_later') show.isForLater = true;
    considerAddedAt(show, parseTimestamp(row.created_at));
  }
}

function processUserTvShowData(rows: Record<string, string>[], shows: Map<string, ImportShowCandidate>, stats: ExtractStats) {
  for (const row of rows) {
    const show = getOrCreateShow(shows, row.tv_show_name, stats);
    if (!show) continue;
    if (parseBool(row.is_followed)) show.isFollowed = true;
    if (parseBool(row.is_favorited)) show.isFavorite = true;
  }
}

function processFollowedTvShow(rows: Record<string, string>[], shows: Map<string, ImportShowCandidate>, stats: ExtractStats) {
  for (const row of rows) {
    const show = getOrCreateShow(shows, row.tv_show_name, stats);
    if (!show) continue;
    if (parseBool(row.active) && !parseBool(row.archived)) show.isFollowed = true;
    if (parseBool(row.archived)) show.isArchived = true;
    considerAddedAt(show, parseTimestamp(row.created_at));
  }
}

export function extractCandidates(files: ParsedCsvFile[]): ExtractResult {
  const shows = new Map<string, ImportShowCandidate>();
  const movies = new Map<string, ImportMovieCandidate>();
  const stats: ExtractStats = { emptyNameRows: 0 };

  for (const file of files) {
    switch (file.kind) {
      case 'tracking-prod-records-v2':
        processTrackingRecordsV2(file.rows, shows, stats);
        break;
      case 'tracking-prod-records':
        processTrackingRecords(file.rows, movies, stats);
        break;
      case 'show_seen_episode_latest':
        processShowSeenEpisodeLatest(file.rows, shows, stats);
        break;
      case 'watched_on_episode':
        processWatchedOnEpisode(file.rows, shows, stats);
        break;
      case 'rewatched_episode':
        processRewatchedEpisode(file.rows, shows, stats);
        break;
      case 'user_show_special_status':
        processUserShowSpecialStatus(file.rows, shows, stats);
        break;
      case 'user_tv_show_data':
        processUserTvShowData(file.rows, shows, stats);
        break;
      case 'followed_tv_show':
        processFollowedTvShow(file.rows, shows, stats);
        break;
      default:
        break;
    }
  }

  return { candidates: [...shows.values(), ...movies.values()], stats };
}
