const ORIGINAL_LANGUAGE_NAMES: Record<string, string> = {
  ja: 'japonais',
  en: 'anglais',
  fr: 'français',
  ko: 'coréen',
  zh: 'chinois',
  cn: 'cantonais',
  es: 'espagnol',
  de: 'allemand',
  it: 'italien',
  pt: 'portugais',
  ru: 'russe',
  hi: 'hindi',
  th: 'thaï',
  tr: 'turc',
  sv: 'suédois',
  da: 'danois',
  no: 'norvégien',
  nl: 'néerlandais',
  pl: 'polonais',
};

export function originalLanguageName(code: string | undefined | null) {
  if (!code) return null;
  return ORIGINAL_LANGUAGE_NAMES[code] ?? code.toUpperCase();
}

export function isVoiceCast(members: { character?: string }[]) {
  const sample = members.slice(0, 10);
  if (sample.length === 0) return false;
  const voiceCount = sample.filter((member) => /\(voice\b/i.test(member.character ?? '')).length;
  return voiceCount * 2 >= sample.length;
}

export function castTitle(base: string, members: { character?: string }[], originalLanguage: string | null) {
  if (!isVoiceCast(members)) return base;
  return originalLanguage ? `${base} (voix originales, ${originalLanguage})` : `${base} (voix originales)`;
}
