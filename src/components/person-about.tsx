import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import type { AboutRow } from '@/api/person-credits';
import type { WikidataAward } from '@/api/wikidata';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AWARDS_PREVIEW_COUNT = 5;

export function AboutBlock({ rows }: { rows: AboutRow[] }) {
  const theme = useTheme();
  if (rows.length === 0) return null;

  return (
    <View style={styles.block}>
      <ThemedText type="smallBold">À propos</ThemedText>
      {rows.map((row) => {
        const content = (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
              {row.label}
            </ThemedText>
            <ThemedText type="small" style={styles.value}>
              {row.value}
            </ThemedText>
            {row.url && <Ionicons name="open-outline" size={16} color={theme.textSecondary} />}
          </>
        );
        return row.url ? (
          <Pressable key={row.label} onPress={() => Linking.openURL(row.url!)} style={styles.row}>
            {content}
          </Pressable>
        ) : (
          <View key={row.label} style={styles.row}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

export function FamilyBlock({ family }: { family: { relation: string; names: string[] }[] }) {
  if (family.length === 0) return null;

  return (
    <View style={styles.block}>
      <ThemedText type="smallBold">Famille</ThemedText>
      {family.map((entry) => (
        <View key={entry.relation} style={styles.row}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            {entry.relation}
          </ThemedText>
          <ThemedText type="small" style={styles.value}>
            {entry.names.join(', ')}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

export function AwardsBlock({ title, awards }: { title: string; awards: WikidataAward[] }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  if (awards.length === 0) return null;

  const visible = expanded ? awards : awards.slice(0, AWARDS_PREVIEW_COUNT);
  const hidden = awards.length - visible.length;

  return (
    <View style={styles.block}>
      <ThemedText type="smallBold">
        {title} ({awards.length})
      </ThemedText>
      {visible.map((award, index) => (
        <View key={`${award.name}-${index}`} style={styles.row}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            {award.year ?? '-'}
          </ThemedText>
          <ThemedText type="small" style={styles.value}>
            {award.name}
          </ThemedText>
        </View>
      ))}
      {awards.length > AWARDS_PREVIEW_COUNT && (
        <Pressable onPress={() => setExpanded((value) => !value)} style={styles.toggle}>
          <ThemedText type="small" themeColor="textSecondary">
            {expanded ? 'Voir moins' : `Voir les ${hidden} autres`}
          </ThemedText>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.one, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  label: { width: 104 },
  value: { flex: 1 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.one },
});
