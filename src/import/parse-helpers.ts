export function parseBool(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export function parseIntOr(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function parseIntOrNull(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

/** Accepts epoch ms, epoch seconds, or an ISO/parseable date string. Returns null if it can't tell. */
export function parseTimestamp(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null;
  const trimmed = value.trim();

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    if (asNumber >= 1e12) return Math.round(asNumber);
    if (asNumber >= 1e9) return Math.round(asNumber * 1000);
  }

  // Les exports TV Time utilisent "YYYY-MM-DD HH:MM:SS" (espace, pas de "T") — ce n'est pas de l'ISO 8601
  // strict, et Date.parse() le gère de façon incohérente selon les moteurs JS (dont Hermes sur mobile,
  // qui peut renvoyer NaN). On le parse nous-mêmes en premier pour ne jamais rater ce format précis.
  const isoLike = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (isoLike) {
    const [, y, mo, d, h, mi, s] = isoLike;
    const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
    if (Number.isFinite(ms)) return ms;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
