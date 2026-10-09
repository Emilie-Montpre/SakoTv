import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getMovieRecommendations, getTvRecommendations, tmdbImageUrl } from '@/api/tmdb';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function TitleSimilar({ mediaType, tmdbId }: { mediaType: 'movie' | 'tv'; tmdbId: number }) {
  const theme = useTheme();

  const query = useQuery({
    queryKey: ['tmdb-recommendations', mediaType, tmdbId],
    queryFn: () => (mediaType === 'movie' ? getMovieRecommendations(tmdbId) : getTvRecommendations(tmdbId)),
  });

  const items = (query.data?.results ?? []).filter((item) => item.poster_path).slice(0, 15);
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Titres similaires</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => {
          const poster = tmdbImageUrl(item.poster_path, 'w185');
          return (
            <Pressable
              key={item.id}
              style={styles.item}
              onPress={() => router.push(`/title/${mediaType}-${item.id}`)}>
              {poster ? (
                <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
              ) : (
                <View style={[styles.poster, { backgroundColor: theme.backgroundSelected }]} />
              )}
              <ThemedText type="small" numberOfLines={2} style={styles.name}>
                {item.title ?? item.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  row: { gap: Spacing.two, paddingVertical: Spacing.one },
  item: { width: 100, gap: Spacing.one },
  poster: { width: 100, height: 150, borderRadius: Spacing.two },
  name: { textAlign: 'center' },
});
