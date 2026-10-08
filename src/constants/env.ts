export const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';
export const MYANIMELIST_CLIENT_ID = process.env.EXPO_PUBLIC_MYANIMELIST_CLIENT_ID ?? '';
export const MYANIMELIST_CLIENT_SECRET = process.env.EXPO_PUBLIC_MYANIMELIST_CLIENT_SECRET ?? '';
export const THETVDB_API_KEY = process.env.EXPO_PUBLIC_THETVDB_API_KEY ?? '';
export const THETVDB_PIN = process.env.EXPO_PUBLIC_THETVDB_PIN ?? '';
export const OMDB_API_KEY = process.env.EXPO_PUBLIC_OMDB_API_KEY ?? '';
export const STREAMING_AVAILABILITY_API_KEY = process.env.EXPO_PUBLIC_STREAMING_AVAILABILITY_API_KEY ?? '';

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

const REQUIRED_KEYS: Record<string, string> = {
  EXPO_PUBLIC_TMDB_API_KEY: TMDB_API_KEY,
};

if (isDev) {
  for (const [name, value] of Object.entries(REQUIRED_KEYS)) {
    if (!value) {
      console.warn(
        `${name} manquante — crée un fichier .env à la racine du projet avec ${name}=ta_clé (voir .env.example).`,
      );
    }
  }
}
