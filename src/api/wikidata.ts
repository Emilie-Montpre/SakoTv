const BASE_URL = 'https://www.wikidata.org/w/api.php';

export type WikidataEntity = {
  id: string;
  labels?: Record<string, { language: string; value: string }>;
  claims?: Record<string, WikidataClaim[]>;
};

type WikidataSnak = { datavalue?: { value: unknown } };

type WikidataClaim = {
  mainsnak: WikidataSnak;
  qualifiers?: Record<string, WikidataSnak[]>;
};

export type WikidataPersonProfile = {
  heightMeters: number | null;
  family: { relation: string; names: string[] }[];
  awards: { name: string; year: string | null }[];
};

const FAMILY_PROPERTIES: { property: string; relation: string }[] = [
  { property: 'P26', relation: 'Conjoint(e)' },
  { property: 'P40', relation: 'Enfants' },
  { property: 'P22', relation: 'Père' },
  { property: 'P25', relation: 'Mère' },
  { property: 'P3373', relation: 'Fratrie' },
];

const METRE_UNIT = 'Q11573';
const CENTIMETRE_UNIT = 'Q174728';

export async function getWikidataEntity(wikidataId: string): Promise<WikidataEntity> {
  const url = new URL(BASE_URL);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', wikidataId);
  url.searchParams.set('props', 'labels|claims');
  url.searchParams.set('languages', 'fr|en');
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

async function getWikidataLabels(ids: string[]): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  for (let index = 0; index < ids.length; index += 50) {
    const url = new URL(BASE_URL);
    url.searchParams.set('action', 'wbgetentities');
    url.searchParams.set('ids', ids.slice(index, index + 50).join('|'));
    url.searchParams.set('props', 'labels');
    url.searchParams.set('languages', 'fr|en');
    url.searchParams.set('languagefallback', '1');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Erreur Wikidata (${response.status}) sur les libelles`);
    }
    const json = (await response.json()) as { entities?: Record<string, WikidataEntity> };
    for (const [id, entity] of Object.entries(json.entities ?? {})) {
      const label = entity.labels?.fr?.value ?? entity.labels?.en?.value;
      if (label) labels.set(id, label);
    }
  }
  return labels;
}

function entityId(snak: WikidataSnak | undefined): string | null {
  const value = snak?.datavalue?.value as { id?: string } | undefined;
  return value?.id ?? null;
}

function heightInMeters(claims: WikidataClaim[] | undefined): number | null {
  const value = claims?.[0]?.mainsnak.datavalue?.value as { amount?: string; unit?: string } | undefined;
  if (!value?.amount || !value.unit) return null;
  const amount = Number(value.amount);
  if (Number.isNaN(amount)) return null;
  if (value.unit.endsWith(`/${METRE_UNIT}`)) return amount;
  if (value.unit.endsWith(`/${CENTIMETRE_UNIT}`)) return amount / 100;
  return null;
}

function yearOf(claim: WikidataClaim): string | null {
  const time = (claim.qualifiers?.P585?.[0]?.datavalue?.value as { time?: string } | undefined)?.time;
  const match = time?.match(/^[+-](\d{4})/);
  return match ? match[1] : null;
}

export async function getPersonWikidataProfile(wikidataId: string): Promise<WikidataPersonProfile> {
  const entity = await getWikidataEntity(wikidataId);
  const claims = entity.claims ?? {};

  const familyIds = FAMILY_PROPERTIES.map(({ property }) =>
    (claims[property] ?? []).map((claim) => entityId(claim.mainsnak)).filter((id): id is string => id != null),
  );
  const awardClaims = (claims.P166 ?? []).filter((claim) => entityId(claim.mainsnak) != null);

  const allIds = [...new Set([...familyIds.flat(), ...awardClaims.map((claim) => entityId(claim.mainsnak)!)])];
  const labels = allIds.length > 0 ? await getWikidataLabels(allIds) : new Map<string, string>();

  const family = FAMILY_PROPERTIES.map(({ relation }, index) => ({
    relation,
    names: familyIds[index].map((id) => labels.get(id)).filter((name): name is string => name != null),
  })).filter((entry) => entry.names.length > 0);

  const awards = awardClaims
    .map((claim) => ({ name: labels.get(entityId(claim.mainsnak)!), year: yearOf(claim) }))
    .filter((award): award is { name: string; year: string | null } => award.name != null)
    .sort((a, b) => (b.year ?? '').localeCompare(a.year ?? ''));

  return { heightMeters: heightInMeters(claims.P2048), family, awards };
}
