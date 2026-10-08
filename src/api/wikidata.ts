const BASE_URL = 'https://www.wikidata.org/w/api.php';

export type WikidataEntity = {
  id: string;
  labels?: Record<string, { language: string; value: string }>; // cle = langue demandee
  claims?: Record<string, { mainsnak: { datavalue?: { value: unknown } } }[]>;
};

// Pas de cle. `origin=*` autorise l'appel depuis un navigateur (version web de l'app).
// Le `wikidata_id` d'une personne est fourni directement par TMDB (external_ids), sans matching par nom.
export async function getWikidataEntity(wikidataId: string): Promise<WikidataEntity> {
  const url = new URL(BASE_URL);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', wikidataId);
  url.searchParams.set('props', 'labels|claims');
  url.searchParams.set('languages', 'fr|en');
  // Sans fallback, les libelles "multilingues" (langue `mul`, ex. les noms propres) sont renvoyes vides.
  url.searchParams.set('languagefallback', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erreur Wikidata (${response.status}) sur ${wikidataId}`);
  }
  const json = (await response.json()) as { entities?: Record<string, WikidataEntity>; error?: { info: string } };
  const entity = json.entities?.[wikidataId];
  if (!entity) {
    throw new Error(`Erreur Wikidata : ${json.error?.info ?? 'entite introuvable'}`);
  }
  return entity;
}
