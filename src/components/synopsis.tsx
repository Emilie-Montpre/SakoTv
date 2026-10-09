import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const SYNOPSIS_COLLAPSED_LINES = 4;

export function Synopsis({ text, padded = true }: { text: string; padded?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [lineCount, setLineCount] = useState<number | null>(null);
  const isLong = lineCount != null && lineCount > SYNOPSIS_COLLAPSED_LINES;

  return (
    <View style={[styles.overview, !padded && styles.unpadded]}>
      <ThemedText numberOfLines={!expanded && isLong ? SYNOPSIS_COLLAPSED_LINES : undefined}>{text}</ThemedText>
      <View
        pointerEvents="none"
        style={[styles.measure, padded && styles.measurePadded]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <ThemedText onTextLayout={(event) => setLineCount(event.nativeEvent.lines.length)}>{text}</ThemedText>
      </View>
      {isLong && (
        <Pressable onPress={() => setExpanded((v) => !v)}>
          <ThemedText type="small" themeColor="textSecondary">
            {expanded ? 'Voir moins' : 'Lire la suite'}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overview: { paddingHorizontal: Spacing.three, gap: Spacing.one },
  unpadded: { paddingHorizontal: 0 },
  measure: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  measurePadded: { paddingHorizontal: Spacing.three },
});
