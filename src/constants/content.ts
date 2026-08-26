import type { LibraryStatus, MediaType } from '@/db/schema';

export const statusLabels: Record<LibraryStatus, string> = {
  to_watch: 'À regarder',
  watching: 'En cours',
  completed: 'Terminé',
  dropped: 'Abandonné',
};

export const statusColors: Record<LibraryStatus, string> = {
  to_watch: '#6B7280',
  watching: '#F5A524',
  completed: '#22C55E',
  dropped: '#E5484D',
};

export const PAUSED_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
export const pausedLabel = 'En pause';
export const pausedColor = '#8B5CF6';
/** Raison de la pause, affichée dans le popup "Reprendre ?" de la Fiche (pas sur le bouton lui-même, qui reste un simple "En pause"). */
export function pauseReasonMessage(manuallyPaused: boolean) {
  return manuallyPaused
    ? 'Cette mise en pause a été faite manuellement.'
    : "Cette mise en pause a été détectée automatiquement (inactivité depuis plus de 30 jours).";
}

/** Une série "watching" sans épisode validé depuis 30 jours est affichée comme "En pause" plutôt que "En cours" — calculé à l'affichage, pas un statut stocké en base (cf. maybeCompleteShow, qui ne connaît que to_watch/watching/completed/dropped). */
export function isPaused(status: LibraryStatus, lastEpisodeWatchedAt: number | undefined, now: number = Date.now()) {
  return status === 'watching' && lastEpisodeWatchedAt != null && now - lastEpisodeWatchedAt > PAUSED_AFTER_MS;
}

const ENDED_TV_STATUSES = ['Ended', 'Canceled'];

export const upToDateLabel = 'À jour';
export const upToDateColor = '#14B8A6';

/**
 * Une série "completed" peut vouloir dire deux choses différentes : la série est réellement finie
 * (TMDB status = Ended/Canceled), ou tu as juste vu tout ce qui est sorti pour l'instant et elle
 * continue ("Returning Series") — dans ce second cas on affiche "À jour" plutôt que "Terminé".
 */
export function isUpToDate(status: LibraryStatus, mediaType: MediaType, tvStatusFromApi?: string | null) {
  return status === 'completed' && mediaType === 'tv' && !!tvStatusFromApi && !ENDED_TV_STATUSES.includes(tvStatusFromApi);
}

export function displayStatusLabel(status: LibraryStatus, mediaType: MediaType, tvStatusFromApi?: string | null) {
  if (isUpToDate(status, mediaType, tvStatusFromApi)) return upToDateLabel;
  return statusLabels[status];
}

export const mediaTypeLabels: Record<MediaType, string> = {
  movie: 'Film',
  tv: 'Série',
};

/** "Animé" est un cas particulier des séries (isAnime), pas un MediaType à part entière. */
export function contentTypeLabel(title: { mediaType: MediaType; isAnime: boolean }) {
  if (title.mediaType === 'tv' && title.isAnime) return 'Animé';
  return mediaTypeLabels[title.mediaType];
}

export type ContentTypeFilter = 'all' | 'movie' | 'tv' | 'anime';

export function matchesContentTypeFilter(
  title: { mediaType: MediaType; isAnime: boolean },
  filter: ContentTypeFilter,
) {
  if (filter === 'all') return true;
  if (filter === 'anime') return title.mediaType === 'tv' && title.isAnime;
  if (filter === 'tv') return title.mediaType === 'tv' && !title.isAnime;
  return title.mediaType === 'movie';
}
