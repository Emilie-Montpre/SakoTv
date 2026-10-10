import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MAX_RATING, REACTIONS } from '@/constants/reactions';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getEpisodeFeedback,
  setEpisodeNote,
  setEpisodeRating,
  toggleEpisodeReaction,
} from '@/repository/episode-feedback';

const NOTE_SAVE_DELAY_MS = 600;
const STAR_COLOR = '#F5A524';

export function EpisodeFeedback({ episodeId, watched }: { episodeId: number; watched: boolean }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const queryKey = ['episode-feedback', episodeId];
  const { data } = useQuery({ queryKey, queryFn: () => getEpisodeFeedback(episodeId) });

  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [keepVisible, setKeepVisible] = useState(false);
  const hasContent = data != null && (data.reactions.length > 0 || data.rating != null || data.note !== '');

  useEffect(() => {
    if (hasContent) setKeepVisible(true);
  }, [hasContent]);
  const savedNote = data?.note ?? '';
  const noteText = noteDraft ?? savedNote;
  const pendingNote = useRef<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const saveNote = async (text: string) => {
    pendingNote.current = null;
    await setEpisodeNote(episodeId, text);
    await refresh();
  };

  useEffect(() => {
    if (noteDraft == null || noteDraft === savedNote) return;
    pendingNote.current = noteDraft;
    const timer = setTimeout(() => saveNote(noteDraft), NOTE_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [noteDraft]);

  useEffect(
    () => () => {
      if (pendingNote.current != null) {
        setEpisodeNote(episodeId, pendingNote.current).then(() =>
          queryClient.invalidateQueries({ queryKey: ['episode-feedback', episodeId] }),
        );
      }
    },
    [],
  );

  if (!data || (!watched && !keepVisible && !hasContent)) return null;

  const handleToggleReaction = async (code: string) => {
    await toggleEpisodeReaction(episodeId, code);
    await refresh();
  };

  const handleRating = async (value: number) => {
    await setEpisodeRating(episodeId, data.rating === value ? null : value);
    await refresh();
  };

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">Mon avis</ThemedText>

      <View style={styles.reactions}>
        {REACTIONS.map((reaction) => {
          const active = data.reactions.includes(reaction.code);
          return (
            <Pressable
              key={reaction.code}
              onPress={() => handleToggleReaction(reaction.code)}
              style={[
                styles.reaction,
                { backgroundColor: active ? theme.text : theme.backgroundSelected },
              ]}>
              <ThemedText style={styles.reactionEmoji}>{reaction.emoji}</ThemedText>
              <ThemedText type="small" style={{ color: active ? theme.background : theme.text }}>
                {reaction.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.stars}>
        {Array.from({ length: MAX_RATING }, (_, index) => {
          const value = index + 1;
          const filled = data.rating != null && value <= data.rating;
          return (
            <Pressable key={value} onPress={() => handleRating(value)} hitSlop={6}>
              <Ionicons
                name={filled ? 'star' : 'star-outline'}
                size={30}
                color={filled ? STAR_COLOR : theme.textSecondary}
              />
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={noteText}
        onChangeText={setNoteDraft}
        onBlur={() => {
          if (noteDraft != null && noteDraft !== savedNote) saveNote(noteDraft);
        }}
        placeholder="Une note perso sur cet épisode (une scène, une réplique, ton ressenti...)"
        placeholderTextColor={theme.textSecondary}
        multiline
        textAlignVertical="top"
        style={[styles.note, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: 999,
  },
  reactionEmoji: { fontSize: 16, lineHeight: 22 },
  stars: { flexDirection: 'row', gap: Spacing.two },
  note: {
    minHeight: 88,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 15,
  },
});
