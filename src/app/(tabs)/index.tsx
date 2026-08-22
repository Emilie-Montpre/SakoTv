import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tmdbImageUrl } from '@/api/tmdb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { isPaused } from '@/constants/content';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getLastEpisodeWatchedAtByTitle, listLibraryItems, type LibraryListItem } from '@/repository/library';
import { getPseudo } from '@/repository/profile';

function TitleGrid({ items, theme }: { items: LibraryListItem[]; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const poster = tmdbImageUrl(item.posterPath, 'w342');
        return (
          <Pressable
            key={item.titleId}
            style={styles.gridItem}
            onPress={() => router.push(`/title/${item.mediaType}-${item.tmdbId}`)}>
            {poster ? (
              <Image source={{ uri: poster }} style={styles.gridPoster} contentFit="cover" />
            ) : (
              <View style={[styles.gridPoster, { backgroundColor: theme.backgroundSelected }]} />
            )}
            <ThemedText numberOfLines={2} style={styles.gridLabel}>
              {item.name}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const { data } = useQuery({ queryKey: ['library-items'], queryFn: listLibraryItems });
  const { data: lastWatchedAtByTitle } = useQuery({
    queryKey: ['last-episode-watched-at'],
    queryFn: getLastEpisodeWatchedAtByTitle,
  });
  const { data: pseudo } = useQuery({ queryKey: ['profile-pseudo'], queryFn: getPseudo });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['library-items'] });
      queryClient.invalidateQueries({ queryKey: ['last-episode-watched-at'] });
      queryClient.invalidateQueries({ queryKey: ['profile-pseudo'] });
    }, [queryClient]),
  );

  const watching = (data ?? []).filter((item) => item.status === 'watching');
  const active = watching.filter((item) => !isPaused(item.status, lastWatchedAtByTitle?.get(item.titleId)));
  const paused = watching.filter((item) => isPaused(item.status, lastWatchedAtByTitle?.get(item.titleId)));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="subtitle" style={styles.title}>
            {pseudo ? `Bonjour, ${pseudo}` : 'Accueil'}
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="smallBold">En cours</ThemedText>
            {active.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Rien en cours pour l'instant.
              </ThemedText>
            ) : (
              <TitleGrid items={active} theme={theme} />
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">En pause</ThemedText>
            {paused.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Rien en pause pour l'instant.
              </ThemedText>
            ) : (
              <TitleGrid items={paused} theme={theme} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  scroll: { gap: Spacing.four, paddingBottom: Spacing.six },
  title: { marginTop: Spacing.two },
  section: { gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  gridItem: { width: '47%', gap: Spacing.one },
  gridPoster: { width: '100%', aspectRatio: 2 / 3, borderRadius: Spacing.two },
  gridLabel: { fontSize: 16 },
});
