export type Reaction = { code: string; label: string; emoji: string };

export const REACTIONS: Reaction[] = [
  { code: 'touched', label: 'Touché', emoji: '🥺' },
  { code: 'amused', label: 'Amusé', emoji: '😆' },
  { code: 'thrilled', label: 'Emballé', emoji: '🤩' },
  { code: 'shocked', label: 'Choqué', emoji: '😵' },
  { code: 'scared', label: 'Effrayé', emoji: '😱' },
  { code: 'tense', label: 'Tendu', emoji: '😬' },
  { code: 'sad', label: 'Triste', emoji: '😭' },
  { code: 'frustrated', label: 'Frustré', emoji: '😤' },
  { code: 'confused', label: 'Confus', emoji: '🙃' },
  { code: 'reflective', label: 'Pensif', emoji: '🤔' },
  { code: 'understood', label: 'Compris', emoji: '☺️' },
  { code: 'bored', label: 'Ennuyé', emoji: '😑' },
];

export const MAX_RATING = 5;
