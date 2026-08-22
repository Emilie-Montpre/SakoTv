import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tmdbImageUrl } from '@/api/tmdb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listHistory } from '@/repository/history';

function formatWatchedAt(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const { data } = useQuery({ queryKey: ['history'], queryFn: listHistory });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    }, [queryClient]),
  );

  const entries = data ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          Historique
        </ThemedText>

        {entries.length === 0 && (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Rien de regardé pour l'instant.
          </ThemedText>
        )}

        <FlatList
          style={styles.list}
          data={entries}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const poster = tmdbImageUrl(item.posterPath, 'w185');
            return (
              <Pressable
                style={[styles.row, { backgroundColor: theme.backgroundElement }]}
                onPress={() => router.push(`/title/${item.mediaType}-${item.tmdbId}`)}>
                {poster ? (
                  <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
                ) : (
                  <View style={[styles.poster, { backgroundColor: theme.backgroundSelected }]} />
                )}
                <View style={styles.rowText}>
                  <ThemedText numberOfLines={1}>{item.name}</ThemedText>
                  {item.episodeLabel && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.episodeLabel}
                    </ThemedText>
                  )}
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatWatchedAt(item.watchedAt)}
                  </ThemedText>
                </View>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.three },
  title: { marginTop: Spacing.two },
  empty: { textAlign: 'center', marginTop: Spacing.four },
  list: { flex: 1 },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', gap: Spacing.three, borderRadius: Spacing.two, padding: Spacing.two, alignItems: 'center' },
  poster: { width: 48, height: 72, borderRadius: Spacing.one },
  rowText: { flex: 1, gap: Spacing.half },
});
