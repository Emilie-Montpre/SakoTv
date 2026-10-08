import { THETVDB_API_KEY, THETVDB_PIN } from '../constants/env';

const BASE_URL = 'https://api4.thetvdb.com/v4';

type TvdbEnvelope<T> = { status: string; data: T };

export type TvdbSearchResult = {
  tvdb_id: string;
  name: string;
  year?: string;
  type: string;
};

export type TvdbSeriesExtended = {
  id: number;
  name: string;
  year?: string;
  status?: { name: string };
  seasons?: { id: number; number: number; type: { type: string } }[];
};

let cachedToken: string | null = null;

async function login(): Promise<string> {
  const body: Record<string, string> = { apikey: THETVDB_API_KEY };
  if (THETVDB_PIN) body.pin = THETVDB_PIN;

  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Erreur TheTVDB (${response.status}) sur /login`);
  }
  const json = (await response.json()) as TvdbEnvelope<{ token: string }>;
  return json.data.token;
}

async function tvdbFetch<T>(path: string, params: Record<string, string> = {}, retried = false): Promise<T> {
  cachedToken ??= await login();

  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${cachedToken}` } });
  // Le jeton expire (environ un mois) : un seul nouvel essai apres reconnexion.
  if (response.status === 401 && !retried) {
    cachedToken = null;
    return tvdbFetch<T>(path, params, true);
  }
  if (!response.ok) {
    throw new Error(`Erreur TheTVDB (${response.status}) sur ${path}`);
  }
  return ((await response.json()) as TvdbEnvelope<T>).data;
}

export function searchSeries(query: string) {
  return tvdbFetch<TvdbSearchResult[]>('/search', { query, type: 'series' });
}

// L'identifiant TV Time d'une serie (`series_id` de l'export) est l'identifiant TheTVDB brut.
export function getSeriesExtended(tvdbId: number) {
  return tvdbFetch<TvdbSeriesExtended>(`/series/${tvdbId}/extended`, { short: 'true' });
}
