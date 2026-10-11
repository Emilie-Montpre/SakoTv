import { useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';
import { eq } from 'drizzle-orm';

import { ThemedText } from '@/components/themed-text';
import { db } from '@/db/client';
import { episodeImportedVotes } from '@/db/schema';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const FAKE_VOTES = [
  { kind: 'emotion' as const, code: 30 },
  { kind: 'emotion' as const, code: 37 },
  { kind: 'emotion' as const, code: 32 },
  { kind: 'emotion' as const, code: 34 },
  { kind: 'rating' as const, code: 3 },
  { kind: 'rating' as const, code: 28 },
];

export function TempImportedVotesSeed({ episodeId }: { episodeId: number }) {
  const theme = useTheme();
  const queryClient = useQueryClient();

  if (!__DEV__) return null;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['episode-feedback', episodeId] });

  const addFakeVotes = async () => {
    await db
      .insert(episodeImportedVotes)
      .values(FAKE_VOTES.map((vote) => ({ episodeId, ...vote })))
      .onConflictDoNothing();
    await refresh();
  };

  const removeFakeVotes = async () => {
    await db.delete(episodeImportedVotes).where(eq(episodeImportedVotes.episodeId, episodeId));
    await refresh();
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={addFakeVotes} style={[styles.button, { borderColor: theme.textSecondary }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Test : ajouter des avis TV Time
        </ThemedText>
      </Pressable>
      <Pressable onPress={removeFakeVotes} style={[styles.button, { borderColor: theme.textSecondary }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Test : les supprimer
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
