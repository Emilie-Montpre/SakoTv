import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMovieDetails, getTvDetails, tmdbImageUrl } from '@/api/tmdb';
import type { TmdbMovieDetails, TmdbTvDetails } from '@/api/tmdb-types';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { displayStatusLabel, statusColors, statusLabels } from '@/constants/content';
import { Spacing } from '@/constants/theme';
import type { LibraryStatus, MediaType } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { resolveImportFailure } from '@/repository/import-failures';
import {
  addToLibrary,
  markEpisodeWatched,
  markMovieWatched,
  removeFromLibrary,
  setFavorite,
  setStatus,
  unmarkEpisodeWatched,
  unmarkMovieWatched,
  upsertTitleFromTmdb,
} from '@/repository/library';
import { loadTitleLocalState, type SeasonWithEpisodes } from '@/repository/title-detail';

const SYNOPSIS_COLLAPSED_LINES = 4;
// Au-delà de ce nombre de caractères, un synopsis dépasse quasi systématiquement 4 lignes sur un écran de
// téléphone — évite de dépendre d'onTextLayout, dont le déclenchement s'est révélé pas fiable ici.
const SYNOPSIS_TRUNCATE_THRESHOLD = 220;

function Synopsis({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > SYNOPSIS_TRUNCATE_THRESHOLD;

  return (
    <View style={styles.overview}>
      <ThemedText numberOfLines={!expanded && isLong ? SYNOPSIS_COLLAPSED_LINES : undefined}>{text}</ThemedText>
      {isLong && (
        <Pressable onPress={() => setExpanded((v) => !v)}>
          <ThemedText type="small" themeColor="textSecondary">
            {expanded ? 'Voir moins' : 'Lire la suite'}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

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

export default function TitleDetailScreen() {
  const { id, resolveFailureId } = useLocalSearchParams<{ id: string; resolveFailureId?: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [activeSeason, setActiveSeason] = useState(0);
  const [confirming, setConfirming] = useState(false);

  const dashIndex = id.indexOf('-');
  const mediaType = id.slice(0, dashIndex) as MediaType;
  const tmdbId = Number(id.slice(dashIndex + 1));

  const detailsQuery = useQuery<TmdbMovieDetails | TmdbTvDetails>({
    queryKey: ['tmdb-detail', mediaType, tmdbId],
    queryFn: (): Promise<TmdbMovieDetails | TmdbTvDetails> =>
      mediaType === 'movie' ? getMovieDetails(tmdbId) : getTvDetails(tmdbId),
  });

  const titleIdQuery = useQuery({
    queryKey: ['local-title-id', mediaType, tmdbId],
    queryFn: () => upsertTitleFromTmdb(tmdbId, mediaType),
  });

  const titleId = titleIdQuery.data;

  const localStateQuery = useQuery({
    queryKey: ['title-local-state', titleId],
    queryFn: () => loadTitleLocalState(titleId!),
    enabled: titleId != null,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['title-local-state', titleId] });
  };

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
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        </SafeAreaView>
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
  const cast = details.credits?.cast?.slice(0, 12) ?? [];
  const tvStatus = 'first_air_date' in details ? details.status : undefined;
  const local = localStateQuery.data;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
          {backdrop && <Image source={{ uri: backdrop }} style={styles.backdrop} contentFit="cover" />}

        <View style={styles.headerRow}>
          {poster ? (
            <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
          ) : (
            <View style={[styles.poster, { backgroundColor: theme.backgroundSelected }]} />
          )}
          <View style={styles.headerText}>
            <ThemedText type="subtitle">{name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {releaseDate?.slice(0, 4) ?? '—'}
              {runtime ? ` · ${formatRuntime(runtime)}` : ''}
              {seasonCount ? ` · ${seasonCount} saison${seasonCount > 1 ? 's' : ''}` : ''}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {details.genres.map((g) => g.name).join(', ')}
            </ThemedText>
          </View>
        </View>

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
            isFavorite={local?.isFavorite ?? false}
            movieWatched={local?.movieWatchedAt != null}
            tvStatus={tvStatus}
            onChanged={refresh}
          />
        )}

        {details.overview ? <Synopsis text={details.overview} /> : null}

        {cast.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="smallBold">Casting</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castRow}>
              {cast.map((member) => {
                const profile = tmdbImageUrl(member.profile_path, 'w185');
                return (
                  <View key={member.id} style={styles.castItem}>
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
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {mediaType === 'tv' && local && local.seasons.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="smallBold">Épisodes</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonRow}>
              {local.seasons.map((season, index) => {
                const seasonFullyWatched = season.episodes.length > 0 && season.episodes.every((ep) => ep.watchedAt != null);
                const isActive = index === activeSeason;
                const backgroundColor = isActive ? theme.text : seasonFullyWatched ? statusColors.completed : theme.backgroundElement;
                const textColor = isActive ? theme.background : seasonFullyWatched ? '#fff' : theme.text;
                return (
                  <Pressable
                    key={season.id}
                    onPress={() => setActiveSeason(index)}
                    style={[styles.seasonChip, { backgroundColor }]}>
                    <ThemedText type="small" style={{ color: textColor }}>
                      {seasonFullyWatched ? '✓ ' : ''}
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
                  style={[styles.episodeRow, { backgroundColor: theme.backgroundElement, opacity: watched ? 0.55 : 1 }]}
                  onPress={() => {
                    const action = watched ? unmarkEpisodeWatched : markEpisodeWatched;
                    action(titleId!, episode.id).then(refresh);
                  }}>
                  <View style={styles.episodeStillWrap}>
                    {still ? (
                      <Image source={{ uri: still }} style={styles.episodeStill} contentFit="cover" />
                    ) : (
                      <View style={[styles.episodeStill, { backgroundColor: theme.backgroundSelected }]} />
                    )}
                    {watched && (
                      <View
                        style={[
                          styles.watchedBadge,
                          { backgroundColor: statusColors.completed, borderColor: theme.backgroundElement },
                        ]}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
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
                  <Pressable onPress={() => {}} hitSlop={8} style={styles.episodeDetailButton}>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function LibraryActions({
  titleId,
  mediaType,
  status,
  isFavorite,
  movieWatched,
  tvStatus,
  onChanged,
}: {
  titleId: number;
  mediaType: MediaType;
  status: LibraryStatus | null;
  isFavorite: boolean;
  movieWatched: boolean;
  tvStatus?: string;
  onChanged: () => void;
}) {
  const theme = useTheme();

  if (status === null) {
    return (
      <Pressable
        style={[styles.primaryButton, { backgroundColor: theme.text }]}
        onPress={() => addToLibrary(titleId).then(onChanged)}>
        <ThemedText style={{ color: theme.background }}>Ajouter à la bibliothèque</ThemedText>
      </Pressable>
    );
  }

  return (
    <View style={styles.actionsColumn}>
      <View style={styles.statusRow}>
        {(Object.keys(statusLabels) as LibraryStatus[])
          .filter((s) => mediaType !== 'movie' || s !== 'watching')
          .map((s) => (
          <Pressable
            key={s}
            onPress={() => setStatus(titleId, s).then(onChanged)}
            style={[
              styles.statusChip,
              { backgroundColor: s === status ? statusColors[s] : theme.backgroundElement },
            ]}>
            <ThemedText type="small" style={{ color: s === status ? '#fff' : theme.text }}>
              {displayStatusLabel(s, mediaType, tvStatus)}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      <View style={styles.statusRow}>
        <Pressable onPress={() => setFavorite(titleId, !isFavorite).then(onChanged)}>
          <ThemedText themeColor={isFavorite ? 'text' : 'textSecondary'}>
            {isFavorite ? '★ Favori' : '☆ Favori'}
          </ThemedText>
        </Pressable>
        {mediaType === 'movie' && (
          <Pressable
            onPress={() => (movieWatched ? unmarkMovieWatched(titleId) : markMovieWatched(titleId)).then(onChanged)}>
            <ThemedText themeColor={movieWatched ? 'text' : 'textSecondary'}>
              {movieWatched ? '✓ Vu' : 'Marquer comme vu'}
            </ThemedText>
          </Pressable>
        )}
        <Pressable onPress={() => removeFromLibrary(titleId).then(onChanged)}>
          <ThemedText themeColor="textSecondary">Retirer</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1 },
  backButton: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, alignSelf: 'flex-start' },
  scroll: { paddingBottom: Spacing.six, gap: Spacing.three },
  backdrop: { width: '100%', height: 200 },
  headerRow: { flexDirection: 'row', gap: Spacing.three, paddingHorizontal: Spacing.three, marginTop: -Spacing.five },
  poster: { width: 100, height: 150, borderRadius: Spacing.two },
  headerText: { flex: 1, justifyContent: 'flex-end', gap: Spacing.half },
  overview: { paddingHorizontal: Spacing.three, gap: Spacing.one },
  section: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  castRow: { gap: Spacing.three, paddingVertical: Spacing.one },
  castItem: { width: 80, gap: Spacing.half },
  castPhoto: { width: 80, height: 80, borderRadius: 40 },
  castName: { textAlign: 'center' },
  seasonRow: { gap: Spacing.two, paddingVertical: Spacing.one },
  seasonChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.five },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    marginTop: Spacing.one,
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
  rowText: { flex: 1, gap: Spacing.one },
  episodeNumber: { textTransform: 'uppercase', letterSpacing: 0.5 },
  episodeDetailButton: { padding: Spacing.one },
  primaryButton: {
    marginHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  resolveBlock: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  actionsColumn: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  statusRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  statusChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2, borderRadius: Spacing.five },
});
