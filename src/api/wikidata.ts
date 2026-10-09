const BASE_URL = 'https://www.wikidata.org/w/api.php';

export type WikidataEntity = {
  id: string;
  labels?: Record<string, { language: string; value: string }>;
  claims?: Record<string, WikidataClaim[]>;
  sitelinks?: Record<string, { title: string }>;
};

type WikidataSnak = { datavalue?: { value: unknown } };

type WikidataClaim = {
  mainsnak: WikidataSnak;
  qualifiers?: Record<string, WikidataSnak[]>;
};

export type WikidataAward = { name: string; year: string | null };

export type WikidataPersonProfile = {
  heightMeters: number | null;
  family: { relation: string; names: string[] }[];
  awards: WikidataAward[];
  nominations: WikidataAward[];
  birthName: string | null;
  nationalities: string[];
  occupations: string[];
  spokenLanguages: string[];
  education: string[];
  residences: string[];
  memberOf: string[];
  notableWorks: string[];
  deathPlace: string | null;
  deathCause: string | null;
  officialWebsite: string | null;
  wikipediaTitles: { fr: string | null; en: string | null };
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
  url.searchParams.set('props', 'labels|claims|sitelinks');
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

function idsOf(claims: Record<string, WikidataClaim[]>, property: string): string[] {
  return (claims[property] ?? []).map((claim) => entityId(claim.mainsnak)).filter((id): id is string => id != null);
}

function textOf(claims: Record<string, WikidataClaim[]>, property: string): string | null {
  const value = claims[property]?.[0]?.mainsnak.datavalue?.value as { text?: string } | string | undefined;
  if (!value) return null;
  return typeof value === 'string' ? value : (value.text ?? null);
}

function toAwards(claims: WikidataClaim[], labels: Map<string, string>): WikidataAward[] {
  return claims
    .map((claim) => ({ name: labels.get(entityId(claim.mainsnak) ?? ''), year: yearOf(claim) }))
    .filter((award): award is WikidataAward => award.name != null)
    .sort((a, b) => (b.year ?? '').localeCompare(a.year ?? ''));
}

function unique(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => value != null))];
}

export async function getPersonWikidataProfile(wikidataId: string): Promise<WikidataPersonProfile> {
  const entity = await getWikidataEntity(wikidataId);
  const claims = entity.claims ?? {};

  const familyIds = FAMILY_PROPERTIES.map(({ property }) => idsOf(claims, property));
  const awardClaims = (claims.P166 ?? []).filter((claim) => entityId(claim.mainsnak) != null);
  const nominationClaims = (claims.P1411 ?? []).filter((claim) => entityId(claim.mainsnak) != null);

  const listProperties = {
    nationalities: idsOf(claims, 'P27'),
    occupations: idsOf(claims, 'P106'),
    spokenLanguages: idsOf(claims, 'P1412'),
    education: idsOf(claims, 'P69'),
    residences: idsOf(claims, 'P551'),
    memberOf: idsOf(claims, 'P463'),
    notableWorks: idsOf(claims, 'P800'),
  };
  const deathPlaceId = idsOf(claims, 'P20')[0];
  const deathCauseId = idsOf(claims, 'P509')[0];

  const allIds = unique([
    ...familyIds.flat(),
    ...awardClaims.map((claim) => entityId(claim.mainsnak)!),
    ...nominationClaims.map((claim) => entityId(claim.mainsnak)!),
    ...Object.values(listProperties).flat(),
    deathPlaceId,
    deathCauseId,
  ]);
  const labels = allIds.length > 0 ? await getWikidataLabels(allIds) : new Map<string, string>();
  const labelsOf = (ids: string[]) => unique(ids.map((id) => labels.get(id)));

  const family = FAMILY_PROPERTIES.map(({ relation }, index) => ({
    relation,
    names: labelsOf(familyIds[index]),
  })).filter((entry) => entry.names.length > 0);

  return {
    heightMeters: heightInMeters(claims.P2048),
    family,
    awards: toAwards(awardClaims, labels),
    nominations: toAwards(nominationClaims, labels),
    birthName: textOf(claims, 'P1477'),
    nationalities: labelsOf(listProperties.nationalities),
    occupations: labelsOf(listProperties.occupations),
    spokenLanguages: labelsOf(listProperties.spokenLanguages),
    education: labelsOf(listProperties.education),
    residences: labelsOf(listProperties.residences),
    memberOf: labelsOf(listProperties.memberOf),
    notableWorks: labelsOf(listProperties.notableWorks),
    deathPlace: deathPlaceId ? (labels.get(deathPlaceId) ?? null) : null,
    deathCause: deathCauseId ? (labels.get(deathCauseId) ?? null) : null,
    officialWebsite: textOf(claims, 'P856'),
    wikipediaTitles: {
      fr: entity.sitelinks?.frwiki?.title ?? null,
      en: entity.sitelinks?.enwiki?.title ?? null,
    },
  };
}
