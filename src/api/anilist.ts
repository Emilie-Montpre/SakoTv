const ENDPOINT = 'https://graphql.anilist.co';

export type AniListMedia = {
  id: number;
  idMal: number | null;
  title: { romaji: string | null; english: string | null };
  status: string;
  nextAiringEpisode: { airingAt: number; episode: number } | null;
};

type AniListResponse<T> = { data?: T; errors?: { message: string }[] };

async function anilistFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await response.json()) as AniListResponse<T>;
  if (!response.ok || json.errors?.length || !json.data) {
    throw new Error(`Erreur AniList (${response.status}) : ${json.errors?.[0]?.message ?? 'reponse invalide'}`);
  }
  return json.data;
}

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english }
  status
  nextAiringEpisode { airingAt episode }
`;

export async function getAnimeAiringByMalId(malId: number) {
  const data = await anilistFetch<{ Media: AniListMedia }>(
    `query ($malId: Int) { Media(idMal: $malId, type: ANIME) { ${MEDIA_FIELDS} } }`,
    { malId },
  );
  return data.Media;
}

export async function searchAnimeAniList(search: string) {
  const data = await anilistFetch<{ Media: AniListMedia }>(
    `query ($search: String) { Media(search: $search, type: ANIME) { ${MEDIA_FIELDS} } }`,
    { search },
  );
  return data.Media;
}
