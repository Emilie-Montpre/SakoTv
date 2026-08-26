import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tmdbImageUrl } from '@/api/tmdb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { isPaused } from '@/constants/content';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getLastEpisodeWatchedAtByTitle, listLibraryItems, type LibraryListItem } from '@/repository/library';

function TitleGrid({ items, theme }: { items: LibraryListItem[]; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const poster = tmdbImageUrl(item.posterPath, 'w185');
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
            <ThemedText type="small" numberOfLines={2}>
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
  const [randomResult, setRandomResult] = useState<LibraryListItem | 'empty' | null>(null);

  const { data } = useQuery({ queryKey: ['library-items'], queryFn: listLibraryItems });
  const { data: lastWatchedAtByTitle } = useQuery({
    queryKey: ['last-episode-watched-at'],
    queryFn: getLastEpisodeWatchedAtByTitle,
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['library-items'] });
      queryClient.invalidateQueries({ queryKey: ['last-episode-watched-at'] });
    }, [queryClient]),
  );

  const isItemPaused = (item: LibraryListItem) =>
    item.manuallyPaused || isPaused(item.status, lastWatchedAtByTitle?.get(item.titleId));

  const watching = (data ?? []).filter((item) => item.status === 'watching');
  const active = watching.filter((item) => !isItemPaused(item));
  const paused = watching.filter((item) => isItemPaused(item));

  const pickRandom = () => {
    const pool = (data ?? []).filter((item) => {
      if (item.status === 'to_watch') return true;
      return item.status === 'watching' && isItemPaused(item);
    });
    if (pool.length === 0) {
      setRandomResult('empty');
      return;
    }
    setRandomResult(pool[Math.floor(Math.random() * pool.length)]);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="subtitle" style={styles.title}>
            Accueil
          </ThemedText>

          <View style={styles.section}>
            <Pressable style={[styles.randomButton, { backgroundColor: theme.backgroundElement }]} onPress={pickRandom}>
              <Ionicons name="shuffle-outline" size={16} color={theme.text} />
              <ThemedText type="small">Je ne sais pas quoi regarder</ThemedText>
            </Pressable>

            {randomResult === 'empty' && (
              <View style={[styles.randomResult, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.randomResultName}>
                  Breaking news : local user discovers revolutionary time management technique (it's called "having nothing to watch"). {`\n`}{`\n`}Recherche se demande pourquoi ses recommandations existent. Moment dépressif en cours...
                </ThemedText>
              </View>
            )}

            {randomResult && randomResult !== 'empty' && (
              <View style={[styles.randomResult, { backgroundColor: theme.backgroundElement }]}>
                <Pressable
                  style={styles.randomResultMain}
                  onPress={() => router.push(`/title/${randomResult.mediaType}-${randomResult.tmdbId}`)}>
                  {tmdbImageUrl(randomResult.posterPath, 'w185') ? (
                    <Image
                      source={{ uri: tmdbImageUrl(randomResult.posterPath, 'w185')! }}
                      style={styles.randomResultPoster}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.randomResultPoster, { backgroundColor: theme.backgroundSelected }]} />
                  )}
                  <ThemedText numberOfLines={2} style={styles.randomResultName}>
                    {randomResult.name}
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>

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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  gridItem: { width: '31%', gap: Spacing.half },
  gridPoster: { width: '100%', aspectRatio: 2 / 3, borderRadius: Spacing.one },
  randomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  randomResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  randomResultMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  randomResultPoster: { width: 50, height: 75, borderRadius: Spacing.one },
  randomResultName: { flex: 1 },
  smallButton: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
});
