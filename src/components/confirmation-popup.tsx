import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { tmdbImageUrl } from '@/api/tmdb';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AUTO_CLOSE_MS = 2500;
const ADDED_COLOR = '#3B82F6';
const REMOVED_COLOR = '#E5484D';
const DELTA_OVERLAY_OPACITY = 0.39;

export type ConfirmationPreview = {
  posters: (string | null)[];
  change: 'added' | 'removed';
  titlePosterPath: string | null;
};

export function ConfirmationPopup({
  message,
  preview,
  onClose,
}: {
  message: string | null;
  preview?: ConfirmationPreview | null;
  onClose: () => void;
}) {
  const theme = useTheme();

  useEffect(() => {
    if (message == null) return;
    const timer = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <Modal visible={message != null} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.container} onPress={onClose}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          {preview && (
            <View style={styles.posters}>
              {preview.posters.map((posterPath, index) => {
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
              <View
                style={[
                  styles.poster,
                  preview.posters.length > 0 && styles.overlap,
                  styles.delta,
                  { backgroundColor: theme.backgroundSelected },
                ]}>
                {tmdbImageUrl(preview.titlePosterPath, 'w185') && (
                  <Image
                    source={{ uri: tmdbImageUrl(preview.titlePosterPath, 'w185') ?? undefined }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                )}
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: preview.change === 'added' ? ADDED_COLOR : REMOVED_COLOR, opacity: DELTA_OVERLAY_OPACITY },
                  ]}
                />
                <ThemedText type="smallBold" style={styles.deltaText}>
                  {preview.change === 'added' ? '+1' : '-1'}
                </ThemedText>
              </View>
            </View>
          )}
          <ThemedText type="small" numberOfLines={5} style={styles.message}>
            {message}
          </ThemedText>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  card: {
    width: '70%',
    maxWidth: 260,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  posters: { flexDirection: 'row' },
  poster: { width: 48, height: 72, borderRadius: Spacing.one + 1 },
  overlap: { marginLeft: -18 },
  delta: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  deltaText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  message: { textAlign: 'center' },
});
