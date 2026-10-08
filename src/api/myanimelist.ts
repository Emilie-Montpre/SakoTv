import { MYANIMELIST_CLIENT_ID } from '../constants/env';

const BASE_URL = 'https://api.myanimelist.net/v2';

export type MyAnimeListAnimeSummary = {
  id: number;
  title: string;
  main_picture?: { medium: string; large?: string };
};

export type MyAnimeListSearchResponse = {
  data: { node: MyAnimeListAnimeSummary }[];
};

export type MyAnimeListAnimeDetails = MyAnimeListAnimeSummary & {
  synopsis?: string;
  mean?: number;
  num_episodes?: number;
  status?: string;
  start_date?: string;
  genres?: { id: number; name: string }[];
};

async function myAnimeListFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), { headers: { 'X-MAL-CLIENT-ID': MYANIMELIST_CLIENT_ID } });
  if (!response.ok) {
    throw new Error(`Erreur MyAnimeList (${response.status}) sur ${path}`);
  }
  return (await response.json()) as T;
}

export function searchAnime(query: string, limit = 10) {
  return myAnimeListFetch<MyAnimeListSearchResponse>('/anime', { q: query, limit: String(limit) });
}

export function getAnimeDetails(myAnimeListId: number) {
  return myAnimeListFetch<MyAnimeListAnimeDetails>(`/anime/${myAnimeListId}`, {
    fields: 'synopsis,mean,num_episodes,status,start_date,genres',
  });
}
