import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Animated, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMovieDetails, getTvDetails, tmdbImageUrl } from '@/api/tmdb';
import type { TmdbMovieDetails, TmdbTvDetails, TmdbVideo } from '@/api/tmdb-types';
import { CastSheet } from '@/components/cast-sheet';
import { EpisodeSheet, type EpisodeNeighbor, type EpisodeSheetData } from '@/components/episode-sheet';
import { Synopsis } from '@/components/synopsis';
import { ThemedText } from '@/components/themed-text';
import { TitleRatings } from '@/components/title-ratings';
import { TitleSimilar } from '@/components/title-similar';
import { TitleReleaseBanner } from '@/components/title-release-banner';
import { TitleLanguagesDetails, TitleLanguagesLine, TitleStreaming } from '@/components/title-streaming';

import {
  displayStatusLabel,
  isEffectivelyPaused,
  isUpToDate,
  pauseReasonMessage,
  pausedColor,
  pausedLabel,
  statusColors,
  statusLabels,
  upToDateColor,
} from '@/constants/content';
import { castTitle, originalLanguageName } from '@/constants/languages';
import { isPreRelease } from '@/constants/release-status';
import { Spacing } from '@/constants/theme';
import type { LibraryStatus, MediaType } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { resolveImportFailure } from '@/repository/import-failures';
import {
  addToLibrary,
  dropTitle,
  markEpisodesUpTo,
  markEpisodeWatched,
  markMovieWatched,
  markSeasonWatched,
  pauseManually,
  removeFromLibrary,
  resumeFromDropped,
  resumeManualPause,
  setFavorite,
  setStatus,
  unmarkEpisodeWatched,
  upsertTitleFromTmdb,
} from '@/repository/library';
import { loadTitleLocalState, type SeasonWithEpisodes } from '@/repository/title-detail';

/** Dernier épisode validé pour ce titre — calculé côté client à partir des saisons déjà chargées, pour éviter une requête dédiée en plus de listLibraryItems/getLastEpisodeWatchedAtByTitle (utilisées ailleurs pour la Bibliothèque/Accueil). */
function computeLastEpisodeWatchedAt(seasons: SeasonWithEpisodes[]): number | undefined {
  let latest: number | undefined;
  for (const season of seasons) {
    for (const episode of season.episodes) {
      if (episode.watchedAt != null && (latest == null || episode.watchedAt > latest)) {
        latest = episode.watchedAt;
      }
    }
  }
  return latest;
}

const HEADER_POSTER_OVERLAP = 56;

function formatRuntime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

/** Construit la date à partir des composantes plutôt que de parser directement la chaîne "YYYY-MM-DD" — évite toute ambiguïté de fuseau horaire. */
function formatAirDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Bandes-annonces/teasers YouTube, triés officielle > bande-annonce > teaser — un titre peut en avoir plusieurs (une par saison, par exemple). */
function findTrailers(videos: TmdbVideo[] | undefined): TmdbVideo[] {
  const youtubeVideos = (videos ?? []).filter(
    (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'),
  );
  const rank = (v: TmdbVideo) => (v.type === 'Trailer' && v.official ? 0 : v.type === 'Trailer' ? 1 : 2);
  return [...youtubeVideos].sort((a, b) => rank(a) - rank(b));
}

function isGenericSeasonName(name: string, seasonNumber: number) {
  const normalized = name.trim().toLowerCase();
  return normalized === `season ${seasonNumber}` || normalized === `saison ${seasonNumber}`;
}

/**
 * Reprend tel quel le nom de saison donné par TMDB (ex. "Specials"/"Épisodes spéciaux" pour la saison 0,
 * "Final Season" si l'API le précise) plutôt que d'imposer un libellé maison. Quand ce nom est spécifique
 * (pas juste "Season N"), on l'affiche accolé au numéro de saison pour garder les deux informations.
 */
function seasonLabel(season: SeasonWithEpisodes) {
  const name = season.name?.trim();
  if (season.seasonNumber === 0) return name || 'Spécial';
  if (name && !isGenericSeasonName(name, season.seasonNumber)) return `${name} · Saison ${season.seasonNumber}`;
  return `Saison ${season.seasonNumber}`;
}

/**
 * Icône qui pulse doucement en boucle (échelle + opacité) — indicateur de gel de l'écran, plus dans
 * l'esprit de l'app qu'une roue de chargement générique. `stretchY` étire verticalement le dessin de
 * l'icône (ex. film-outline, naturellement large et court) pour rééquilibrer sa forme à l'œil — 1 = pas
 * d'étirement.
 */
function PulsingIcon({
  name,
  size,
  stretchY = 1,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  size: number;
  stretchY?: number;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });

  return (
    <Animated.View style={{ opacity, transform: [{ scale }, { scaleY: stretchY }] }}>
      <Ionicons name={name} size={size} color="#fff" />
    </Animated.View>
  );
}

/** Habillage commun du gel de la Fiche (chargement/enregistrement en cours ou erreur) — flou + voile sombre, contenu (icône/texte/bouton) fourni par l'appelant. */
function FreezeOverlay({ children }: { children: ReactNode }) {
  return (
    <View style={styles.freezeOverlay} pointerEvents="auto">
      <BlurView intensity={40} tint="dark" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFillObject} />
      <View style={styles.freezeDarken} />
      <View style={styles.freezeContent}>{children}</View>
    </View>
  );
}

export default function TitleDetailScreen() {
  const { id, resolveFailureId, episode: episodeParam, role: roleParam } = useLocalSearchParams<{
    id: string;
    resolveFailureId?: string;
    episode?: string;
    role?: string;
  }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeSeason, setActiveSeason] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [castOpen, setCastOpen] = useState(false);
  const [episodeTarget, setEpisodeTarget] = useState<{ seasonNumber: number; episodeNumber: number; roleNote?: string } | null>(null);
  const episodeParamHandled = useRef(false);

  const dashIndex = id.indexOf('-');
  const mediaType = id.slice(0, dashIndex) as MediaType;
  const tmdbId = Number(id.slice(dashIndex + 1));

  const detailsQuery = useQuery<TmdbMovieDetails | TmdbTvDetails>({
    queryKey: ['tmdb-detail', mediaType, tmdbId],
    queryFn: (): Promise<TmdbMovieDetails | TmdbTvDetails> =>
      mediaType === 'movie' ? getMovieDetails(tmdbId) : getTvDetails(tmdbId),
  });

  // Réutilise les détails déjà récupérés par detailsQuery ci-dessus au lieu de les refaire chercher —
  // upsertTitleFromTmdb ne les récupère elle-même que si on ne les lui passe pas (cas de l'import, qui
  // ne les a pas encore). D'où l'attente de detailsQuery avant de lancer celle-ci.
  const titleIdQuery = useQuery({
    queryKey: ['local-title-id', mediaType, tmdbId],
    queryFn: () => upsertTitleFromTmdb(tmdbId, mediaType, detailsQuery.data),
    enabled: detailsQuery.data != null,
  });

  const titleId = titleIdQuery.data;

  const localStateQuery = useQuery({
    queryKey: ['title-local-state', titleId],
    queryFn: () => loadTitleLocalState(titleId!),
    enabled: titleId != null,
  });

  const lastEpisodeWatchedAt = useMemo(
    () => (localStateQuery.data ? computeLastEpisodeWatchedAt(localStateQuery.data.seasons) : undefined),
    [localStateQuery.data],
  );

  useEffect(() => {
    if (episodeParamHandled.current || !episodeParam || !localStateQuery.data) return;
    episodeParamHandled.current = true;
    const [seasonNumber, episodeNumber] = episodeParam.split('-').map(Number);
    if (Number.isNaN(seasonNumber) || Number.isNaN(episodeNumber)) return;
    const seasonIndex = localStateQuery.data.seasons.findIndex((season) => season.seasonNumber === seasonNumber);
    if (seasonIndex >= 0) setActiveSeason(seasonIndex);
    setEpisodeTarget({ seasonNumber, episodeNumber, roleNote: roleParam });
  }, [episodeParam, roleParam, localStateQuery.data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['title-local-state', titleId] });

  /**
   * Toute action qui écrit en base (cocher un épisode, bouton de statut...) passe par ici : gèle l'écran
   * (voir l'overlay plus bas) le temps de l'enregistrement, pour éviter que deux actions déclenchées
   * quasi en même temps ne se marchent dessus (l'une écrase silencieusement le résultat de l'autre).
   * Un appui pendant qu'une action est déjà en cours est ignoré plutôt qu'empilé.
   */
  const runMutation = (action: () => Promise<unknown>) => {
    if (mutating) return;
    setMutating(true);
    action()
      .then(refresh)
      .finally(() => setMutating(false));
  };

  // Tant que les données locales (statut, épisodes vus) ne sont pas encore arrivées, l'écran affiché
  // serait trompeur (ex. "Ajouter à la bibliothèque" alors que le titre y est peut-être déjà) — geler
  // plutôt que de laisser interagir avec un état encore incomplet.
  const initialLoading = titleId == null || localStateQuery.isLoading;
  // Sans ce garde-fou, un échec de titleIdQuery/localStateQuery (réseau, TMDB...) laissait le gel
  // affiché pour toujours : isLoading redevient false sur une erreur, mais titleId ne se résout jamais,
  // donc initialLoading restait bloqué à true sans le moindre message d'erreur visible à l'écran.
  const syncError = titleIdQuery.error ?? localStateQuery.error;
  const frozen = (initialLoading || mutating) && !syncError;

  const handleConfirmMatch = async (name: string) => {
    setConfirming(true);
    try {
      await resolveImportFailure(Number(resolveFailureId), tmdbId);
      queryClient.invalidateQueries({ queryKey: ['import-failures'] });
      queryClient.invalidateQueries({ queryKey: ['library-items'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      Alert.alert('Importé', `${name} a été ajouté avec son historique.`, [
        { text: 'OK', onPress: () => router.replace('/(tabs)/library') },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : "Échec de l'import.");
      setConfirming(false);
    }
  };

  if (detailsQuery.isLoading || !detailsQuery.data) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.floatingIconButton, styles.backButton, { top: insets.top + Spacing.two }]}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        </View>
      </>
    );
  }

  const details = detailsQuery.data;
  const name = 'title' in details ? details.title : details.name;
  const releaseDate = 'release_date' in details ? details.release_date : details.first_air_date;
  const runtime = 'runtime' in details ? details.runtime : undefined;
  const seasonCount = 'seasons' in details ? details.seasons.filter((s) => s.season_number > 0).length : undefined;
  const backdrop = tmdbImageUrl(details.backdrop_path, 'original');
  const poster = tmdbImageUrl(details.poster_path, 'w342');
  const allCast = details.credits?.cast ?? [];
  const cast = allCast.slice(0, 12);
  const originalLanguage = originalLanguageName(details.original_language);
  const castHeading = castTitle('Casting', allCast, originalLanguage);
  const tvStatus = 'first_air_date' in details ? details.status : undefined;
  const preRelease = isPreRelease(details.status);
  const networkNames = 'networks' in details ? (details.networks ?? []).map((network) => network.name) : [];
  const creatorNames = 'created_by' in details ? (details.created_by ?? []).map((creator) => creator.name) : [];
  const companyNames = (details.production_companies ?? []).map((company) => company.name);
  const trailers = findTrailers(details.videos?.results);
  const imdbId = 'imdb_id' in details ? details.imdb_id : 'external_ids' in details ? details.external_ids?.imdb_id : undefined;
  const local = localStateQuery.data;
  const targetEpisode = episodeTarget
    ? local?.seasons
        .find((season) => season.seasonNumber === episodeTarget.seasonNumber)
        ?.episodes.find((episode) => episode.episodeNumber === episodeTarget.episodeNumber)
    : undefined;
  const neighborEpisodes = (() => {
    if (!episodeTarget || !local) return { previous: null, next: null };
    const group = local.seasons.filter((season) =>
      episodeTarget.seasonNumber === 0 ? season.seasonNumber === 0 : season.seasonNumber > 0,
    );
    const flat = group.flatMap((season) =>
      season.episodes.map((episode) => ({
        seasonNumber: season.seasonNumber,
        episodeNumber: episode.episodeNumber,
        name: episode.name,
      })),
    );
    const index = flat.findIndex(
      (entry) => entry.seasonNumber === episodeTarget.seasonNumber && entry.episodeNumber === episodeTarget.episodeNumber,
    );
    return {
      previous: index > 0 ? (flat[index - 1] as EpisodeNeighbor) : null,
      next: index >= 0 && index < flat.length - 1 ? (flat[index + 1] as EpisodeNeighbor) : null,
    };
  })();
  const episodeSheetData: EpisodeSheetData | null =
    episodeTarget && targetEpisode
      ? {
          seasonNumber: episodeTarget.seasonNumber,
          episodeNumber: episodeTarget.episodeNumber,
          name: targetEpisode.name,
          overview: targetEpisode.overview,
          airDate: targetEpisode.airDate,
          runtime: targetEpisode.runtime,
          stillPath: targetEpisode.stillPath,
          episodeId: targetEpisode.id,
          watched: targetEpisode.watchedAt != null,
          watchedAt: targetEpisode.watchedAt,
          rewatchCount: targetEpisode.rewatchCount,
          seasonEpisodeCount:
            local?.seasons.find((season) => season.seasonNumber === episodeTarget.seasonNumber)?.episodes.length ?? 0,
          roleNote: episodeTarget.roleNote,
        }
      : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <Pressable
          disabled={mutating}
          onPress={() => router.back()}
          style={[styles.floatingIconButton, styles.backButton, { top: insets.top + Spacing.two, opacity: mutating ? 0.4 : 1 }]}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        {!resolveFailureId && titleId != null && local?.status != null && (
          <Pressable
            disabled={mutating}
            onPress={() => runMutation(() => setFavorite(titleId, !local.isFavorite))}
            style={[styles.floatingIconButton, styles.favoriteButton, { top: insets.top + Spacing.two, opacity: mutating ? 0.4 : 1 }]}
            hitSlop={12}
          >
            <Ionicons name={local.isFavorite ? 'star' : 'star-outline'} size={20} color="#fff" />
          </Pressable>
        )}
        {frozen && (
          <FreezeOverlay>
            <PulsingIcon name="film-outline" size={40} stretchY={1.3} />
            <ThemedText style={styles.freezeLabel}>{mutating ? 'Mise à jour…' : 'Un instant…'}</ThemedText>
          </FreezeOverlay>
        )}
        {!frozen && syncError && (
          <FreezeOverlay>
            <Ionicons name="alert-circle-outline" size={40} color="#fff" />
            <ThemedText style={styles.freezeLabel}>Une erreur est survenue</ThemedText>
            <ThemedText type="small" style={styles.freezeLabel}>
              {syncError instanceof Error ? syncError.message : 'Erreur inconnue.'}
            </ThemedText>
            <Pressable
              style={[styles.primaryButton, { marginHorizontal: Spacing.four, backgroundColor: theme.text }]}
              onPress={() => {
                titleIdQuery.refetch();
                localStateQuery.refetch();
              }}>
              <ThemedText style={{ color: theme.background }}>Réessayer</ThemedText>
            </Pressable>
          </FreezeOverlay>
        )}
        <ScrollView
          scrollEnabled={!frozen}
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top }]}
        >
          {backdrop ? (
            <Image source={{ uri: backdrop }} style={styles.backdrop} contentFit="cover" />
          ) : (
            <View style={styles.backdropPlaceholder} />
          )}

        <View style={[styles.headerRow, !backdrop && styles.headerRowNoBackdrop]}>
          {poster ? (
            <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
          ) : (
            <View style={[styles.poster, { backgroundColor: theme.backgroundSelected }]} />
          )}
          <View style={[styles.headerText, !backdrop && styles.headerTextNoBackdrop]}>
            <ThemedText type="subtitle">{name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {[
                releaseDate ? releaseDate.slice(0, 4) : 'Date inconnue',
                runtime ? formatRuntime(runtime) : null,
                seasonCount ? `${seasonCount} saison${seasonCount > 1 ? 's' : ''}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {details.genres.map((g) => g.name).join(', ')}
            </ThemedText>
            <TitleLanguagesLine
              mediaType={mediaType}
              tmdbId={tmdbId}
              open={languagesOpen}
              onToggle={() => setLanguagesOpen((value) => !value)}
            />
          </View>
        </View>

        <TitleLanguagesDetails mediaType={mediaType} tmdbId={tmdbId} open={languagesOpen} />

        {trailers.length > 0 && (
          <Pressable
            style={[styles.trailerButton, { backgroundColor: theme.backgroundElement }]}
            onPress={() => {
              if (trailers.length === 1) {
                Linking.openURL(`https://www.youtube.com/watch?v=${trailers[0].key}`);
                return;
              }
              Alert.alert('Bandes-annonces disponibles', undefined, [
                ...trailers.map((v) => ({
                  text: v.name,
                  onPress: () => Linking.openURL(`https://www.youtube.com/watch?v=${v.key}`),
                })),
                { text: 'Annuler', style: 'cancel' as const },
              ]);
            }}>
            <Ionicons name="play-circle" size={20} color={theme.text} />
            <ThemedText type="small">{trailers.length > 1 ? 'Bandes-annonces' : 'Bande-annonce'}</ThemedText>
          </Pressable>
        )}

        {resolveFailureId && (
          <View style={styles.resolveBlock}>
            <ThemedText type="small" themeColor="textSecondary">
              Résolution d'un échec d'import — vérifie que c'est bien le bon titre avant de confirmer.
            </ThemedText>
            <Pressable
              disabled={confirming}
              style={[styles.primaryButton, { backgroundColor: '#22C55E', opacity: confirming ? 0.6 : 1 }]}
              onPress={() => handleConfirmMatch(name)}>
              {confirming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={{ color: '#fff' }}>Confirmer cette correspondance</ThemedText>
              )}
            </Pressable>
          </View>
        )}

        {!resolveFailureId && titleId != null && (
          <LibraryActions
            titleId={titleId}
            mediaType={mediaType}
            status={local?.status ?? null}
            manuallyPaused={local?.manuallyPaused ?? false}
            lastEpisodeWatchedAt={lastEpisodeWatchedAt}
            movieWatchedAt={local?.movieWatchedAt ?? null}
            movieRewatchCount={local?.movieRewatchCount ?? 0}
            tvStatus={tvStatus}
            disabled={frozen}
            runMutation={runMutation}
          />
        )}

        {preRelease && (
          <TitleReleaseBanner
            status={details.status}
            releaseDate={releaseDate}
            networks={networkNames}
            creators={creatorNames}
            companies={companyNames}
          />
        )}

        {details.overview ? <Synopsis text={details.overview} /> : null}

        <TitleRatings imdbId={imdbId} />

        <TitleStreaming mediaType={mediaType} tmdbId={tmdbId} />

        {cast.length > 0 && (
          <View style={styles.section}>
            <View style={styles.castHeader}>
              <ThemedText type="smallBold" style={styles.castHeading}>
                {castHeading}
              </ThemedText>
              {allCast.length > cast.length && (
                <Pressable onPress={() => setCastOpen(true)} hitSlop={8} style={styles.castSeeAll}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Tout voir ({allCast.length})
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.bleed}
              contentContainerStyle={styles.castRow}>
              {cast.map((member) => {
                const profile = tmdbImageUrl(member.profile_path, 'w185');
                return (
                  <Pressable key={member.id} style={styles.castItem} onPress={() => router.push(`/person/${member.id}`)}>
                    {profile ? (
                      <Image source={{ uri: profile }} style={styles.castPhoto} contentFit="cover" />
                    ) : (
                      <View style={[styles.castPhoto, { backgroundColor: theme.backgroundSelected }]} />
                    )}
                    <ThemedText type="small" numberOfLines={1} style={styles.castName}>
                      {member.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.castName}>
                      {member.character}
                    </ThemedText>
                  </Pressable>
                );
              })}
              {allCast.length > cast.length && (
                <Pressable style={styles.castItem} onPress={() => setCastOpen(true)}>
                  <View style={[styles.castPhoto, styles.castMore, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="smallBold">+{allCast.length - cast.length}</ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.castName}>
                    Tout voir
                  </ThemedText>
                </Pressable>
              )}
            </ScrollView>
          </View>
        )}

        {mediaType === 'tv' && local && local.seasons.length > 0 && !(preRelease && local.seasons.every((season) => season.episodes.every((episode) => !episode.airDate))) && (
          <View style={styles.section}>
            <ThemedText type="smallBold">Épisodes</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.bleed}
              contentContainerStyle={styles.seasonRow}>
              {local.seasons.map((season, index) => {
                const seasonFullyWatched = season.episodes.length > 0 && season.episodes.every((ep) => ep.watchedAt != null);
                const seasonRewatchCount = seasonFullyWatched
                  ? Math.min(...season.episodes.map((ep) => ep.rewatchCount))
                  : 0;
                const isActive = index === activeSeason;
                const backgroundColor = isActive ? theme.text : seasonFullyWatched ? statusColors.completed : theme.backgroundElement;
                const textColor = isActive ? theme.background : seasonFullyWatched ? '#fff' : theme.text;
                return (
                  <Pressable
                    key={season.id}
                    disabled={frozen}
                    onPress={() => setActiveSeason(index)}
                    onLongPress={() => {
                      const episodeIds = season.episodes.map((ep) => ep.id);
                      if (seasonFullyWatched) {
                        Alert.alert(
                          'Marquer la saison comme revue ?',
                          `Marquer tous les épisodes de ${seasonLabel(season)} comme revus ?`,
                          [
                            { text: 'Annuler', style: 'cancel' },
                            {
                              text: 'Marquer revue',
                              onPress: () => runMutation(() => markSeasonWatched(titleId!, episodeIds)),
                            },
                          ],
                        );
                        return;
                      }
                      Alert.alert(
                        'Marquer la saison comme vue ?',
                        `Marquer tous les épisodes de ${seasonLabel(season)} comme vus ?`,
                        [
                          { text: 'Annuler', style: 'cancel' },
                          {
                            text: 'Marquer vue',
                            onPress: () => runMutation(() => markSeasonWatched(titleId!, episodeIds)),
                          },
                        ],
                      );
                    }}
                    style={[styles.seasonChip, { backgroundColor }]}>
                    <ThemedText type="small" style={{ color: textColor }}>
                      {seasonFullyWatched ? (seasonRewatchCount > 0 ? `✓×${seasonRewatchCount + 1} ` : '✓ ') : ''}
                      {seasonLabel(season)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {local.seasons[activeSeason]?.episodes.map((episode) => {
              const still = tmdbImageUrl(episode.stillPath, 'w185');
              const watched = episode.watchedAt != null;
              return (
                <Pressable
                  key={episode.id}
                  disabled={frozen}
                  style={[styles.episodeRow, { backgroundColor: theme.backgroundElement, opacity: watched ? 0.55 : 1 }]}
                  onPress={() => {
                    if (!watched) {
                      runMutation(() => markEpisodeWatched(titleId!, episode.id));
                      return;
                    }
                    Alert.alert('Vous ne l\'avez finalement pas regardé ?', undefined, [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'Oups, pas vu !',
                        style: 'destructive',
                        onPress: () => runMutation(() => unmarkEpisodeWatched(titleId!, episode.id)),
                      },
                    ]);
                  }}
                  onLongPress={() => {
                    if (!watched) {
                      const activeSeasonNumber = local.seasons[activeSeason].seasonNumber;
                      if (activeSeasonNumber === 0) return;
                      const previousUnwatched = local.seasons
                        .filter((season) => season.seasonNumber > 0 && season.seasonNumber <= activeSeasonNumber)
                        .flatMap((season) =>
                          season.episodes.filter(
                            (candidate) =>
                              (season.seasonNumber < activeSeasonNumber || candidate.episodeNumber < episode.episodeNumber) &&
                              candidate.watchedAt == null,
                          ),
                        ).length;
                      if (previousUnwatched === 0) {
                        Alert.alert('Tous les épisodes précédents sont déjà vus.', undefined, [
                          { text: 'Annuler', style: 'cancel' },
                          { text: 'Marquer celui-ci', onPress: () => runMutation(() => markEpisodeWatched(titleId!, episode.id)) },
                        ]);
                        return;
                      }
                      Alert.alert(
                        "Avez-vous regardé les épisodes d'avant ?",
                        `${previousUnwatched} épisode${previousUnwatched > 1 ? 's' : ''} précédent${previousUnwatched > 1 ? 's' : ''} ${previousUnwatched > 1 ? 'ne sont' : "n'est"} pas marqué${previousUnwatched > 1 ? 's' : ''} comme vu${previousUnwatched > 1 ? 's' : ''}.`,
                        [
                          { text: 'Annuler', style: 'cancel' },
                          { text: 'Seulement celui-ci', onPress: () => runMutation(() => markEpisodeWatched(titleId!, episode.id)) },
                          { text: 'Tous jusqu\'ici', onPress: () => runMutation(() => markEpisodesUpTo(titleId!, episode.id)) },
                        ],
                      );
                      return;
                    }
                    Alert.alert('Marquer comme revu ?', undefined, [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Revu', onPress: () => runMutation(() => markEpisodeWatched(titleId!, episode.id)) },
                    ]);
                  }}>
                  <View style={styles.episodeStillWrap}>
                    {still ? (
                      <Image
                        source={{ uri: still }}
                        style={styles.episodeStill}
                        contentFit="cover"
                        blurRadius={watched ? 0 : 25}
                      />
                    ) : (
                      <View style={[styles.episodeStill, { backgroundColor: theme.backgroundSelected }]} />
                    )}
                    {!watched && still && (
                      <View style={styles.spoilerOverlay} pointerEvents="none">
                        <Ionicons name="eye-off-outline" size={22} color="#fff" />
                      </View>
                    )}
                    {watched && (
                      <View
                        style={[
                          styles.watchedBadge,
                          { backgroundColor: statusColors.completed, borderColor: theme.backgroundElement },
                        ]}>
                        {episode.rewatchCount > 0 ? (
                          <ThemedText type="small" style={styles.watchedBadgeCount}>
                            {episode.rewatchCount + 1}
                          </ThemedText>
                        ) : (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </View>
                    )}
                  </View>
                  <View style={styles.rowText}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.episodeNumber}>
                      Épisode {episode.episodeNumber}
                    </ThemedText>
                    <ThemedText>{episode.name}</ThemedText>
                    {episode.airDate && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatAirDate(episode.airDate)}
                      </ThemedText>
                    )}
                  </View>
                  <Pressable
                    disabled={frozen}
                    onPress={() =>
                      setEpisodeTarget({
                        seasonNumber: local.seasons[activeSeason].seasonNumber,
                        episodeNumber: episode.episodeNumber,
                      })
                    }
                    style={[styles.episodeDetailButton, { backgroundColor: theme.backgroundSelected }]}>
                    <Ionicons name="chevron-forward" size={20} color={theme.text} />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}

        <TitleSimilar mediaType={mediaType} tmdbId={tmdbId} />
        </ScrollView>
        <CastSheet
          visible={castOpen}
          members={allCast}
          title={castHeading}
          onClose={() => setCastOpen(false)}
          onOpenPerson={(personId) => {
            setCastOpen(false);
            router.push(`/person/${personId}`);
          }}
        />
        <EpisodeSheet
          tvId={tmdbId}
          seriesImdbId={imdbId}
          originalLanguage={originalLanguage}
          episode={episodeSheetData}
          onClose={() => setEpisodeTarget(null)}
          busy={mutating}
          previous={neighborEpisodes.previous}
          next={neighborEpisodes.next}
          onNavigate={(seasonNumber, episodeNumber) => {
            const seasonIndex = local?.seasons.findIndex((season) => season.seasonNumber === seasonNumber) ?? -1;
            if (seasonIndex >= 0) setActiveSeason(seasonIndex);
            setEpisodeTarget({ seasonNumber, episodeNumber });
          }}
          onMarkWatched={(episodeId) => runMutation(() => markEpisodeWatched(titleId!, episodeId))}
          onUnmarkWatched={(episodeId) => runMutation(() => unmarkEpisodeWatched(titleId!, episodeId))}
          onOpenPerson={(personId) => {
            setEpisodeTarget(null);
            router.push(`/person/${personId}`);
          }}
        />
      </View>
    </>
  );
}

function confirmAction(title: string, confirmLabel: string, onConfirm: () => void, destructive = false, message?: string) {
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/**
 * Bouton central unique : son libellé/couleur reflètent toujours le statut réellement dérivé des
 * données (jamais choisi à la main) — remplace l'ancienne rangée de chips par une action contextuelle
 * selon l'état, cf. table de transitions du TODO ("Fiche détail : refonte du bouton de statut").
 */
function StatusButton({
  titleId,
  mediaType,
  status,
  tvStatus,
  manuallyPaused,
  lastEpisodeWatchedAt,
  movieWatchedAt,
  movieRewatchCount,
  disabled,
  runMutation,
}: {
  titleId: number;
  mediaType: MediaType;
  status: LibraryStatus;
  tvStatus?: string;
  manuallyPaused: boolean;
  lastEpisodeWatchedAt: number | undefined;
  movieWatchedAt: number | null;
  movieRewatchCount: number;
  disabled: boolean;
  runMutation: (action: () => Promise<unknown>) => void;
}) {
  if (mediaType === 'movie') {
    if (status === 'dropped') {
      return (
        <Pressable
          disabled={disabled}
          style={[styles.primaryButton, { backgroundColor: statusColors.dropped }]}
          onPress={() => confirmAction('Reprendre ce film ?', 'Reprendre', () => runMutation(() => setStatus(titleId, 'to_watch')))}>
          <ThemedText style={{ color: '#fff' }}>{statusLabels.dropped}</ThemedText>
        </Pressable>
      );
    }

    if (movieWatchedAt != null) {
      const watchCount = movieRewatchCount + 1;
      return (
        <Pressable
          disabled={disabled}
          style={[styles.primaryButton, { backgroundColor: statusColors.completed }]}
          onLongPress={() =>
            confirmAction('Marquer comme revu ?', 'Revu', () => runMutation(() => markMovieWatched(titleId)))
          }>
          <ThemedText style={{ color: '#fff' }}>{watchCount > 1 ? `✓ Vu ×${watchCount}` : '✓ Vu'}</ThemedText>
        </Pressable>
      );
    }

    return (
      <Pressable
        disabled={disabled}
        style={[styles.primaryButton, { backgroundColor: statusColors.to_watch }]}
        onPress={() => runMutation(() => removeFromLibrary(titleId))}
        onLongPress={() => confirmAction('Marquer comme vu ?', 'Vu', () => runMutation(() => markMovieWatched(titleId)))}>
        <ThemedText style={{ color: '#fff' }}>{statusLabels.to_watch}</ThemedText>
      </Pressable>
    );
  }

  // Séries/animés
  if (status === 'dropped') {
    return (
      <Pressable
        disabled={disabled}
        style={[styles.primaryButton, { backgroundColor: statusColors.dropped }]}
        onPress={() => confirmAction('Reprendre ce titre ?', 'Reprendre', () => runMutation(() => resumeFromDropped(titleId)))}>
        <ThemedText style={{ color: '#fff' }}>{statusLabels.dropped}</ThemedText>
      </Pressable>
    );
  }

  if (status === 'completed') {
    const upToDate = isUpToDate(status, mediaType, tvStatus);
    return (
      <View style={[styles.primaryButton, { backgroundColor: upToDate ? upToDateColor : statusColors.completed }]}>
        <ThemedText style={{ color: '#fff' }}>{displayStatusLabel(status, mediaType, tvStatus)}</ThemedText>
      </View>
    );
  }

  if (status === 'to_watch') {
    return (
      <Pressable
        disabled={disabled}
        style={[styles.primaryButton, { backgroundColor: statusColors.to_watch }]}
        onPress={() => runMutation(() => removeFromLibrary(titleId))}>
        <ThemedText style={{ color: '#fff' }}>{statusLabels.to_watch}</ThemedText>
      </Pressable>
    );
  }

  // status === 'watching'
  const paused = isEffectivelyPaused(status, manuallyPaused, lastEpisodeWatchedAt);
  const abandon = () => confirmAction('Abandonner ce titre ?', 'Abandonner', () => runMutation(() => dropTitle(titleId)), true);

  if (paused) {
    return (
      <Pressable
        disabled={disabled}
        style={[styles.primaryButton, { backgroundColor: pausedColor }]}
        onPress={() =>
          confirmAction(
            'Reprendre ce titre ?',
            'Reprendre',
            () => runMutation(() => resumeManualPause(titleId)),
            false,
            pauseReasonMessage(manuallyPaused),
          )
        }
        onLongPress={abandon}>
        <ThemedText style={{ color: '#fff' }}>{pausedLabel}</ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={disabled}
      style={[styles.primaryButton, { backgroundColor: statusColors.watching }]}
      onPress={() => confirmAction('Mettre en pause ?', 'Mettre en pause', () => runMutation(() => pauseManually(titleId)))}
      onLongPress={abandon}>
      <ThemedText style={{ color: '#fff' }}>{statusLabels.watching}</ThemedText>
    </Pressable>
  );
}

function LibraryActions({
  titleId,
  mediaType,
  status,
  manuallyPaused,
  lastEpisodeWatchedAt,
  movieWatchedAt,
  movieRewatchCount,
  tvStatus,
  disabled,
  runMutation,
}: {
  titleId: number;
  mediaType: MediaType;
  status: LibraryStatus | null;
  manuallyPaused: boolean;
  lastEpisodeWatchedAt: number | undefined;
  movieWatchedAt: number | null;
  movieRewatchCount: number;
  tvStatus?: string;
  disabled: boolean;
  runMutation: (action: () => Promise<unknown>) => void;
}) {
  const theme = useTheme();

  if (status === null) {
    return (
      <Pressable
        disabled={disabled}
        style={[styles.primaryButton, { marginHorizontal: Spacing.three, backgroundColor: theme.text }]}
        onPress={() => runMutation(() => addToLibrary(titleId))}>
        <ThemedText style={{ color: theme.background }}>Ajouter à la bibliothèque</ThemedText>
      </Pressable>
    );
  }

  return (
    <View style={styles.actionsColumn}>
      <StatusButton
        titleId={titleId}
        mediaType={mediaType}
        status={status}
        tvStatus={tvStatus}
        manuallyPaused={manuallyPaused}
        lastEpisodeWatchedAt={lastEpisodeWatchedAt}
        movieWatchedAt={movieWatchedAt}
        movieRewatchCount={movieRewatchCount}
        disabled={disabled}
        runMutation={runMutation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1 },
  /** "Chip" flottant semi-opaque, pour rester lisible quel que soit le contenu de l'image derrière — pas une barre pleine largeur, juste autour de l'icône. */
  floatingIconButton: {
    position: 'absolute',
    zIndex: 10,
    padding: Spacing.two,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 17, 17, 0.45)',
  },
  backButton: { left: Spacing.three },
  favoriteButton: { right: Spacing.three },
  /** Recouvre tout le contenu de la Fiche (mais pas le bouton retour/favori, au-dessus via zIndex) pendant le chargement initial ou l'enregistrement d'une action. */
  freezeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  /** Assombrit le flou (indépendant du BlurView lui-même, sinon ça écrase le flou comme la première fois). */
  freezeDarken: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  freezeContent: { alignItems: 'center', gap: Spacing.three },
  freezeLabel: { color: '#fff', fontSize: 16, marginHorizontal: Spacing.three, textAlign: 'center' },
  scroll: { paddingBottom: Spacing.six, gap: Spacing.three },
  backdrop: { width: '100%', height: 200 },
  backdropPlaceholder: { width: '100%', height: 56 },
  headerRow: { flexDirection: 'row', gap: Spacing.three, paddingHorizontal: Spacing.three, marginTop: -HEADER_POSTER_OVERLAP },
  headerRowNoBackdrop: { marginTop: 0 },
  poster: { width: 100, height: 150, borderRadius: Spacing.two },
  headerText: { flex: 1, gap: Spacing.half, paddingTop: HEADER_POSTER_OVERLAP - Spacing.one },
  headerTextNoBackdrop: { paddingTop: 0 },
  trailerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    marginHorizontal: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  section: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  bleed: { marginHorizontal: -Spacing.three },
  castRow: { gap: Spacing.three, paddingVertical: Spacing.one, paddingHorizontal: Spacing.three },
  castItem: { width: 80, gap: Spacing.half },
  castHeading: { flex: 1 },
  castHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  castSeeAll: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half },
  castMore: { alignItems: 'center', justifyContent: 'center' },
  castPhoto: { width: 80, height: 80, borderRadius: 40 },
  castName: { textAlign: 'center' },
  seasonRow: { gap: Spacing.two, paddingVertical: Spacing.one, paddingHorizontal: Spacing.three },
  seasonChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.five },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    marginTop: Spacing.one,
    overflow: 'hidden',
  },
  episodeStillWrap: { position: 'relative' },
  episodeStill: { width: 100, aspectRatio: 16 / 9, borderRadius: Spacing.two },
  watchedBadge: {
    position: 'absolute',
    bottom: -7,
    right: -7,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchedBadgeCount: { color: '#fff', fontWeight: 'bold' },
  rowText: { flex: 1, gap: Spacing.one },
  episodeNumber: { textTransform: 'uppercase', letterSpacing: 0.5 },
  episodeDetailButton: {
    alignSelf: 'stretch',
    width: 48,
    marginVertical: -Spacing.two,
    marginRight: -Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spoilerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  primaryButton: {
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  resolveBlock: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  actionsColumn: { paddingHorizontal: Spacing.three, gap: Spacing.two },
});
