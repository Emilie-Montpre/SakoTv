import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { searchMulti, tmdbImageUrl } from '@/api/tmdb';
import type { TmdbSearchResult } from '@/api/tmdb-types';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { mediaTypeLabels } from '@/constants/content';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function releaseYear(item: TmdbSearchResult) {
  const date = item.release_date || item.first_air_date;
  return date ? date.slice(0, 4) : '—';
}

export default function SearchScreen() {
  const theme = useTheme();
  const { q, resolveFailureId, resolveFailureKind } = useLocalSearchParams<{
    q?: string;
    resolveFailureId?: string;
    resolveFailureKind?: 'tv' | 'movie';
  }>();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (q) setQuery(q);
  }, [q]);

  const { data, isFetching, error } = useQuery({
    queryKey: ['tmdb-search', query],
    queryFn: () => searchMulti(query),
    enabled: query.trim().length > 1,
    retry: false,
  });

  let results = (data?.results ?? []).filter(
    (item): item is TmdbSearchResult & { media_type: 'movie' | 'tv' } =>
      item.media_type === 'movie' || item.media_type === 'tv',
  );
  if (resolveFailureKind) {
    results = results.filter((item) => item.media_type === resolveFailureKind);
  }

  const handlePress = (item: TmdbSearchResult & { media_type: 'movie' | 'tv' }) => {
    if (resolveFailureId) {
      router.push({ pathname: `/title/${item.media_type}-${item.id}`, params: { resolveFailureId } });
    } else {
      router.push(`/title/${item.media_type}-${item.id}`);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          Recherche
        </ThemedText>

        {resolveFailureId && (
          <ThemedText type="small" themeColor="textSecondary">
            Résolution d'un échec d'import — ouvre la fiche pour vérifier avant de confirmer.
          </ThemedText>
        )}

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Titre d'un film, d'une série, d'un animé…"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          autoCorrect={false}
        />

        {error && (
          <ThemedText themeColor="text" style={styles.empty}>
            Erreur TMDB : {error.message}
            {'\n'}Vérifie ta clé API dans .env (EXPO_PUBLIC_TMDB_API_KEY).
          </ThemedText>
        )}

        {!error && query.trim().length > 1 && !isFetching && results.length === 0 && (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Aucun résultat.
          </ThemedText>
        )}

        {query.trim().length <= 1 && (
          <View style={styles.section}>
            <ThemedText type="smallBold">Recommandations</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Bientôt disponible — suggestions basées sur ta bibliothèque.
            </ThemedText>
          </View>
        )}

        <FlatList
          style={styles.list}
          data={results}
          keyExtractor={(item) => `${item.media_type}-${item.id}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const poster = tmdbImageUrl(item.poster_path, 'w185');
            return (
              <Pressable style={[styles.row, { backgroundColor: theme.backgroundElement }]} onPress={() => handlePress(item)}>
                {poster ? (
                  <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
                ) : (
                  <View style={[styles.poster, { backgroundColor: theme.backgroundSelected }]} />
                )}
                <View style={styles.rowText}>
                  <ThemedText numberOfLines={2}>{item.title ?? item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {mediaTypeLabels[item.media_type]} · {releaseYear(item)}
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
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
  },
  empty: { textAlign: 'center', marginTop: Spacing.four },
  section: { gap: Spacing.two },
  list: { flex: 1 },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.six },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    alignItems: 'center',
  },
  poster: { width: 48, height: 72, borderRadius: Spacing.one },
  rowText: { flex: 1, gap: Spacing.half },
});
