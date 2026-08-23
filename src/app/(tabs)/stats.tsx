import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { recomputeAllShowStatuses } from '@/repository/library';
import { resetAllData } from '@/repository/reset';
import { computeStats } from '@/repository/stats';

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} j ${hours % 24} h`;
  if (hours > 0) return `${hours} h ${minutes % 60} min`;
  return `${minutes} min`;
}

export default function StatsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const { data } = useQuery({ queryKey: ['stats'], queryFn: computeStats });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    }, [queryClient]),
  );

  const stats = data;
  const [recomputing, setRecomputing] = useState(false);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const count = await recomputeAllShowStatuses();
      queryClient.invalidateQueries({ queryKey: ['library-items'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      Alert.alert('Statuts recalculés', `${count} série(s)/animé(s) vérifiés.`);
    } finally {
      setRecomputing(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Réinitialiser les données ?',
      'Supprime toute la bibliothèque, l\'historique et les échecs d\'import. Irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            queryClient.invalidateQueries();
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="subtitle" style={styles.title}>
            Stats
          </ThemedText>

          {stats && (
            <>
              <View style={styles.tileRow}>
                <Tile label="Films vus" value={stats.moviesWatched} theme={theme} />
                <Tile label="Épisodes vus" value={stats.episodesWatched} theme={theme} />
              </View>
              <View style={styles.tileRow}>
                <Tile label="Dans la bibliothèque" value={stats.showsInLibrary} theme={theme} />
                <Tile label="Favoris" value={stats.favoritesCount} theme={theme} />
              </View>
              <View style={[styles.tileWide, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Temps de visionnage total
                </ThemedText>
                <ThemedText type="subtitle">{formatDuration(stats.totalMinutesWatched)}</ThemedText>
              </View>

              <Pressable
                style={[styles.historyButton, { backgroundColor: theme.backgroundElement }]}
                onPress={() => router.push('/(tabs)/history')}>
                <View>
                  <ThemedText type="smallBold">Historique</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Tous les épisodes et films regardés
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </Pressable>

              {stats.topGenres.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="smallBold">Genres favoris</ThemedText>
                  {stats.topGenres.map((g) => (
                    <View key={g.genre} style={styles.genreRow}>
                      <ThemedText type="small">{g.genre}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {g.count}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}

              {stats.byYear.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="smallBold">Bilan par année</ThemedText>
                  {stats.byYear.map((y) => (
                    <View key={y.year} style={styles.genreRow}>
                      <ThemedText type="small">{y.year}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {y.movies} films · {y.episodes} épisodes
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          <Pressable
            disabled={recomputing}
            style={[styles.resetButton, { borderColor: theme.textSecondary, opacity: recomputing ? 0.6 : 1 }]}
            onPress={handleRecompute}>
            {recomputing ? (
              <ActivityIndicator />
            ) : (
              <ThemedText themeColor="textSecondary">Recalculer les statuts</ThemedText>
            )}
          </Pressable>

          <Pressable style={[styles.resetButton, { borderColor: '#E5484D' }]} onPress={handleReset}>
            <ThemedText style={{ color: '#E5484D' }}>Réinitialiser les données</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Tile({ label, value, theme }: { label: string; value: number; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.tile, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="title" style={styles.tileValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  scroll: { gap: Spacing.three, paddingBottom: Spacing.six },
  title: { marginTop: Spacing.two },
  tileRow: { flexDirection: 'row', gap: Spacing.three },
  tile: { flex: 1, borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.half },
  tileValue: { fontSize: 32, lineHeight: 36 },
  tileWide: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.half },
  section: { gap: Spacing.two },
  genreRow: { flexDirection: 'row', justifyContent: 'space-between' },
  historyButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  resetButton: {
    marginTop: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
  },
});
