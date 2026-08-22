import { searchMovie, searchTv } from '@/api/tmdb';

import { normalizeName } from './parse-helpers';
import type { ImportCandidate, TmdbMatchOption } from './types';

function bigrams(value: string): Set<string> {
  const clean = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const set = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) {
    set.add(clean.slice(i, i + 2));
  }
  return set;
}

/** Sørensen–Dice bigram similarity, 0 (no overlap) to 1 (identical). */
function similarity(a: string, b: string): number {
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.size === 0 || bigramsB.size === 0) return normalizeName(a) === normalizeName(b) ? 1 : 0;

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

export async function findTmdbMatches(candidate: ImportCandidate): Promise<TmdbMatchOption[]> {
  const response =
    candidate.kind === 'movie' ? await searchMovie(candidate.displayName) : await searchTv(candidate.displayName);

  return response.results
    .map((result) => {
      const name = result.title ?? result.name ?? '';
      const date = result.release_date ?? result.first_air_date ?? '';
      return {
        tmdbId: result.id,
        name,
        year: date.slice(0, 4),
        posterPath: result.poster_path,
        score: similarity(candidate.displayName, name),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
