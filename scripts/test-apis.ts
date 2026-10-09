import { getAnimeAiringByMalId } from '../src/api/anilist';
import { getAnimeCharactersJikan, getAnimeJikan, getPersonJikan } from '../src/api/jikan';
import { getAnimeDetails, searchAnime } from '../src/api/myanimelist';
import { getOmdbByImdbId, omdbRatings } from '../src/api/omdb';
import { getShowByTmdbId } from '../src/api/streaming-availability';
import { getSeriesExtended, searchSeries } from '../src/api/thetvdb';
import { getWikidataEntity } from '../src/api/wikidata';
import {
  MYANIMELIST_CLIENT_ID,
  OMDB_API_KEY,
  STREAMING_AVAILABILITY_API_KEY,
  THETVDB_API_KEY,
} from '../src/constants/env';

type Check = { name: string; requiredKey: string | null; run: () => Promise<string> };

const checks: Check[] = [
  {
    name: 'myanimelist',
    requiredKey: MYANIMELIST_CLIENT_ID,
    run: async () => {
      const search = await searchAnime('Cowboy Bebop', 3);
      const details = await getAnimeDetails(1);
      return `recherche: ${search.data.length} resultat(s), fiche #1: "${details.title}" (${details.num_episodes} episodes)`;
    },
  },
  {
    name: 'thetvdb',
    requiredKey: THETVDB_API_KEY,
    run: async () => {
      const search = await searchSeries('Breaking Bad');
      const series = await getSeriesExtended(81189);
      return `recherche: ${search.length} resultat(s), serie 81189: "${series.name}" (${series.year})`;
    },
  },
  {
    name: 'omdb',
    requiredKey: OMDB_API_KEY,
    run: async () => {
      const data = await getOmdbByImdbId('tt0903747');
      return `"${data.Title}" -> ${JSON.stringify(omdbRatings(data))}`;
    },
  },
  {
    name: 'streaming',
    requiredKey: STREAMING_AVAILABILITY_API_KEY,
    run: async () => {
      const show = await getShowByTmdbId('movie', 603, 'fr');
      const services = (show.streamingOptions?.fr ?? []).map((option) => option.service.name);
      return `"${show.title}" en France: ${[...new Set(services)].join(', ') || 'aucune offre'}`;
    },
  },
  {
    name: 'jikan',
    requiredKey: null,
    run: async () => {
      const anime = await getAnimeJikan(1);
      const characters = await getAnimeCharactersJikan(1);
      const voice = characters.find((entry) => entry.voice_actors.length > 0)?.voice_actors[0];
      const person = voice ? await getPersonJikan(voice.person.mal_id) : null;
      return `fiche #1: "${anime.title}", ${characters.length} personnage(s), doubleur: ${person?.name ?? 'aucun'}`;
    },
  },
  {
    name: 'anilist',
    requiredKey: null,
    run: async () => {
      const media = await getAnimeAiringByMalId(1);
      const next = media.nextAiringEpisode;
      return `MAL #1 -> AniList #${media.id} "${media.title.romaji}" (${media.status}), prochain episode: ${next ? new Date(next.airingAt * 1000).toISOString() : 'aucun'}`;
    },
  },
  {
    name: 'wikidata',
    requiredKey: null,
    run: async () => {
      const entity = await getWikidataEntity('Q42');
      return `Q42 -> "${entity.labels?.fr?.value ?? entity.labels?.en?.value}"`;
    },
  },
];

async function main() {
  const wanted = process.argv.slice(2);
  const selected = wanted.length ? checks.filter((check) => wanted.includes(check.name)) : checks;
  let failures = 0;

  for (const check of selected) {
    if (check.requiredKey !== null && !check.requiredKey) {
      console.log(`[SKIP] ${check.name} : cle absente dans .env`);
      continue;
    }
    try {
      console.log(`[OK]   ${check.name} : ${await check.run()}`);
    } catch (error) {
      failures += 1;
      console.log(`[FAIL] ${check.name} : ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  process.exit(failures ? 1 : 0);
}

main();
