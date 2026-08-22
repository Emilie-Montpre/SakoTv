# Backlog — Fiche détail enrichie

Fonctionnalités demandées pour étoffer l'écran Fiche (film/série/animé), pas encore implémentées.

- [ ] **Bande-annonce** — TMDB a un endpoint `/movie|tv/{id}/videos` (YouTube trailers), gratuit, directement exploitable.
- [ ] **Avis/critiques** (IMDb, Rotten Tomatoes "Tomatometer", "Popcornmeter"/audience score) — pas disponible via TMDB (qui n'a que sa propre note communautaire, différente d'IMDb). TMDB donne l'`imdb_id` via `external_ids` (lien "Voir sur IMDb" possible sans la note). Pour les vraies notes, passer par **OMDb API** (omdbapi.com) : agrège IMDb + Tomatometer + Metacritic depuis l'imdb_id. Nécessite une clé API séparée (gratuite mais limitée, ~1000 req/jour, payant au-delà) ; couverture Rotten Tomatoes parfois incomplète côté OMDb. **Décidé le 2026-08-21 : reporté, décision prise le moment venu.**
- [ ] **Langues** — langue(s) audio et sous-titres disponibles (VF/VO/autres) — à vérifier si TMDB expose cette info de façon fiable (`spoken_languages` existe mais ne dit pas ce qui est réellement doublé/sous-titré pour un titre donné).
- [ ] **Où regarder** *(facultatif, priorité basse)* — plateformes de streaming disponibles par pays (type JustWatch), avec bouton pour ouvrir l'app correspondante (Netflix, Prime, etc.) et distinction abonnement/gratuit. **Confirmé : pas besoin d'intégrer JustWatch séparément** (pas d'API publique en libre accès pour eux) — leurs données sont déjà agrégées gratuitement dans TMDB via `/movie|tv/{id}/watch/providers`.

## Backlog — Import

- [ ] **Revue "façon Tinder" des correspondances auto-confirmées** — même quand le matching TMDB automatique trouve *une* correspondance avec un score correct, ce n'est pas toujours la bonne (ex. mauvais film du même nom, remake vs original). Idée : après l'import, écran de swipe passant en revue chaque titre confirmé automatiquement — swipe pour garder, swipe pour rejeter (renvoie l'entrée dans "Échec import" pour recherche manuelle). Volontairement pas fait tout de suite : fastidieux à valider un par un tant qu'on corrige encore des bugs plus fondamentaux sur les statuts. **Demandé le 2026-08-21.**

- [ ] **Second mode d'import : liste de titres en texte libre** — sur l'écran Import, proposer un choix entre le zip GDPR actuel et une saisie/collage de plusieurs titres en texte (un par ligne). **Demandé le 2026-08-21.**
  - [ ] Chaque titre de la liste passe par le matching TMDB (même logique que pour le zip), puis par l'écran de revue "façon Tinder" ci-dessus (réutilisation, pas un flux séparé) pour confirmer/corriger la correspondance
  - [ ] **Différence clé avec l'import zip** : un titre saisi en texte n'a aucune donnée de progression (pas de CSV TV Time derrière) — l'écran de revue doit donc, pour chaque titre confirmé, demander en plus :
    - Pour une série/animé : combien d'épisodes (ou lesquels précisément) ont déjà été vus
    - Le statut voulu à l'issue de la saisie : continuer à suivre (`watching`, avec la progression indiquée) ou déjà terminé (`completed`)
  - [ ] Pour un film, plus simple : juste demander si déjà vu (`completed`) ou à voir (`to_watch`) — cf. décision du 2026-08-21 de ne plus avoir de "en cours" pour les films
  - [ ] Question ouverte à trancher le moment venu : saisie épisode par épisode (case à cocher par épisode, comme sur la fiche) vs. juste "vu jusqu'à la saison X épisode Y" (plus rapide mais moins précis si des épisodes ont été sautés)

## Backlog — Stats interactives

Rendre les tuiles de l'écran Stats cliquables pour voir le détail derrière chaque nombre. **Demandé le 2026-08-21.**

- [ ] **Films vus** → clic → liste des films vus
- [ ] **Favoris** → clic → liste des titres favoris
- [ ] **Épisodes vus** et **Temps de visionnage** → restent non cliquables (pas de changement demandé)
- [ ] Ajouter des tuiles **Animés** et **Séries** (comptages), cliquables → liste des animés / séries vus
- [ ] **Bilan par année** → cliquer sur une année → voir le détail de ce qui a été regardé cette année-là

Priorité actuelle du projet : stabiliser l'import (statuts, historique d'épisodes) avant de s'attaquer à ce backlog.

## Fait — Statut "En pause"

Nouvelle catégorie entre "En cours" et "Terminé" pour les séries/animés dont le dernier épisode validé remonte à plus d'1 mois. **Demandé le 2026-08-21, implémenté le 2026-08-21.**

- Calculée à l'affichage (pas de nouvelle valeur d'enum en base) via `isPaused()` dans [content.ts](src/constants/content.ts), à partir de `getLastEpisodeWatchedAtByTitle()` dans [library.ts](src/repository/library.ts)
- Section "En pause" sous "En cours" sur l'[Accueil](src/app/(tabs)/index.tsx), et filtre + badge couleur dédiés dans la [Bibliothèque](src/app/(tabs)/library.tsx)
- Ne concerne que les titres `watching` — ne touche pas `to_watch`/`completed`/`dropped`, ni les films (pas de "en cours" pour eux)

## Backlog — Optimisation : centraliser le statut affiché par titre

Actuellement, "à jour" (`isUpToDate()`) et "en pause" (`isPaused()`) sont bien définis une seule fois chacun dans [content.ts](src/constants/content.ts), mais c'est **chaque écran** (Accueil, Bibliothèque, Fiche) qui les appelle séparément avec les bonnes données en argument — pas une vraie source unique. **Demandé le 2026-08-21 — explicitement reporté par l'utilisateur ("code optimization"), pas urgent.**

- [ ] Déplacer ce calcul dans la couche repository : `listLibraryItems()` (et l'équivalent pour la Fiche) renverrait directement un champ déjà résolu (ex. `displayStatus: 'to_watch' | 'watching' | 'paused' | 'completed' | 'up_to_date' | 'dropped'`), calculé une seule fois par récupération
- [ ] Les écrans n'auraient plus qu'à lire ce champ — plus besoin de connaître `isPaused`/`isUpToDate` ni de recevoir `lastWatchedAtByTitle`/`statusTmdb` séparément
- [ ] **Ne pas** stocker ça comme colonne en base (option évaluée et écartée le 2026-08-21) : "en pause" dépend du temps qui passe, une valeur stockée deviendrait fausse toute seule sans recalcul périodique — le calcul à la volée (mais centralisé dans le repository plutôt qu'éparpillé) reste la bonne approche
- [ ] À l'occasion, vérifier qu'il n'y a pas d'autre logique dupliquée du même genre ailleurs dans l'app (passe de nettoyage générale, pas juste ce cas précis)

## Backlog — Pause volontaire (en plus de la détection auto existante)

En plus de la détection automatique déjà en place (30 jours sans épisode validé → affiché "En pause"), ajouter une **pause volontaire** : un bouton explicite sur la fiche d'une série/animé pour la mettre en pause soi-même, indépendamment du minuteur. **Demandé le 2026-08-21 — décision prise : garder les deux en parallèle, pas remplacer l'auto par le manuel.**

- [ ] **Stockage** : pas un 5ᵉ statut dans l'enum `LibraryStatus` (ça entrerait en conflit avec la logique bidirectionnelle de `maybeCompleteShow`, qui ne connaît que to_watch/watching/completed/dropped). Plutôt un booléen indépendant, ex. `manuallyPaused` sur `library_items` — un titre reste `watching` en dessous, juste avec ce drapeau en plus. Migration de schéma nécessaire (nouvelle colonne), contrairement à "en pause" auto qui n'en demandait pas.
- [ ] **Boutons sur la Fiche** (séries/animés uniquement, pas les films — cohérent avec l'absence de "en cours" pour les films) : "Mettre en pause" quand pas en pause manuelle, "Reprendre" quand ça l'est.
- [ ] **Question ouverte** : marquer un nouvel épisode vu sur un titre en pause manuelle doit-il automatiquement lever la pause ? (probablement oui — regarder un épisode signale clairement "je reprends", évite d'avoir à cliquer "Reprendre" en plus)
- [ ] **Question ouverte** : distinguer visuellement pause automatique (inactivité) et pause manuelle (choix) ? Ou un seul badge "En pause" pour les deux, sans préciser la raison ? À trancher le moment venu.
- [ ] Le filtre "En pause" existant dans la Bibliothèque doit alors couvrir les deux cas (union : auto OU manuel), pas juste l'un des deux.

## Backlog — Statut de la barre de statut sur la fiche détail

Non résolu, laissé en l'état pour l'instant. **Demandé le 2026-08-21.**

- État actuel : header natif de React Navigation abandonné pour [title/[id].tsx](src/app/title/[id].tsx) au profit d'un `SafeAreaView` classique + bouton retour manuel (même pattern que le reste de l'app), et `<StatusBar style="auto" translucent backgroundColor="transparent" />` (expo-status-bar) ajouté globalement dans [_layout.tsx](src/app/_layout.tsx) — jamais utilisé avant dans l'app.
- Plusieurs tentatives précédentes ont échoué : header transparent + overlay sombre, `useSafeAreaInsets()` dans un `headerBackground` custom (renvoyait 0), `StatusBar.currentHeight`. Pas de moyen de vérifier visuellement le rendu depuis cet environnement (app Android uniquement, testée sur téléphone réel) — à confirmer par l'utilisateur au prochain test.
- Un point est resté ambigu dans la demande du 2026-08-21 ("enlève-moi cette part") — pas sûr que ça visait le bouton retour ou autre chose ; à clarifier si le rendu actuel ne convient toujours pas.

## Backlog — Accueil : "À venir" en vrai calendrier

Remplacer le simple listage prévu pour "À venir" (prochains épisodes/films) par quelque chose de plus abouti — visuellement proche d'un vrai calendrier plutôt qu'une liste de dates brutes. Éventuellement une section/écran à part plutôt que dans le scroll de l'Accueil. **Demandé le 2026-08-21 — non spécifié davantage, à définir le moment venu** (source des dates : `first_air_date`/`release_date` TMDB par épisode/saison à venir, déjà exploitable via l'API existante).
