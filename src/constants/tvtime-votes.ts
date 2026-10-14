export type TvTimeVoteKind = 'emotion' | 'rating';

export type TvTimeVoteLabel = {
  label: string;
  emoji: string | null;
  estimatedStars: number | null;
  explanation: string | null;
};

const EMOTION_LABELS: Record<number, { label: string; emoji: string }> = {
  28: { label: 'Choqué', emoji: '😵' },
  29: { label: 'Frustré', emoji: '😤' },
  30: { label: 'Triste', emoji: '😭' },
  31: { label: 'Pensif', emoji: '🤔' },
  32: { label: 'Touché', emoji: '🥺' },
  33: { label: 'Amusé', emoji: '😆' },
  34: { label: 'Effrayé', emoji: '😱' },
  35: { label: 'Ennuyé', emoji: '😑' },
  36: { label: 'Compris', emoji: '☺️' },
  37: { label: 'Emballé', emoji: '🤩' },
  38: { label: 'Confus', emoji: '🙃' },
  39: { label: 'Tendu', emoji: '😬' },
};

const WOW_CODE = 3;
const WOW_ESTIMATED_STARS = 5;

export function describeTvTimeVote(kind: TvTimeVoteKind, code: number): TvTimeVoteLabel {
  if (code === WOW_CODE) {
    return {
      label: 'Wow',
      emoji: null,
      estimatedStars: kind === 'rating' ? WOW_ESTIMATED_STARS : null,
      explanation: `Wow correspond au code ${code} de TV Time, le meilleur avis qu'on pouvait donner.`,
    };
  }

  if (kind === 'emotion') {
    const emotion = EMOTION_LABELS[code];
    if (emotion) return { ...emotion, estimatedStars: null, explanation: null };
    return {
      label: 'Réaction inconnue',
      emoji: null,
      estimatedStars: null,
      explanation: `Code ${code} : TV Time n'a jamais publié ce que ce code veut dire.`,
    };
  }

  return {
    label: 'Avis inconnu',
    emoji: null,
    estimatedStars: null,
    explanation: `Code ${code} : TV Time n'a jamais publié ce que ce code veut dire. Il pourrait être un avis moyen, sans certitude, donc pas converti en étoiles.`,
  };
}
