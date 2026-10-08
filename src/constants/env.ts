// Chaque variable est lue par accès statique (process.env.EXPO_PUBLIC_X) : Metro n'inline que ce
// format dans le bundle. Ne pas passer par une lecture dynamique (process.env[nom]).
export const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';
export const MAL_CLIENT_ID = process.env.EXPO_PUBLIC_MAL_CLIENT_ID ?? '';
export const MAL_CLIENT_SECRET = process.env.EXPO_PUBLIC_MAL_CLIENT_SECRET ?? '';
export const THETVDB_API_KEY = process.env.EXPO_PUBLIC_THETVDB_API_KEY ?? '';
export const THETVDB_PIN = process.env.EXPO_PUBLIC_THETVDB_PIN ?? '';
export const OMDB_API_KEY = process.env.EXPO_PUBLIC_OMDB_API_KEY ?? '';
export const STREAMING_AVAILABILITY_API_KEY = process.env.EXPO_PUBLIC_STREAMING_AVAILABILITY_API_KEY ?? '';

// Hors Expo (scripts de test lancés avec Node), __DEV__ n'existe pas.
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
