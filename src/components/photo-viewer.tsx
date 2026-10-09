import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tmdbImageUrl } from '@/api/tmdb';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function PhotoViewer({
  photos,
  initialIndex,
  onClose,
}: {
  photos: string[];
  initialIndex: number | null;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (initialIndex != null) setIndex(initialIndex);
  }, [initialIndex]);

  return (
    <Modal
      visible={initialIndex != null}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.container}>
        {initialIndex != null && (
          <FlatList
            data={photos}
            keyExtractor={(path) => path}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
            initialNumToRender={1}
            windowSize={3}
            onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, height }}>
                <Image
                  source={{ uri: tmdbImageUrl(item, 'original') ?? undefined }}
                  style={styles.image}
                  contentFit="contain"
                />
              </View>
            )}
          />
        )}

        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={[styles.closeButton, { top: insets.top + Spacing.two }]}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>

        {photos.length > 1 && (
          <View style={[styles.counter, { bottom: insets.bottom + Spacing.four }]}>
            <ThemedText type="small" style={styles.counterText}>
              {index + 1} / {photos.length}
            </ThemedText>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' },
  image: { width: '100%', height: '100%' },
  closeButton: {
    position: 'absolute',
    right: Spacing.three,
    zIndex: 10,
    padding: Spacing.two,
    borderRadius: 999,
    backgroundColor: 'rgba(60, 60, 60, 0.6)',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: 'rgba(60, 60, 60, 0.6)',
  },
  counterText: { color: '#fff' },
});
