import type { TmdbPersonCredit, TmdbPersonDetails } from './tmdb-types';
import type { WikidataPersonProfile } from './wikidata';

const EXCLUDED_GENRE_IDS = [10763, 10767];

const DEPARTMENT_LABELS: Record<string, string> = {
  Acting: 'Acteur',
  Voice: 'Voix',
  Directing: 'Réalisation',
  Writing: 'Écriture',
  Production: 'Production',
  Sound: 'Musique et son',
  Camera: 'Image',
  Editing: 'Montage',
  Art: 'Direction artistique',
  'Visual Effects': 'Effets visuels',
  'Costume & Make-Up': 'Costumes et maquillage',
  Lighting: 'Éclairage',
  Crew: 'Équipe technique',
};

const JOB_LABELS: Record<string, string> = {
  Director: 'Réalisateur',
  Writer: 'Scénariste',
  Screenplay: 'Scénariste',
  Teleplay: 'Scénariste télé',
  Story: 'Histoire originale',
  Creator: 'Créateur',
  'Executive Producer': 'Producteur exécutif',
  Producer: 'Producteur',
  'Co-Producer': 'Coproducteur',
  'Co-Executive Producer': 'Coproducteur exécutif',
  'Associate Producer': 'Producteur associé',
  'Original Music Composer': 'Compositeur',
  Music: 'Musique',
  'Director of Photography': 'Directeur de la photographie',
  Editor: 'Monteur',
  Novel: 'Roman original',
  Characters: 'Création des personnages',
  'Series Composition': 'Écriture de la série',
  'Casting': 'Casting',
};

export function jobLabel(job: string | undefined) {
  if (!job) return '';
  return JOB_LABELS[job] ?? job;
}

export function creditsForShow(person: TmdbPersonDetails, mediaType: 'movie' | 'tv', id: number): TmdbPersonCredit[] {
  const matches = (credit: TmdbPersonCredit) => credit.media_type === mediaType && credit.id === id;
  const cast = (person.combined_credits?.cast ?? []).filter(matches);
  const crew = (person.combined_credits?.crew ?? []).filter(matches);
  return [...cast, ...crew];
}

export function departmentLabel(department: string) {
  return DEPARTMENT_LABELS[department] ?? department;
}

export type FilmographyEntry = {
  key: string;
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  year: string | null;
  posterPath: string | null;
  role: string | null;
  episodeCount: number | null;
  creditId: string;
};

export type FilmographyGroup = {
  department: string;
  label: string;
  entries: FilmographyEntry[];
};

function creditDate(credit: TmdbPersonCredit) {
  return credit.release_date || credit.first_air_date || '';
}

function toEntry(credit: TmdbPersonCredit, role: string | null): FilmographyEntry {
  const date = creditDate(credit);
  return {
    key: `${credit.media_type}-${credit.id}`,
    id: credit.id,
    mediaType: credit.media_type,
    title: credit.title ?? credit.name ?? '',
    year: date ? date.slice(0, 4) : null,
    posterPath: credit.poster_path,
    role,
    episodeCount: credit.media_type === 'tv' ? (credit.episode_count ?? null) : null,
    creditId: credit.credit_id,
  };
}

function byDateDescending(a: FilmographyEntry, b: FilmographyEntry) {
  if (a.year == null && b.year == null) return 0;
  if (a.year == null) return -1;
  if (b.year == null) return 1;
  return b.year.localeCompare(a.year);
}

function isExcluded(credit: TmdbPersonCredit) {
  return credit.genre_ids?.some((genreId) => EXCLUDED_GENRE_IDS.includes(genreId)) ?? false;
}

const VOICE_TAG = /\s*\((?:[^)]*\b)?voice\b[^)]*\)/i;

function isVoiceRole(character: string | undefined) {
  return character != null && VOICE_TAG.test(character);
}

function stripVoiceTag(character: string) {
  return character.replace(VOICE_TAG, '').trim();
}

function mergeCastCredits(credits: TmdbPersonCredit[], stripVoice: boolean) {
  const byKey = new Map<string, FilmographyEntry>();
  for (const credit of credits) {
    const rawRole = credit.character?.trim() || null;
    const role = rawRole && stripVoice ? stripVoiceTag(rawRole) || null : rawRole;
    const entry = toEntry(credit, role);
    const existing = byKey.get(entry.key);
    if (!existing) {
      byKey.set(entry.key, entry);
      continue;
    }
    if (entry.role && !existing.role?.split(' / ').includes(entry.role)) {
      existing.role = existing.role ? `${existing.role} / ${entry.role}` : entry.role;
    }
    if (entry.episodeCount != null) existing.episodeCount = (existing.episodeCount ?? 0) + entry.episodeCount;
  }
  return [...byKey.values()].sort(byDateDescending);
}

export function buildFilmography(person: TmdbPersonDetails): FilmographyGroup[] {
  const cast = person.combined_credits?.cast ?? [];
  const crew = person.combined_credits?.crew ?? [];
  const groups: FilmographyGroup[] = [];

  const visibleCast = cast.filter((credit) => !isExcluded(credit));
  const actingEntries = mergeCastCredits(
    visibleCast.filter((credit) => !isVoiceRole(credit.character)),
    false,
  );
  const voiceEntries = mergeCastCredits(
    visibleCast.filter((credit) => isVoiceRole(credit.character)),
    true,
  );
  if (actingEntries.length > 0) {
    groups.push({ department: 'Acting', label: DEPARTMENT_LABELS.Acting, entries: actingEntries });
  }
  if (voiceEntries.length > 0) {
    groups.push({ department: 'Voice', label: DEPARTMENT_LABELS.Voice, entries: voiceEntries });
  }

  const byDepartment = new Map<string, Map<string, { credit: TmdbPersonCredit; jobs: string[] }>>();
  for (const credit of crew) {
    if (!credit.department) continue;
    const entries = byDepartment.get(credit.department) ?? new Map();
    const key = `${credit.media_type}-${credit.id}`;
    const existing = entries.get(key);
    if (existing) {
      if (credit.job && !existing.jobs.includes(credit.job)) existing.jobs.push(credit.job);
    } else {
      entries.set(key, { credit, jobs: credit.job ? [credit.job] : [] });
    }
    byDepartment.set(credit.department, entries);
  }

  for (const [department, entries] of byDepartment) {
    groups.push({
      department,
      label: DEPARTMENT_LABELS[department] ?? department,
      entries: [...entries.values()]
        .map(({ credit, jobs }) => toEntry(credit, jobs.length > 0 ? jobs.map(jobLabel).join(', ') : null))
        .sort(byDateDescending),
    });
  }

  const principal = person.known_for_department;
  return groups.sort((a, b) => {
    const isPrincipal = (department: string) =>
      department === principal || (principal === 'Acting' && department === 'Voice');
    if (isPrincipal(a.department) && !isPrincipal(b.department)) return -1;
    if (isPrincipal(b.department) && !isPrincipal(a.department)) return 1;
    const rank = (department: string) => (department === 'Acting' ? 0 : department === 'Voice' ? 1 : 2);
    if (rank(a.department) !== rank(b.department)) return rank(a.department) - rank(b.department);
    return b.entries.length - a.entries.length;
  });
}

export function buildKnownFor(person: TmdbPersonDetails, limit = 6): FilmographyEntry[] {
  const credits =
    person.known_for_department === 'Acting'
      ? (person.combined_credits?.cast ?? [])
      : (person.combined_credits?.crew ?? []);

  const best = new Map<string, TmdbPersonCredit>();
  for (const credit of credits) {
    if (!credit.poster_path || isExcluded(credit)) continue;
    const key = `${credit.media_type}-${credit.id}`;
    const existing = best.get(key);
    if (!existing || (credit.vote_count ?? 0) > (existing.vote_count ?? 0)) best.set(key, credit);
  }

  return [...best.values()]
    .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
    .slice(0, limit)
    .map((credit) => toEntry(credit, credit.character?.trim() || jobLabel(credit.job) || null));
}

export function formatPersonDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ageFrom(birthday: string, deathday: string | null) {
  const [year, month, day] = birthday.split('-').map(Number);
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - year;
  if (end.getMonth() + 1 < month || (end.getMonth() + 1 === month && end.getDate() < day)) age -= 1;
  return age;
}

export type AboutRow = { label: string; value: string; url?: string };

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function distinct(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeOccupations(labels: string[], gender: number | undefined) {
  const simplified = labels.map((label) => {
    const match = label.match(/^(.+?) ou (.+?)( de .*)?$/);
    const gendered = match ? (gender === 1 ? match[2] : match[1]) : label;
    return capitalize(gendered.split(' de ')[0].split(" d'")[0].trim());
  });
  return distinct(simplified);
}

export function buildAboutRows(
  person: TmdbPersonDetails,
  wikidata: WikidataPersonProfile | undefined,
  wikipediaUrl: string | null,
): AboutRow[] {
  const rows: (AboutRow | null)[] = [];
  const names = [person.name, wikidata?.birthName ?? ''].map((name) => name.toLowerCase());

  if (wikidata?.birthName && wikidata.birthName.toLowerCase() !== person.name.toLowerCase()) {
    rows.push({ label: 'Nom de naissance', value: wikidata.birthName });
  }

  const aliases = distinct((person.also_known_as ?? []).filter((alias) => !names.includes(alias.toLowerCase()))).slice(0, 4);
  if (aliases.length > 0) rows.push({ label: 'Aussi connu sous', value: aliases.join(', ') });

  if (wikidata) {
    if (wikidata.nationalities.length > 0) {
      rows.push({ label: 'Nationalité', value: wikidata.nationalities.map(capitalize).join(', ') });
    }
    const occupations = normalizeOccupations(wikidata.occupations, person.gender);
    if (occupations.length > 0) rows.push({ label: 'Métiers', value: occupations.join(', ') });
    if (wikidata.spokenLanguages.length > 0) {
      rows.push({ label: 'Langues parlées', value: wikidata.spokenLanguages.map(capitalize).join(', ') });
    }
    if (wikidata.education.length > 0) rows.push({ label: 'Études', value: wikidata.education.join(', ') });
    if (wikidata.residences.length > 0) rows.push({ label: 'Résidence', value: wikidata.residences.join(', ') });
    if (wikidata.memberOf.length > 0) rows.push({ label: 'Membre de', value: wikidata.memberOf.join(', ') });
    if (wikidata.notableWorks.length > 0) rows.push({ label: 'Œuvres notables', value: wikidata.notableWorks.join(', ') });
    if (person.deathday && (wikidata.deathPlace || wikidata.deathCause)) {
      rows.push({
        label: 'Décès',
        value: [wikidata.deathPlace, wikidata.deathCause ? capitalize(wikidata.deathCause) : null].filter(Boolean).join(' - '),
      });
    }
  }

  const website = wikidata?.officialWebsite ?? person.homepage ?? null;
  if (website) rows.push({ label: 'Site officiel', value: website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), url: website });
  if (wikipediaUrl) rows.push({ label: 'Wikipédia', value: 'Lire la page complète', url: wikipediaUrl });

  return rows.filter((row): row is AboutRow => row != null);
}
