export const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';

if (!TMDB_API_KEY && __DEV__) {
  console.warn(
    'EXPO_PUBLIC_TMDB_API_KEY manquante — crée un fichier .env à la racine du projet avec EXPO_PUBLIC_TMDB_API_KEY=ta_clé (voir .env.example).',
  );
}
