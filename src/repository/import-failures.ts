import { desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { importFailures, type ImportFailureKind } from '@/db/schema';
import { deserializeCandidate, serializeCandidate, type ImportCandidate } from '@/import/types';

import { importMovie, importShow } from './import';

export async function recordImportFailure(candidate: ImportCandidate) {
  const kind: ImportFailureKind = candidate.kind;
  await db.insert(importFailures).values({
    displayName: candidate.displayName,
    kind,
    payload: serializeCandidate(candidate),
  });
}

export async function listImportFailures() {
  return db.query.importFailures.findMany({ orderBy: desc(importFailures.createdAt) });
}

export async function removeImportFailure(id: number) {
  await db.delete(importFailures).where(eq(importFailures.id, id));
}

/**
 * Replays a failure's full extracted history (episodes watched, follow status, dates…) against the
 * TMDB match the user picked manually, instead of adding an empty title. Falls back to a bare add if
 * this failure predates the payload column (or its payload is missing for any reason).
 */
export async function resolveImportFailure(id: number, tmdbId: number) {
  const failure = await db.query.importFailures.findFirst({ where: eq(importFailures.id, id) });
  if (!failure) return;

  if (failure.payload) {
    const candidate = deserializeCandidate(failure.payload);
    if (candidate.kind === 'tv') {
      await importShow(tmdbId, candidate);
    } else {
      await importMovie(tmdbId, candidate);
    }
  } else if (failure.kind === 'tv') {
    await importShow(tmdbId, {
      kind: 'tv',
      key: failure.displayName,
      displayName: failure.displayName,
      isFollowed: false,
      isForLater: false,
      isFavorite: false,
      isArchived: false,
      specialStatus: null,
      addedAt: null,
      episodeWatches: new Map(),
    });
  } else {
    await importMovie(tmdbId, {
      kind: 'movie',
      key: failure.displayName,
      displayName: failure.displayName,
      watchedAt: null,
      rewatchCount: 0,
      addedAt: null,
    });
  }

  await removeImportFailure(id);
}
