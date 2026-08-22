export type TmdbMediaType = 'movie' | 'tv';

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbSearchResult {
  id: number;
  /** Present on /search/multi results; absent on /search/tv and /search/movie (the caller already knows the type there). */
  media_type?: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  overview: string;
  origin_country?: string[];
  genre_ids?: number[];
}

export interface TmdbSearchResponse {
  page: number;
  total_pages: number;
  results: TmdbSearchResult[];
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
}

export interface TmdbSeasonSummary {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

export interface TmdbNextEpisodeToAir {
  id: number;
  air_date: string | null;
  episode_number: number;
  season_number: number;
  name: string;
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  runtime: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: TmdbGenre[];
  status: string;
  credits?: TmdbCredits;
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  episode_run_time: number[];
  poster_path: string | null;
  backdrop_path: string | null;
  genres: TmdbGenre[];
  status: string;
  origin_country: string[];
  seasons: TmdbSeasonSummary[];
  next_episode_to_air: TmdbNextEpisodeToAir | null;
  credits?: TmdbCredits;
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
}

export interface TmdbSeasonDetails {
  id: number;
  season_number: number;
  name: string;
  episodes: TmdbEpisode[];
}

export interface TmdbRecommendationsResponse {
  page: number;
  results: TmdbSearchResult[];
}
