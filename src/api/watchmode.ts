import { WATCHMODE_API_KEY } from '../constants/env';
import { getWatchProviderLogos, tmdbImageUrl } from './tmdb';
import type { StreamingOffer, StreamingOptionType, StreamingSummary } from './streaming-availability';

const BASE_URL = 'https://api.watchmode.com/v1';
const SECONDARY_LINK_PATTERN = /short|special|recap|trailer/i;
const EXCLUDED_NAME_PATTERN = /amazon channel|\(via /i;

const COVERED_SERVICE_IDS: Record<string, string> = {
  netflix: 'netflix',
  'hbo max': 'hbo',
  'prime video': 'prime',
  amazon: 'prime',
  'disney+': 'disney',
  'appletv+': 'apple',
  appletv: 'apple',
  'paramount+': 'paramount',
  'crunchyroll premium': 'crunchyroll',
  mubi: 'mubi',
  'pluto tv': 'plutotv',
  'curiosity stream': 'curiosity',
  zee5: 'zee5',
};

const TYPE_MAP: Record<string, StreamingOptionType> = {
  sub: 'subscription',
  free: 'free',
  rent: 'rent',
  buy: 'buy',
  purchase: 'buy',
};

const TYPE_ORDER: Record<StreamingOptionType, number> = { subscription: 0, free: 1, addon: 2, rent: 3, buy: 4 };

type WatchmodeSource = {
  source_id: number;
  name: string;
  type: string;
  web_url: string | null;
  price: number | null;
};

const LOGO_NAME_ALIASES: Record<string, string> = {
  arteboutique: 'arte',
};

let logosPromise: Promise<Map<string, string>> | null = null;

function normalizeServiceName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+]/g, '');
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, { headers: { 'X-API-Key': WATCHMODE_API_KEY } });
  if (!response.ok) {
    throw new Error(`Erreur Watchmode (${response.status}) sur ${path.split('?')[0]}`);
  }
  return response.json() as Promise<T>;
}

function getServiceLogos() {
  if (!logosPromise) {
    logosPromise = getWatchProviderLogos('FR')
      .then((providers) => {
        const logos = new Map<string, string>();
        for (const provider of providers) {
          const url = tmdbImageUrl(provider.logo_path, 'w185');
          if (url) logos.set(normalizeServiceName(provider.provider_name), url);
        }
        return logos;
      })
      .catch((error) => {
        logosPromise = null;
        throw error;
      });
  }
  return logosPromise;
}

async function findWatchmodeId(mediaType: 'movie' | 'tv', tmdbId: number) {
  const field = mediaType === 'movie' ? 'tmdb_movie_id' : 'tmdb_tv_id';
  const result = await request<{ title_results?: { id: number }[] }>(
    `/search/?search_field=${field}&search_value=${tmdbId}`,
  );
  return result.title_results?.[0]?.id ?? null;
}

export async function getWatchmodeOffers(mediaType: 'movie' | 'tv', tmdbId: number): Promise<StreamingOffer[]> {
  if (!WATCHMODE_API_KEY) return [];

  const watchmodeId = await findWatchmodeId(mediaType, tmdbId);
  if (watchmodeId == null) return [];

  const [sources, logos] = await Promise.all([
    request<WatchmodeSource[]>(`/title/${watchmodeId}/sources/?regions=FR`),
    getServiceLogos().catch(() => new Map<string, string>()),
  ]);

  const offersByKey = new Map<string, StreamingOffer & { amount: number }>();
  for (const source of sources) {
    const type = TYPE_MAP[source.type];
    if (!type || !source.web_url || EXCLUDED_NAME_PATTERN.test(source.name)) continue;

    const key = `wm-${source.source_id}:${type}`;
    const amount = source.price ?? 0;
    const existing = offersByKey.get(key);
    if (existing) {
      const existingIsSecondary = SECONDARY_LINK_PATTERN.test(existing.link);
      const sourceIsSecondary = SECONDARY_LINK_PATTERN.test(source.web_url);
      if (existingIsSecondary === sourceIsSecondary && existing.amount <= amount) continue;
      if (!existingIsSecondary && sourceIsSecondary) continue;
    }

    const normalizedName = normalizeServiceName(source.name);
    const logo = logos.get(LOGO_NAME_ALIASES[normalizedName] ?? normalizedName) ?? null;
    offersByKey.set(key, {
      key,
      serviceId: COVERED_SERVICE_IDS[source.name.toLowerCase()] ?? `wm-${source.source_id}`,
      serviceName: source.name,
      type,
      link: source.web_url,
      priceLabel: source.price != null ? `${source.price} EUR` : null,
      logoLight: logo,
      logoDark: logo,
      amount,
    });
  }

  return [...offersByKey.values()].map(({ amount: _amount, ...offer }) => offer);
}

export function mergeWatchmodeOffers(base: StreamingSummary, extra: StreamingOffer[]): StreamingSummary {
  const coveredServiceIds = new Set(base.offers.map((offer) => offer.serviceId));
  const additions = extra.filter((offer) => !coveredServiceIds.has(offer.serviceId));
  if (additions.length === 0) return base;

  const offers = [...base.offers, ...additions].sort(
    (a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.serviceName.localeCompare(b.serviceName, 'fr'),
  );
  return { ...base, offers };
}
