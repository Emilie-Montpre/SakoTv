import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { departmentLabel } from '@/api/person-credits';
import { tmdbImageUrl } from '@/api/tmdb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { displayStatusLabel, pausedLabel } from '@/constants/content';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listFavoritePeople } from '@/repository/favorite-people';
import { listFavoriteTitles, listWatchedEpisodesByTitle, listWatchedMovies } from '@/repository/stats-lists';

type ListKind = 'watched-movies' | 'watched-episodes' | 'favorite-titles' | 'favorite-people';

interface ListRow {
  key: string;
  title: string;
  subtitle: string;
  imagePath: string | null;
  href: string;
  round: boolean;
}

interface ListConfig {
  title: string;
  empty: string;
  load: () => Promise<ListRow[]>;
}

function formatWatchedDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CONFIGS: Record<ListKind, ListConfig> = {
  'watched-movies': {
    title: 'Films vus',
    empty: "Aucun film vu pour l'instant.",
    load: async () => {
      const movies = await listWatchedMovies();
      return movies.map((movie) => ({
        key: `movie-${movie.titleId}`,
        title: movie.name,
        subtitle: `Vu le ${formatWatchedDate(movie.watchedAt)}`,
        imagePath: movie.posterPath,
        href: `/title/movie-${movie.tmdbId}`,
        round: false,
      }));
    },
  },
  'watched-episodes': {
    title: 'Épisodes vus',
    empty: "Aucun épisode vu pour l'instant.",
    load: async () => {
      const entries = await listWatchedEpisodesByTitle();
      return entries.map((entry) => ({
        key: `episodes-${entry.titleId}`,
        title: entry.name,
        subtitle: `${entry.episodesWatched} épisode${entry.episodesWatched > 1 ? 's' : ''} vu${entry.episodesWatched > 1 ? 's' : ''} · ${
          entry.isAnime ? 'Animé' : 'Série'
        }`,
        imagePath: entry.posterPath,
        href: `/title/tv-${entry.tmdbId}`,
        round: false,
      }));
    },
  },
  'favorite-titles': {
    title: 'Favoris',
    empty: "Aucun titre favori pour l'instant.",
    load: async () => {
      const titles = await listFavoriteTitles();
      return titles.map((title) => ({
        key: `title-${title.titleId}`,
        title: title.name,
        subtitle: title.manuallyPaused ? pausedLabel : displayStatusLabel(title.status, title.mediaType, title.statusTmdb),
        imagePath: title.posterPath,
        href: `/title/${title.mediaType}-${title.tmdbId}`,
        round: false,
      }));
    },
  },
  'favorite-people': {
    title: 'Personnes favorites',
    empty: "Aucune personne favorite pour l'instant.",
    load: async () => {
      const people = await listFavoritePeople();
      return people.map((person) => ({
        key: `person-${person.tmdbPersonId}`,
        title: person.name,
        subtitle: person.knownForDepartment ? departmentLabel(person.knownForDepartment) : '',
        imagePath: person.profilePath,
        href: `/person/${person.tmdbPersonId}`,
        round: true,
      }));
    },
  },
};

function isListKind(value: string | undefined): value is ListKind {
  return value != null && value in CONFIGS;
}

export default function ListScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const config = isListKind(kind) ? CONFIGS[kind] : null;

  const { data } = useQuery({
    queryKey: ['stats-list', kind],
    queryFn: () => config!.load(),
    enabled: config != null,
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['stats-list', kind] });
    }, [queryClient, kind]),
  );

  const rows = data ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </Pressable>
            <ThemedText type="subtitle">
              {config ? `${config.title}${data ? ` (${rows.length})` : ''}` : 'Liste'}
            </ThemedText>
          </View>

          {data && rows.length === 0 && config && (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              {config.empty}
            </ThemedText>
          )}

          <FlatList
            style={styles.list}
            data={rows}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const image = tmdbImageUrl(item.imagePath, 'w185');
              const imageStyle = item.round ? styles.photo : styles.poster;
              return (
                <Pressable
                  style={[styles.row, { backgroundColor: theme.backgroundElement }]}
                  onPress={() => router.push(item.href as never)}>
                  {image ? (
                    <Image source={{ uri: image }} style={imageStyle} contentFit="cover" />
                  ) : (
                    <View style={[imageStyle, { backgroundColor: theme.backgroundSelected }]} />
                  )}
                  <View style={styles.rowText}>
                    <ThemedText numberOfLines={2}>{item.title}</ThemedText>
                    {item.subtitle ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.subtitle}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  empty: { textAlign: 'center', marginTop: Spacing.four },
  list: { flex: 1 },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', gap: Spacing.three, borderRadius: Spacing.two, padding: Spacing.two, alignItems: 'center' },
  poster: { width: 48, height: 72, borderRadius: Spacing.one },
  photo: { width: 56, height: 56, borderRadius: 28 },
  rowText: { flex: 1, gap: Spacing.half },
});
