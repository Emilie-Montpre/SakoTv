import { OMDB_API_KEY } from '../constants/env';

const BASE_URL = 'https://www.omdbapi.com/';

export type OmdbResponse = {
  Response: 'True' | 'False';
  Error?: string;
  Title?: string;
  imdbID?: string;
  imdbRating?: string;
  Metascore?: string;
  Ratings?: { Source: string; Value: string }[];
};

// OMDb renvoie HTTP 200 meme en cas d'erreur (cle invalide, titre inconnu) : l'erreur est dans le corps.
export async function getOmdbByImdbId(imdbId: string): Promise<OmdbResponse> {
  const url = new URL(BASE_URL);
  url.searchParams.set('apikey', OMDB_API_KEY);
  url.searchParams.set('i', imdbId);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erreur OMDb (${response.status})`);
  }
  const json = (await response.json()) as OmdbResponse;
  if (json.Response === 'False') {
    throw new Error(`Erreur OMDb : ${json.Error ?? 'reponse invalide'}`);
  }
  return json;
}

// Les notes absentes valent "N/A" : on renvoie null plutot que de les afficher telles quelles.
export function omdbRatings(data: OmdbResponse) {
  const clean = (value: string | undefined) => (value && value !== 'N/A' ? value : null);
  const rotten = data.Ratings?.find((rating) => rating.Source === 'Rotten Tomatoes')?.Value;
  return {
    imdb: clean(data.imdbRating),
    tomatometer: clean(rotten),
    metascore: clean(data.Metascore),
  };
}
