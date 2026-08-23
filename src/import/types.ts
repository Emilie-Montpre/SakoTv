export interface ImportEpisodeWatch {
  seasonNumber: number;
  episodeNumber: number;
  watchedAt: number;
  rewatchCount: number;
}

export interface ImportShowCandidate {
  kind: 'tv';
  /** Normalized (lowercase, trimmed) name — used as the merge key across source files. */
  key: string;
  /** Original casing, as first seen — used for display and as the TMDB search query. */
  displayName: string;
  isFollowed: boolean;
  isForLater: boolean;
  isFavorite: boolean;
  /** is_archived / archived côté TV Time — série retirée du suivi actif, mappée sur le statut "Abandonné". */
  isArchived: boolean;
  specialStatus: string | null;
  /** Earliest known TV Time date (followed_at/created_at) across all source rows — used as the library "added at" date instead of the import date. */
  addedAt: number | null;
  episodeWatches: Map<string, ImportEpisodeWatch>;
}

export interface ImportMovieCandidate {
  kind: 'movie';
  key: string;
  displayName: string;
  watchedAt: number | null;
  rewatchCount: number;
  /** Earliest known TV Time date for this movie's tracking record — used as the library "added at" date instead of the import date. */
  addedAt: number | null;
}

export type ImportCandidate = ImportShowCandidate | ImportMovieCandidate;

/** episodeWatches is a Map, which JSON can't represent directly — convert to/from an array of entries around the boundary. */
export function serializeCandidate(candidate: ImportCandidate): string {
  if (candidate.kind === 'tv') {
    return JSON.stringify({ ...candidate, episodeWatches: [...candidate.episodeWatches.entries()] });
  }
  return JSON.stringify(candidate);
}

export function deserializeCandidate(json: string): ImportCandidate {
  const parsed: Record<string, unknown> = JSON.parse(json);
  if (parsed.kind === 'tv') {
    const episodeWatches = parsed.episodeWatches as [string, ImportEpisodeWatch][] | undefined;
    return { ...parsed, episodeWatches: new Map(episodeWatches ?? []) } as ImportShowCandidate;
  }
  return parsed as unknown as ImportMovieCandidate;
}

export interface ParsedCsvFile {
  kind: CsvKind | null;
  fileName: string;
  rows: Record<string, string>[];
}

export const CSV_KINDS = [
  'tracking-prod-records-v2',
  'tracking-prod-records',
  'show_seen_episode_latest',
  'watched_on_episode',
  'rewatched_episode',
  'user_show_special_status',
  'user_tv_show_data',
  'followed_tv_show',
] as const;

export type CsvKind = (typeof CSV_KINDS)[number];

export interface TmdbMatchOption {
  tmdbId: number;
  name: string;
  year: string;
  posterPath: string | null;
  score: number;
}

export interface ReviewEntry {
  reviewKey: string;
  candidate: ImportCandidate;
  options: TmdbMatchOption[];
  selectedTmdbId: number | null;
  skipped: boolean;
}
