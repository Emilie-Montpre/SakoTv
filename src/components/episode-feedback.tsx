import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
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
const ACTIVE_COLOR = '#3B82F6';

type Section = 'reactions' | 'rating' | 'note';

function SectionButton({
  active,
  onPress,
  icon,
  iconColor,
  emojis,
  label,
}: {
  active: boolean;
  onPress: () => void;
  icon: ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  emojis?: string[];
  label: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sectionButton,
        { backgroundColor: theme.backgroundSelected, borderColor: active ? ACTIVE_COLOR : 'transparent' },
      ]}>
      {emojis && emojis.length > 0 ? (
        <View style={styles.buttonEmojis}>
          {emojis.map((emoji, index) => (
            <ThemedText key={`${emoji}-${index}`} style={styles.buttonEmoji}>
              {emoji}
            </ThemedText>
          ))}
        </View>
      ) : (
        <Ionicons name={icon} size={24} color={iconColor} />
      )}
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.buttonLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function EpisodeFeedback({ episodeId, watched }: { episodeId: number; watched: boolean }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const queryKey = ['episode-feedback', episodeId];
  const { data } = useQuery({ queryKey, queryFn: () => getEpisodeFeedback(episodeId) });

  const [openSection, setOpenSection] = useState<Section | null>(null);
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

  const toggleSection = (section: Section) => setOpenSection((current) => (current === section ? null : section));

  const handleToggleReaction = async (code: string) => {
    await toggleEpisodeReaction(episodeId, code);
    await refresh();
  };

  const handleRating = async (value: number) => {
    await setEpisodeRating(episodeId, data.rating === value ? null : value);
    await refresh();
  };

  const featuredEmojis = data.featured
    .map((code) => REACTIONS.find((reaction) => reaction.code === code)?.emoji)
    .filter((emoji): emoji is string => emoji != null);
  const reactionCount = data.reactions.length;
  const reactionsLabel = reactionCount === 0 ? 'Réagir' : `${reactionCount} émotion${reactionCount > 1 ? 's' : ''}`;
  const noteLabel = savedNote.trim() === '' ? 'Écrire' : savedNote.trim().split('\n')[0];

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">Mon avis</ThemedText>

      <View style={styles.buttons}>
        <SectionButton
          active={openSection === 'reactions'}
          onPress={() => toggleSection('reactions')}
          icon="happy-outline"
          iconColor={theme.textSecondary}
          emojis={featuredEmojis}
          label={reactionsLabel}
        />
        <SectionButton
          active={openSection === 'rating'}
          onPress={() => toggleSection('rating')}
          icon={data.rating != null ? 'star' : 'star-outline'}
          iconColor={data.rating != null ? STAR_COLOR : theme.textSecondary}
          label={data.rating != null ? `${data.rating}/${MAX_RATING}` : 'Noter'}
        />
        <SectionButton
          active={openSection === 'note'}
          onPress={() => toggleSection('note')}
          icon={savedNote.trim() === '' ? 'create-outline' : 'create'}
          iconColor={theme.textSecondary}
          label={noteLabel}
        />
      </View>

      {openSection === 'reactions' && (
        <View style={styles.reactionGrid}>
          {REACTIONS.map((reaction) => {
            const selected = data.reactions.includes(reaction.code);
            return (
              <Pressable
                key={reaction.code}
                onPress={() => handleToggleReaction(reaction.code)}
                style={[styles.reaction, { backgroundColor: selected ? theme.text : theme.backgroundSelected }]}>
                <ThemedText style={styles.reactionEmoji}>{reaction.emoji}</ThemedText>
                <ThemedText type="small" numberOfLines={1} style={{ color: selected ? theme.background : theme.text }}>
                  {reaction.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}

      {openSection === 'rating' && (
        <View style={styles.stars}>
          {Array.from({ length: MAX_RATING }, (_, index) => {
            const value = index + 1;
            const filled = data.rating != null && value <= data.rating;
            return (
              <Pressable key={value} onPress={() => handleRating(value)} hitSlop={6}>
                <Ionicons
                  name={filled ? 'star' : 'star-outline'}
                  size={36}
                  color={filled ? STAR_COLOR : theme.textSecondary}
                />
              </Pressable>
            );
          })}
        </View>
      )}

      {openSection === 'note' && (
        <TextInput
          value={noteText}
          onChangeText={setNoteDraft}
          onBlur={() => {
            if (noteDraft != null && noteDraft !== savedNote) saveNote(noteDraft);
          }}
          placeholder="Une scène, une réplique, ton ressenti..."
          placeholderTextColor={theme.textSecondary}
          multiline
          textAlignVertical="top"
          style={[styles.note, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  sectionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 2,
    minHeight: 72,
  },
  buttonEmojis: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 28 },
  buttonEmoji: { fontSize: 20, lineHeight: 28, includeFontPadding: false },
  buttonLabel: { fontSize: 12, lineHeight: 16, maxWidth: '100%' },
  reactionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  reaction: {
    width: '31.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two + 2,
  },
  reactionEmoji: { fontSize: 16, lineHeight: 22 },
  stars: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.two },
  note: {
    minHeight: 96,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 15,
  },
});
