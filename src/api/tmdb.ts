import { TMDB_API_KEY } from '@/constants/env';

import type {
  TmdbMovieDetails,
  TmdbRecommendationsResponse,
  TmdbSearchResponse,
  TmdbSeasonDetails,
  TmdbTvDetails,
} from './tmdb-types';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export const ANIMATION_GENRE_ID = 16;

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'fr-FR');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erreur TMDB (${response.status}) sur ${path}`);
  }
  return (await response.json()) as T;
}

export function tmdbImageUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'original' = 'w342') {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

export function searchMulti(query: string) {
  return tmdbFetch<TmdbSearchResponse>('/search/multi', { query });
}

export function searchTv(query: string) {
  return tmdbFetch<TmdbSearchResponse>('/search/tv', { query });
}

export function searchMovie(query: string) {
  return tmdbFetch<TmdbSearchResponse>('/search/movie', { query });
}

export function getMovieDetails(tmdbId: number) {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`, { append_to_response: 'credits,videos' });
}

export function getTvDetails(tmdbId: number) {
  return tmdbFetch<TmdbTvDetails>(`/tv/${tmdbId}`, { append_to_response: 'credits,videos' });
}

export function getSeasonDetails(tvId: number, seasonNumber: number) {
  return tmdbFetch<TmdbSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
}

export function getMovieRecommendations(tmdbId: number) {
  return tmdbFetch<TmdbRecommendationsResponse>(`/movie/${tmdbId}/recommendations`);
}

export function getTvRecommendations(tmdbId: number) {
  return tmdbFetch<TmdbRecommendationsResponse>(`/tv/${tmdbId}/recommendations`);
}

export function isAnimeTv(genreIds: number[], originCountry: string[]) {
  return genreIds.includes(ANIMATION_GENRE_ID) && originCountry.includes('JP');
}

export function isAnimeMovie(genreIds: number[], originalLanguage: string | undefined) {
  return genreIds.includes(ANIMATION_GENRE_ID) && originalLanguage === 'ja';
}
