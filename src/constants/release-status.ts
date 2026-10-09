const PRE_RELEASE_STATUSES = ['Rumored', 'Planned', 'In Production', 'Post Production'];

const PRE_RELEASE_LABELS: Record<string, string> = {
  Rumored: 'Simple rumeur, pas encore annoncé officiellement',
  Planned: 'Annoncé, pas encore en tournage',
  'In Production': 'En production',
  'Post Production': 'En post-production',
};

export function isPreRelease(status: string | undefined) {
  return status != null && PRE_RELEASE_STATUSES.includes(status);
}

export function preReleaseLabel(status: string | undefined) {
  return status ? (PRE_RELEASE_LABELS[status] ?? null) : null;
}
