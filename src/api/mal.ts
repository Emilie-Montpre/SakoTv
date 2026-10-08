import { MAL_CLIENT_ID } from '../constants/env';

const BASE_URL = 'https://api.myanimelist.net/v2';

export type MalAnimeSummary = {
  id: number;
  title: string;
  main_picture?: { medium: string; large?: string };
};

export type MalSearchResponse = {
  data: { node: MalAnimeSummary }[];
};

export type MalAnimeDetails = MalAnimeSummary & {
  synopsis?: string;
  mean?: number;
  num_episodes?: number;
  status?: string;
  start_date?: string;
  genres?: { id: number; name: string }[];
};

async function malFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), { headers: { 'X-MAL-CLIENT-ID': MAL_CLIENT_ID } });
  if (!response.ok) {
    throw new Error(`Erreur MyAnimeList (${response.status}) sur ${path}`);
  }
  return (await response.json()) as T;
}

export function searchAnime(query: string, limit = 10) {
  return malFetch<MalSearchResponse>('/anime', { q: query, limit: String(limit) });
}

export function getAnimeDetails(malId: number) {
  return malFetch<MalAnimeDetails>(`/anime/${malId}`, {
    fields: 'synopsis,mean,num_episodes,status,start_date,genres',
  });
}
