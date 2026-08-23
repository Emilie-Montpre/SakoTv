## Backlog — Propositions Claude, validées par l'utilisateur

Suggestions proposées le 2026-08-23, toutes acceptées. **Demandé le 2026-08-23.**

- [ ] **Export/sauvegarde des données locales** — bouton "Exporter mes données" (JSON) dans Stats, à côté de "Réinitialiser". Toutes les données étant locales (SQLite), il n'y a aujourd'hui aucun moyen de les sauvegarder en cas de perte/changement de téléphone — ironique vu que Sako TV existe justement parce que TV Time a fermé et emporté les données avec lui.
- [ ] **Recherche dans la Bibliothèque** — barre de recherche par nom de titre directement dans l'écran Bibliothèque, en plus des filtres type/statut existants. Utile une fois la bibliothèque bien remplie après import.
- [ ] **Notifications locales pour les sorties** — notifier quand un prochain épisode ou un film à venir sort, pour tout titre déjà dans la bibliothèque (prochain épisode d'une série en cours, ou date de sortie d'un film suivi). Dépend de "À venir" (même source de données TMDB : `first_air_date`/`release_date`). Jugé "absolument" à garder par l'utilisateur.
- [ ] **Randomizer "Qu'est-ce que je regarde ensuite ?"** — tire un titre au hasard dans la liste "à regarder", pour les soirs sans idée.
- [ ] **Bilan annuel façon "Wrapped"** — confirmé le 2026-08-23. Reprend les données déjà calculées pour "Bilan par année" (Stats), mais dans une présentation plus visuelle façon carte-résumé ("cette année : 47 films, 312 épisodes, ton genre préféré était X") plutôt qu'une liste chiffrée brute.
- [ ] **Valider le prochain épisode depuis l'Accueil** — confirmé et détaillé le 2026-08-23, sur les vignettes de la grille "En cours".
  - Valide le prochain épisode **non-vu** de la série concernée.
  - **Condition** : uniquement si cet épisode est déjà sorti (`airDate` déjà passée) — si le prochain épisode n'est pas encore diffusé, l'action n'est pas disponible sur cette vignette.
  - **Doit indiquer clairement quel épisode va être validé** (ex. "S2E5 · Titre de l'épisode") avant/pendant l'action — pas une validation silencieuse à l'aveugle.
  - **Question ouverte** : quel geste déclenche l'action ? Un tap simple sur la vignette ouvre déjà la fiche aujourd'hui — appui long probable pour ne pas rentrer en conflit, mais à confirmer le moment venu.
  - **Animation de l'appui long** : une jauge verte qui se remplit progressivement pendant la durée de l'appui, uniquement sur l'image de la vignette (pas sur le texte par-dessus) — le nom de l'épisode à valider (cf. point ci-dessus) doit rester lisible et non recouvert par le remplissage pendant toute l'animation.

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

Rendre les tuiles de l'écran Stats cliquables pour voir le détail derrière chaque nombre. **Demandé le 2026-08-21, précisé le 2026-08-22.**

- [ ] **Films vus** → clic → liste des films vus
- [ ] **Favoris** → clic → liste des titres favoris
- [ ] **Dans la bibliothèque** → clic → ouvre l'écran Bibliothèque existant (pas de vue séparée à créer, juste une navigation)
- [ ] **Épisodes vus** et **Temps de visionnage** → restent non cliquables (pas de changement demandé)
- [ ] **Genres favoris** → reste tel quel, non cliquable (confirmé le 2026-08-22)
- [ ] Ajouter des tuiles **Animés** et **Séries** (comptages), cliquables → liste des animés / séries vus
- [ ] **Bilan par année** → cliquer sur une année → voir le détail de ce qui a été regardé cette année-là (films vus **et**, pour les épisodes, à quelles séries ils appartiennent — pas juste le total brut d'épisodes de l'année)

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

En plus de la détection automatique déjà en place (30 jours sans épisode validé → affiché "En pause"), ajouter une **pause volontaire** : pouvoir mettre une série/animé en pause soi-même, indépendamment du minuteur. **Demandé le 2026-08-21 — décision prise : garder les deux en parallèle, pas remplacer l'auto par le manuel.**

**Mise à jour du 2026-08-22** : le déclencheur n'est plus des boutons "Mettre en pause"/"Reprendre" séparés — c'est maintenant intégré au bouton central unique de la fiche (voir section "Fiche détail : refonte du bouton de statut" ci-dessous — appui simple sur "En cours" = mettre en pause, appui simple sur "En pause" = reprendre). Les points ci-dessous restent valables :

- [ ] **Stockage** : pas un 5ᵉ statut dans l'enum `LibraryStatus` (ça entrerait en conflit avec la logique bidirectionnelle de `maybeCompleteShow`, qui ne connaît que to_watch/watching/completed/dropped). Plutôt un booléen indépendant, ex. `manuallyPaused` sur `library_items` — un titre reste `watching` en dessous, juste avec ce drapeau en plus. Migration de schéma nécessaire (nouvelle colonne), contrairement à "en pause" auto qui n'en demandait pas.
- [ ] **Question ouverte** : marquer un nouvel épisode vu sur un titre en pause manuelle doit-il automatiquement lever la pause ? (probablement oui — regarder un épisode signale clairement "je reprends", évite d'avoir à passer par le popup "Reprendre" en plus)
- [ ] **Question ouverte** : distinguer visuellement pause automatique (inactivité) et pause manuelle (choix) ? Ou un seul badge "En pause" pour les deux, sans préciser la raison ? À trancher le moment venu.
- [ ] Le filtre "En pause" existant dans la Bibliothèque doit alors couvrir les deux cas (union : auto OU manuel), pas juste l'un des deux.

## Backlog — Fiche détail : refonte du bouton de statut

Remplace l'actuelle rangée de chips cliquables (À regarder / En cours / En pause / Terminé / Abandonné, sélection manuelle libre) par un mécanisme entièrement différent. **Demandé et détaillé le 2026-08-22, validé par l'utilisateur.**

**Coin haut-droit de la fiche** : une simple étoile (☆/★) pour les favoris, à la place de la rangée de chips actuelle pour ça. Pas de menu "..." pour l'instant — réservé pour plus tard si d'autres actions s'ajoutent un jour ; tant qu'il n'y a que les favoris, une étoile seule suffit.

**Bouton central unique** : son libellé et sa couleur reflètent **toujours** le statut réellement dérivé des données (jamais choisi à la main) — mêmes règles qu'aujourd'hui (`maybeCompleteShow`, `isPaused`, `isUpToDate`). Ce n'est plus un sélecteur, mais une action contextuelle selon l'état :

| Statut affiché | Comment on y arrive | Appui simple | Appui long |
|---|---|---|---|
| *(pas encore ajouté)* | — | "Ajouter à la bibliothèque" → passe direct à "À regarder" | — |
| À regarder | Ajouté, aucun épisode validé | Retire de la bibliothèque directement, **sans popup de confirmation** (rien à perdre) | Aucune action |
| En cours | Au moins un épisode validé, pas tout | Popup "Mettre en pause ?" → En pause | Popup "Abandonner ?" → Abandonné (garde l'historique) |
| En pause | En cours + inactif 30j, ou pause manuelle | Popup "Reprendre ?" → repasse à l'état réel (en cours, vu qu'il y a déjà des épisodes vus) | Popup "Abandonner ?" → Abandonné |
| Terminé / À jour | Tous les épisodes sortis sont vus | Aucune action | Aucune action |
| Abandonné | Marqué abandonné (manuellement ou via appui long) | Popup "Reprendre ?" → repasse à l'état réel (à regarder ou en cours selon la progression) | Aucune action |

- [ ] **Décision prise** : pas de catégorie "Reprise" séparée pour les titres qu'on dit vouloir reprendre sans le faire vraiment — le mécanisme "En pause" auto (30 jours d'inactivité) couvre déjà ce cas en repassant tout seul en pause si la reprise ne se concrétise pas.
- [ ] Seule l'action "À regarder → retirer" (appui simple) se fait sans popup ; toutes les autres transitions (mettre en pause, abandonner, reprendre) demandent une confirmation via popup.
- [ ] Remplace la logique actuelle de `LibraryActions` dans [title/[id].tsx](src/app/title/[id].tsx) (rangée de chips `statusLabels` cliquables) — à repenser entièrement autour de ce bouton unique.
- [ ] Dépend de la "Pause volontaire" ci-dessus (le `manuallyPaused` doit exister pour que "Mettre en pause"/"Reprendre" fonctionnent).

## Backlog — Statut de la barre de statut sur la fiche détail

Non résolu, laissé en l'état pour l'instant. **Demandé le 2026-08-21.**

- État actuel : header natif de React Navigation abandonné pour [title/[id].tsx](src/app/title/[id].tsx) au profit d'un `SafeAreaView` classique + bouton retour manuel (même pattern que le reste de l'app), et `<StatusBar style="auto" translucent backgroundColor="transparent" />` (expo-status-bar) ajouté globalement dans [_layout.tsx](src/app/_layout.tsx) — jamais utilisé avant dans l'app.
- Plusieurs tentatives précédentes ont échoué : header transparent + overlay sombre, `useSafeAreaInsets()` dans un `headerBackground` custom (renvoyait 0), `StatusBar.currentHeight`. Pas de moyen de vérifier visuellement le rendu depuis cet environnement (app Android uniquement, testée sur téléphone réel) — à confirmer par l'utilisateur au prochain test.
- Un point est resté ambigu dans la demande du 2026-08-21 ("enlève-moi cette part") — pas sûr que ça visait le bouton retour ou autre chose ; à clarifier si le rendu actuel ne convient toujours pas.

## Backlog — Exploiter d'autres données de l'export TV Time

Suite à la revue du schéma complet de l'export GDPR (`headers_summary.txt`, hors projet). **Demandé le 2026-08-22 — priorités données par l'utilisateur, à détailler avec de vrais exemples de lignes avant d'implémenter quoi que ce soit (comme pour les fichiers déjà exploités).**

- [ ] **Notes personnelles par épisode** (`ratings-3-prod-episode_votes` / `ratings-live-votes`, colonne `vote_key`) — priorité la plus haute pour l'utilisateur ("plus personnalisé"). Aucune fonctionnalité de notation n'existe dans Sako TV actuellement. Format de `vote_key` inconnu (note sur 5 ? like/dislike ? autre ?) — nécessite un exemple de ligne réelle avant de concevoir le champ en base et l'UI.
- [ ] **Listes personnalisées** (`lists-prod-lists` : `objects`, `ordering`, `description`, `is_public`) — intérêt confirmé mais pas prioritaire ("on verra"). Fonctionnalité absente de Sako TV. Format de `objects` (liste de quoi, sérialisé comment) à clarifier avec un exemple avant de se lancer. **Question ouverte (2026-08-22)** : où afficher ça dans l'app ? Bibliothèque risque d'être trop chargée visuellement ; Stats est une autre possibilité. Pas encore tranché.
- [ ] **Émotions par épisode** (`emotions-3-prod-episode_votes` / `emotions-live-votes`) — jugé "bof" par l'utilisateur mais à garder quand même. Reprend la fonctionnalité "réaction à chaud" de TV Time. Basse priorité par rapport aux notes.
- [ ] **Commentaires personnels** (`comments-prod-comments` : `movie_name`/`series_name`, texte du commentaire) — à garder, pourrait devenir un champ "notes perso" par fiche (film/série) dans Sako TV, qui n'a actuellement aucun champ de ce type.
- [ ] **Vérification du volume importé** (`user_statistics`, `stats-prod-cache` : `nb_episodes_watched`, `time_spent`, `nb_shows_followed`) — pas une fonctionnalité utilisateur, mais un outil de QA : comparer ces totaux TV Time avec ce que l'import Sako TV calcule réellement, pour confirmer qu'aucune donnée n'est perdue en route. Explicitement apprécié par l'utilisateur pour cet usage.
  - [ ] Croiser avec le mécanisme d'échecs d'import déjà existant (`import_failures`) — un écart de volume pourrait s'expliquer par des titres non matchés à TMDB plutôt qu'un vrai bug d'extraction. **Utilisateur : "à voir".**
- [ ] Pour la suite : demander un exemple de ligne réelle par fichier (comme fait précédemment pour `tracking-prod-records`, `tracking-prod-records-v2`, `user_show_special_status`) avant d'écrire le moindre code de parsing — même règle que jusqu'ici, pas de heuristique devinée à l'aveugle.

## Backlog — Accueil : retirer le pseudo et le message de bienvenue

**Demandé le 2026-08-22.**

- [ ] Ne plus aller chercher le pseudo importé (`getPseudo()` dans [profile.ts](src/repository/profile.ts)) sur l'écran Accueil
- [ ] Retirer complètement le "Bonjour, {pseudo}" de [index.tsx](src/app/(tabs)/index.tsx) — pas de message de bienvenue à remettre à la place, juste enlever

## Backlog — Recherche : construire les vraies recommandations

La section "Recommandations" existe déjà sur l'écran Recherche (déplacée de l'Accueil le 2026-08-21) mais n'affiche qu'un placeholder "Bientôt disponible" — aucune logique de suggestion n'existe encore. **Rappelé le 2026-08-22, pas encore spécifié** (sur quelle base recommander : genres favoris ? titres similaires à la bibliothèque via TMDB `/recommendations` ou `/similar` ? À définir le moment venu.)

## Backlog — Refonte visuelle de la Bibliothèque

L'écran Bibliothèque est fonctionnel mais pas beau visuellement ("pratique, mais pas très beau"). **Demandé le 2026-08-22 — pas encore spécifié, à détailler plus tard** (l'utilisateur a prévenu qu'il donnerait aussi des retours sur la Fiche détail séparément).

## Backlog — Animation de félicitations quand un titre passe "Terminé"

Quand une série/film/animé atteint le statut "Terminé", petite animation (confettis ou autre) pour féliciter l'utilisateur d'avoir fini quelque chose. **Demandé le 2026-08-22 — encore à déterminer, pas de détails précisés.**

- [ ] **Question ouverte** : se déclenche une seule fois (au moment exact où le statut passe à "Terminé", ex. juste après avoir validé le dernier épisode) ou à chaque fois qu'on revisite la fiche d'un titre terminé ? Probablement la première option pour ne pas devenir lassant.
- [ ] **Question ouverte** : type d'animation exact (confettis, autre) et bibliothèque à utiliser (ex. `react-native-confetti-cannon` ou équivalent) — à définir le moment venu.
- [ ] Où : probablement sur la fiche détail au moment de la transition, mais à confirmer.

## Backlog — Meilleur visuel pour la liste d'épisodes

Chaque ligne d'épisode (checkbox + numéro + nom + date de sortie) devrait aussi afficher une image représentative de l'épisode. **Demandé le 2026-08-23.**

- [ ] Utiliser `episodes.stillPath` (déjà en base, TMDB fournit une image par épisode) — pas besoin de nouvel appel API, juste jamais affiché dans l'UI actuellement.

## Backlog — Marquer toute une saison vue en un coup

Appui long sur un chip de saison (dans le sélecteur de saisons de la Fiche) → popup de confirmation ("marquer tous les épisodes de cette saison comme vus ?") → si confirmé, marque tous les épisodes de la saison concernée comme vus d'un coup. **Demandé le 2026-08-22/23.**

## Backlog — Détail d'un épisode (popup)

Actuellement, un épisode est juste une ligne (numéro + nom + case à cocher) dans la liste de la Fiche — aucun moyen de voir plus de détails alors que l'API TMDB en propose bien plus. **Demandé et détaillé le 2026-08-22.**

- [ ] **UI** : au clic sur un épisode, ouvrir une fenêtre semi-ouverte par-dessus la fiche actuelle (type bottom sheet/modal), pas une nouvelle page — l'arrière-plan (où on était) doit rester visible/deviné derrière.
- [ ] **Contenu de base** : résumé de l'épisode (`episodes.overview`, déjà en base) et image de l'épisode (`episodes.stillPath`, déjà en base — juste jamais affichée nulle part actuellement).
- [ ] **Avertissement spoiler** : si l'épisode n'a pas encore été validé comme vu, avertir avant d'afficher le résumé/l'image ("cet épisode n'a pas encore été regardé, contenu potentiellement spoiler") plutôt que tout montrer directement.
- [ ] **Pas de note d'épisode pour l'instant** — TMDB n'a que sa propre note communautaire (pas une note "officielle"). À revoir seulement si une plateforme propose une vraie note officielle par épisode (IMDb ? à vérifier, pas confirmé qu'ils le fassent).
- [ ] **Crédits par département** — TMDB expose bien ça via `/tv/{id}/season/{s}/episode/{e}/credits` (cast + crew groupé par département : Directing, Writing, Art, Production, Visual Effects, etc., avec `profile_path`) — techniquement déjà exploitable, à vérifier lors de l'implémentation.
- [ ] **Casting voix (animés)** — vouloir choisir entre voix originale (japonais) et voix doublée (français, ou anglais selon l'origine) : **à rechercher**, pas confirmé que TMDB distingue clairement un casting voix par langue de doublage dans son modèle de données standard — peut nécessiter une requête avec un paramètre `language` différent, à valider avant de s'engager sur cette partie.
- [ ] Chaque personne créditée doit être cliquable → renvoie vers la fiche personne (voir section suivante).

## Backlog — Fiche détail d'une personne (acteur/voix/équipe technique)

**Explicitement signalé par l'utilisateur comme un gros chantier à part**, dépendances/lacunes encore à clarifier. **Demandé le 2026-08-22.**

- [ ] **Doit absolument contenir** : "Connu pour" (rôles marquants) — c'est le point non-négociable mentionné par l'utilisateur.
- [ ] Biographie, filmographie/autres films-séries auxquels la personne a participé — TMDB propose `/person/{id}` (bio) et `/person/{id}/combined_credits` (filmographie complète, films + séries) : exploitable directement.
- [ ] **Photos multiples de la personne** — l'utilisateur pense que seul IMDb propose ça, mais **à corriger** : TMDB a en fait son propre endpoint `/person/{id}/images` avec plusieurs photos par personne, pas juste une seule. À vérifier la richesse réelle (peut être plus pauvre qu'IMDb en pratique, mais l'API existe).
- [ ] **Question ouverte non résolue par l'utilisateur** : est-ce que les données TMDB sur une personne seront jugées suffisantes, ou faut-il chercher une source plus complète (IMDb) ? Pas de décision prise — l'utilisateur trouve TMDB potentiellement incomplet par rapport à IMDb sur ce point précis. IMDb n'a pas d'API publique officielle (contrairement à TMDB) — à creuser si cette piste est retenue un jour (probablement via OMDb, déjà mentionné ailleurs dans ce backlog pour les notes, mais OMDb ne propose pas de bio/filmographie détaillée).
- [ ] Tâche volontairement séparée de "Détail d'un épisode" ci-dessus (celle-ci alimente les liens cliquables vers les personnes) — à ne pas fusionner, chantier distinct avec ses propres zones d'ombre à éclaircir le moment venu.

## Backlog — Accueil : "À venir" en vrai calendrier

Remplacer le simple listage prévu pour "À venir" par quelque chose de plus abouti. **Demandé le 2026-08-21 — toujours pas tranché au 2026-08-22.**

- [ ] **Décision à prendre** : vrai calendrier visuel, ou simplement une liste avec une date et ce qui sort à cette date-là ? Les deux options restent ouvertes, l'utilisateur n'a pas encore choisi.
- Source des dates : `first_air_date`/`release_date` TMDB par épisode/saison à venir, déjà exploitable via l'API existante.
- Écran déjà créé et sorti de l'Accueil ([upcoming.tsx](src/app/(tabs)/upcoming.tsx), remplace l'ancien onglet Historique dans la barre de navigation) — reste un simple placeholder "Bientôt disponible" en attendant cette décision.
