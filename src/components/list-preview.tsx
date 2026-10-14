import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { tmdbImageUrl } from '@/api/tmdb';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LIST_PREVIEW_POSTERS } from '@/repository/custom-lists';

export function ListPreview({ posters, count }: { posters: (string | null)[]; count: number }) {
  const theme = useTheme();

  if (count === 0) {
    return <View style={[styles.poster, styles.empty, { borderColor: theme.textSecondary }]} />;
  }

  const overflow = count > LIST_PREVIEW_POSTERS;
  const shown = overflow ? posters.slice(0, LIST_PREVIEW_POSTERS - 1) : posters.slice(0, LIST_PREVIEW_POSTERS);

  return (
    <View style={styles.row}>
      {shown.map((posterPath, index) => {
        const uri = tmdbImageUrl(posterPath, 'w185');
        return uri ? (
          <Image
            key={index}
            source={{ uri }}
            style={[styles.poster, index > 0 && styles.overlap]}
            contentFit="cover"
          />
        ) : (
          <View
            key={index}
            style={[styles.poster, index > 0 && styles.overlap, { backgroundColor: theme.backgroundSelected }]}
          />
        );
      })}
      {overflow && (
        <View style={[styles.poster, styles.overlap, styles.more, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="small" themeColor="textSecondary">
            +{count - shown.length}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexShrink: 0 },
  poster: { width: 32, height: 48, borderRadius: Spacing.one },
  overlap: { marginLeft: -14 },
  more: { alignItems: 'center', justifyContent: 'center' },
  empty: { borderWidth: 1, borderStyle: 'dashed' },
});
