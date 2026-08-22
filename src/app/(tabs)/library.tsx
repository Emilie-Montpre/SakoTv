import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tmdbImageUrl } from '@/api/tmdb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  type ContentTypeFilter,
  contentTypeLabel,
  isPaused,
  isUpToDate,
  matchesContentTypeFilter,
  pausedColor,
  pausedLabel,
  statusColors,
  statusLabels,
  upToDateColor,
  upToDateLabel,
} from '@/constants/content';
import { Spacing } from '@/constants/theme';
import type { LibraryStatus } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { listImportFailures, removeImportFailure } from '@/repository/import-failures';
import { getLastEpisodeWatchedAtByTitle, listLibraryItems } from '@/repository/library';

type StatusFilter = LibraryStatus | 'all' | 'paused' | 'up_to_date';

const typeFilters: { value: ContentTypeFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'movie', label: 'Films' },
  { value: 'tv', label: 'Séries' },
  { value: 'anime', label: 'Animés' },
];

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'to_watch', label: statusLabels.to_watch },
  { value: 'watching', label: statusLabels.watching },
  { value: 'paused', label: pausedLabel },
  { value: 'up_to_date', label: upToDateLabel },
  { value: 'completed', label: statusLabels.completed },
  { value: 'dropped', label: statusLabels.dropped },
];

// Un film se regarde en une fois : pas d'état "en cours"/"en pause"/"à jour" pour ce type de contenu
// (contrairement aux séries/animés, suivis épisode par épisode et à diffusion continue).
const movieStatusFilters = statusFilters.filter(
  (option) => option.value !== 'watching' && option.value !== 'paused' && option.value !== 'up_to_date',
);

type ViewMode = 'library' | 'failures';

export default function LibraryScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [typeFilter, setTypeFilter] = useState<ContentTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data } = useQuery({ queryKey: ['library-items'], queryFn: listLibraryItems });
  const { data: lastWatchedAtByTitle } = useQuery({
    queryKey: ['last-episode-watched-at'],
    queryFn: getLastEpisodeWatchedAtByTitle,
  });
  const { data: failures } = useQuery({ queryKey: ['import-failures'], queryFn: listImportFailures });

  const handleTypeFilterChange = (next: ContentTypeFilter) => {
    setTypeFilter(next);
    if (next === 'movie' && (statusFilter === 'watching' || statusFilter === 'paused' || statusFilter === 'up_to_date')) {
      setStatusFilter('all');
    }
  };

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['library-items'] });
      queryClient.invalidateQueries({ queryKey: ['last-episode-watched-at'] });
      queryClient.invalidateQueries({ queryKey: ['import-failures'] });
    }, [queryClient]),
  );

  const items = (data ?? []).filter((item) => {
    if (!matchesContentTypeFilter(item, typeFilter)) return false;
    const paused = isPaused(item.status, lastWatchedAtByTitle?.get(item.titleId));
    const upToDate = isUpToDate(item.status, item.mediaType, item.statusTmdb);
    if (statusFilter === 'all') return true;
    if (statusFilter === 'paused') return paused;
    if (statusFilter === 'up_to_date') return upToDate;
    if (statusFilter === 'watching') return item.status === 'watching' && !paused;
    if (statusFilter === 'completed') return item.status === 'completed' && !upToDate;
    return item.status === statusFilter;
  });
  const failureCount = failures?.length ?? 0;

  const handleSearchManually = (id: number, name: string, kind: 'tv' | 'movie') => {
    router.push({ pathname: '/(tabs)/search', params: { q: name, resolveFailureId: String(id), resolveFailureKind: kind } });
  };

  const handleDismissFailure = async (id: number) => {
    await removeImportFailure(id);
    queryClient.invalidateQueries({ queryKey: ['import-failures'] });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">Bibliothèque</ThemedText>
          <Pressable onPress={() => router.push('/import')}>
            <ThemedText type="small" themeColor="textSecondary">
              Importer
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setViewMode('library')}
            style={[styles.filterChip, { backgroundColor: viewMode === 'library' ? theme.text : theme.backgroundElement }]}>
            <ThemedText type="small" style={{ color: viewMode === 'library' ? theme.background : theme.text }}>
              Bibliothèque
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('failures')}
            style={[styles.filterChip, { backgroundColor: viewMode === 'failures' ? theme.text : theme.backgroundElement }]}>
            <ThemedText type="small" style={{ color: viewMode === 'failures' ? theme.background : theme.text }}>
              Échec import{failureCount > 0 ? ` (${failureCount})` : ''}
            </ThemedText>
          </Pressable>
        </View>

        {viewMode === 'library' && (
          <>
            <FilterRow value={typeFilter} onChange={handleTypeFilterChange} options={typeFilters} theme={theme} />
            <FilterRow
              value={statusFilter}
              onChange={setStatusFilter}
              options={typeFilter === 'movie' ? movieStatusFilters : statusFilters}
              theme={theme}
            />

            {items.length === 0 && (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                Rien ici pour l'instant. Cherche un contenu pour l'ajouter.
              </ThemedText>
            )}

            <FlatList
              style={styles.list}
              data={items}
              keyExtractor={(item) => String(item.titleId)}
              numColumns={3}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => {
                const poster = tmdbImageUrl(item.posterPath, 'w185');
                const paused = isPaused(item.status, lastWatchedAtByTitle?.get(item.titleId));
                const upToDate = isUpToDate(item.status, item.mediaType, item.statusTmdb);
                const dotColor = paused ? pausedColor : upToDate ? upToDateColor : statusColors[item.status];
                return (
                  <Pressable style={styles.gridItem} onPress={() => router.push(`/title/${item.mediaType}-${item.tmdbId}`)}>
                    {poster ? (
                      <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
                    ) : (
                      <View style={[styles.poster, { backgroundColor: theme.backgroundSelected }]} />
                    )}
                    <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                    <ThemedText type="small" numberOfLines={2}>
                      {item.name}
                    </ThemedText>
                  </Pressable>
                );
              }}
            />
          </>
        )}

        {viewMode === 'failures' && (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Ces titres n'ont pas de correspondance TMDB confirmée. Cherche-les manuellement avec un autre nom, ou
              retire-les de cette liste.
            </ThemedText>
            {failureCount === 0 && (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                Aucun échec d'import pour l'instant.
              </ThemedText>
            )}
            <FlatList
              style={styles.list}
              data={failures ?? []}
              keyExtractor={(f) => String(f.id)}
              contentContainerStyle={styles.failuresList}
              renderItem={({ item }) => (
                <View style={[styles.failureRow, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.failureText}>
                    <ThemedText numberOfLines={1}>{item.displayName}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.kind === 'movie' ? 'Film' : 'Série/Animé'}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handleSearchManually(item.id, item.displayName, item.kind)}
                    style={styles.smallButton}>
                    <ThemedText type="small">Chercher</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => handleDismissFailure(item.id)} style={styles.smallButton}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Retirer
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            />
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function FilterRow<T extends string>({
  value,
  onChange,
  options,
  theme,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.filterRow}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[
            styles.filterChip,
            { backgroundColor: option.value === value ? theme.text : theme.backgroundElement },
          ]}>
          <ThemedText type="small" style={{ color: option.value === value ? theme.background : theme.text }}>
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.two },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two },
  filterRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Spacing.five },
  empty: { textAlign: 'center', marginTop: Spacing.four },
  list: { flex: 1 },
  grid: { gap: Spacing.three, paddingVertical: Spacing.two, paddingBottom: Spacing.six },
  gridRow: { gap: Spacing.three },
  gridItem: { flex: 1 / 3, gap: Spacing.half },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: Spacing.two },
  statusDot: { position: 'absolute', top: Spacing.one, right: Spacing.one, width: 10, height: 10, borderRadius: 5 },
  failuresList: { gap: Spacing.two, paddingVertical: Spacing.two, paddingBottom: Spacing.six },
  failureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Spacing.two, padding: Spacing.two },
  failureText: { flex: 1, gap: Spacing.half },
  smallButton: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
});
