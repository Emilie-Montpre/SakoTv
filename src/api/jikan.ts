const BASE_URL = 'https://api.jikan.moe/v4';

export class JikanUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JikanUnavailableError';
  }
}

export type JikanAnime = {
  mal_id: number;
  title: string;
  title_english: string | null;
  synopsis: string | null;
  episodes: number | null;
  status: string;
  score: number | null;
};

export type JikanPerson = {
  mal_id: number;
  name: string;
  birthday: string | null;
  about: string | null;
  images?: { jpg?: { image_url?: string } };
};

export type JikanCharacterEntry = {
  character: { mal_id: number; name: string };
  role: string;
  voice_actors: { person: { mal_id: number; name: string }; language: string }[];
};

async function jikanFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    throw new JikanUnavailableError(`Jikan injoignable sur ${path}`);
  }
  if (response.status === 429 || response.status >= 500) {
    throw new JikanUnavailableError(`Jikan indisponible (${response.status}) sur ${path}`);
  }
  if (!response.ok) {
    throw new Error(`Erreur Jikan (${response.status}) sur ${path}`);
  }
  return ((await response.json()) as { data: T }).data;
}

export function searchAnimeJikan(query: string, limit = 10) {
  return jikanFetch<JikanAnime[]>('/anime', { q: query, limit: String(limit) });
}

export function getAnimeJikan(malId: number) {
  return jikanFetch<JikanAnime>(`/anime/${malId}`);
}

export function getAnimeCharactersJikan(malId: number) {
  return jikanFetch<JikanCharacterEntry[]>(`/anime/${malId}/characters`);
}

export function getPersonJikan(malId: number) {
  return jikanFetch<JikanPerson>(`/people/${malId}/full`);
}
