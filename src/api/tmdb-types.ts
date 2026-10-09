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

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TmdbVideos {
  results: TmdbVideo[];
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
  original_language?: string;
  imdb_id?: string | null;
  production_companies?: { name: string }[];
  credits?: TmdbCredits;
  videos?: TmdbVideos;
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
  original_language?: string;
  seasons: TmdbSeasonSummary[];
  number_of_episodes?: number;
  next_episode_to_air: TmdbNextEpisodeToAir | null;
  external_ids?: { imdb_id: string | null };
  networks?: { name: string }[];
  created_by?: { name: string }[];
  production_companies?: { name: string }[];
  credits?: TmdbCredits;
  videos?: TmdbVideos;
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

export interface TmdbPersonCredit {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  genre_ids?: number[];
  vote_count?: number;
  popularity?: number;
  credit_id: string;
  character?: string;
  episode_count?: number;
  department?: string;
  job?: string;
}

export interface TmdbPersonImage {
  file_path: string;
  width: number;
  height: number;
}

export interface TmdbPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  known_for_department: string;
  profile_path: string | null;
  gender?: number;
  homepage?: string | null;
  also_known_as?: string[];
  tagged_images?: { results: { file_path: string; aspect_ratio: number }[] };
  external_ids?: {
    wikidata_id: string | null;
    imdb_id: string | null;
    instagram_id?: string | null;
    twitter_id?: string | null;
    facebook_id?: string | null;
    tiktok_id?: string | null;
    youtube_id?: string | null;
  };
  combined_credits?: { cast: TmdbPersonCredit[]; crew: TmdbPersonCredit[] };
  images?: { profiles: TmdbPersonImage[] };
}

export interface TmdbCreditEpisode {
  id: number;
  season_number: number;
  episode_number: number;
  name: string;
  air_date: string | null;
}

export interface TmdbCreditDetails {
  id: string;
  job?: string;
  department?: string;
  media: {
    id: number;
    media_type: 'movie' | 'tv';
    character?: string;
    episodes?: TmdbCreditEpisode[];
    seasons?: { season_number: number }[];
  };
}

export interface TmdbEpisodeCredits {
  cast: TmdbCastMember[];
  crew: { id: number; name: string; job: string; department: string; profile_path: string | null }[];
  guest_stars: TmdbCastMember[];
}
