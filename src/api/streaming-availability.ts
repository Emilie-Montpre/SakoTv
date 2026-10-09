import { STREAMING_AVAILABILITY_API_KEY } from '../constants/env';

const BASE_URL = 'https://api.movieofthenight.com/v4';

export type StreamingOptionType = 'subscription' | 'free' | 'rent' | 'buy' | 'addon';

export type StreamingOption = {
  service: {
    id: string;
    name: string;
    imageSet?: { lightThemeImage?: string; darkThemeImage?: string };
  };
  type: StreamingOptionType;
  link: string;
  quality?: string;
  price?: { amount: string; currency: string; formatted: string };
  audios?: { language: string }[];
  subtitles?: { locale: { language: string } }[];
};

export type StreamingShow = {
  title: string;
  streamingOptions: Record<string, StreamingOption[]>;
};

export type StreamingOffer = {
  key: string;
  serviceName: string;
  type: StreamingOptionType;
  link: string;
  priceLabel: string | null;
  logoLight: string | null;
  logoDark: string | null;
};

export type StreamingSummary = {
  offers: StreamingOffer[];
  audioLanguages: string[];
  subtitleLanguages: string[];
};

export async function getShowByTmdbId(kind: 'movie' | 'tv', tmdbId: number, country = 'fr'): Promise<StreamingShow> {
  const url = new URL(`${BASE_URL}/shows/${kind}/${tmdbId}`);
  url.searchParams.set('country', country);

  const response = await fetch(url.toString(), {
    headers: { 'X-API-Key': STREAMING_AVAILABILITY_API_KEY },
  });
  if (!response.ok) {
    throw new Error(`Erreur Streaming Availability (${response.status}) sur ${kind}/${tmdbId}`);
  }
  return (await response.json()) as StreamingShow;
}

const LANGUAGE_NAMES: Record<string, string> = {
  fra: 'Français',
  eng: 'Anglais',
  jpn: 'Japonais',
  deu: 'Allemand',
  spa: 'Espagnol',
  ita: 'Italien',
  por: 'Portugais',
  nld: 'Néerlandais',
  rus: 'Russe',
  kor: 'Coréen',
  zho: 'Chinois',
  cmn: 'Mandarin',
  yue: 'Cantonais',
  ara: 'Arabe',
  heb: 'Hébreu',
  hin: 'Hindi',
  tur: 'Turc',
  pol: 'Polonais',
  ces: 'Tchèque',
  slk: 'Slovaque',
  hun: 'Hongrois',
  ron: 'Roumain',
  bul: 'Bulgare',
  ell: 'Grec',
  swe: 'Suédois',
  nor: 'Norvégien',
  nob: 'Norvégien',
  dan: 'Danois',
  fin: 'Finnois',
  isl: 'Islandais',
  ukr: 'Ukrainien',
  hrv: 'Croate',
  srp: 'Serbe',
  slv: 'Slovène',
  lit: 'Lituanien',
  lav: 'Letton',
  est: 'Estonien',
  tha: 'Thaï',
  vie: 'Vietnamien',
  ind: 'Indonésien',
  msa: 'Malais',
  fil: 'Filipino',
  tam: 'Tamoul',
  tel: 'Télougou',
  cat: 'Catalan',
  eus: 'Basque',
  glg: 'Galicien',
  fas: 'Persan',
};

export function languageName(code: string) {
  return LANGUAGE_NAMES[code] ?? code.toUpperCase();
}

function sortLanguages(codes: Set<string>) {
  const names = [...codes].map(languageName);
  return names.sort((a, b) => {
    if (a === 'Français') return -1;
    if (b === 'Français') return 1;
    return a.localeCompare(b, 'fr');
  });
}

export type StreamingEpisodeShow = {
  seasons?: { title: string; episodes: { streamingOptions?: Record<string, StreamingOption[]> }[] }[];
};

export async function getShowEpisodesByTmdbId(tmdbId: number, country = 'fr'): Promise<StreamingEpisodeShow> {
  const url = new URL(`${BASE_URL}/shows/tv/${tmdbId}`);
  url.searchParams.set('country', country);
  url.searchParams.set('series_granularity', 'episode');

  const response = await fetch(url.toString(), {
    headers: { 'X-API-Key': STREAMING_AVAILABILITY_API_KEY },
  });
  if (!response.ok) {
    throw new Error(`Erreur Streaming Availability (${response.status}) sur tv/${tmdbId}`);
  }
  return (await response.json()) as StreamingEpisodeShow;
}

export function summarizeEpisodeLanguages(
  show: StreamingEpisodeShow,
  seasonNumber: number,
  episodeNumber: number,
  expectedSeasonEpisodeCount: number,
  country = 'fr',
) {
  const season = show.seasons?.find((entry) => entry.title === `Season ${seasonNumber}`);
  if (!season || season.episodes.length !== expectedSeasonEpisodeCount) return null;

  const options = season.episodes[episodeNumber - 1]?.streamingOptions?.[country] ?? [];
  const audios = new Set<string>();
  const subtitles = new Set<string>();
  for (const option of options) {
    option.audios?.forEach((audio) => audios.add(audio.language));
    option.subtitles?.forEach((subtitle) => subtitles.add(subtitle.locale.language));
  }
  return { audioLanguages: sortLanguages(audios), subtitleLanguages: sortLanguages(subtitles) };
}

const TYPE_ORDER: Record<StreamingOptionType, number> = { subscription: 0, free: 1, addon: 2, rent: 3, buy: 4 };

export function summarizeStreaming(show: StreamingShow, country = 'fr'): StreamingSummary {
  const options = show.streamingOptions?.[country] ?? [];
  const audios = new Set<string>();
  const subtitles = new Set<string>();
  const offersByKey = new Map<string, StreamingOffer & { amount: number }>();

  for (const option of options) {
    option.audios?.forEach((audio) => audios.add(audio.language));
    option.subtitles?.forEach((subtitle) => subtitles.add(subtitle.locale.language));

    const key = `${option.service.id}:${option.type}`;
    const amount = option.price ? Number(option.price.amount) : 0;
    const existing = offersByKey.get(key);
    if (existing && existing.amount <= amount) continue;
    offersByKey.set(key, {
      key,
      serviceName: option.service.name,
      type: option.type,
      link: option.link,
      priceLabel: option.price?.formatted ?? null,
      logoLight: option.service.imageSet?.lightThemeImage ?? null,
      logoDark: option.service.imageSet?.darkThemeImage ?? null,
      amount,
    });
  }

  const offers = [...offersByKey.values()]
    .sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.serviceName.localeCompare(b.serviceName, 'fr'))
    .map(({ amount: _amount, ...offer }) => offer);

  return {
    offers,
    audioLanguages: sortLanguages(audios),
    subtitleLanguages: sortLanguages(subtitles),
  };
}
