# Sako TV

Remplaçant personnel de "TV Time" (fermé depuis) : suivi de films, séries et animés, 100% local, sans backend ni compte.

## Fonctionnalités

- Bibliothèque personnelle (à regarder / en cours / en pause / terminé / à jour / abandonné)
- Suivi épisode par épisode pour les séries et animés
- Import de l'export GDPR TV Time (zip de CSV) avec correspondance automatique TMDB
- Historique de visionnage et statistiques (temps regardé, genres favoris, bilan par année)
- Fiches détaillées (synopsis, casting, saisons/épisodes) via l'API TMDB

## Stack

- [Expo](https://expo.dev) (SDK 54) + [expo-router](https://docs.expo.dev/router/introduction) (React Native, TypeScript)
- [Drizzle ORM](https://orm.drizzle.team) + `expo-sqlite` — base de données 100% locale
- [TMDB](https://www.themoviedb.org/documentation/api) pour toutes les métadonnées (films, séries, images)
- [TanStack Query](https://tanstack.com/query) pour la gestion des données

Cible : Android uniquement, testé via Expo Go.

## Installation

1. Installer les dépendances

   ```bash
   npm install
   ```

2. Configurer la clé API TMDB

   ```bash
   cp .env.example .env
   ```

   Puis coller ta propre clé API TMDB (gratuite, à obtenir sur [themoviedb.org](https://www.themoviedb.org/settings/api)) dans `.env`.

3. Lancer le serveur de développement

   ```bash
   npx expo start
   ```

## Structure du projet

- `src/app/` — écrans (routing par fichiers via expo-router)
- `src/repository/` — toute la logique d'écriture en base (actions manuelles et import utilisent les mêmes fonctions)
- `src/import/` — pipeline d'import du zip GDPR TV Time (parsing, extraction, matching TMDB)
- `src/db/` — schéma Drizzle et migrations
- `TODO.md` — backlog des fonctionnalités à venir
