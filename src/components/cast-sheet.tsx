import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tmdbImageUrl } from '@/api/tmdb';
import type { TmdbCastMember } from '@/api/tmdb-types';
import { OVERLAY_CONTENT_TOP_PADDING, OverlayPage } from '@/components/overlay-page';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function CastSheet({
  visible,
  members,
  title,
  onClose,
  onOpenPerson,
}: {
  visible: boolean;
  members: TmdbCastMember[];
  title: string;
  onClose: () => void;
  onOpenPerson: (personId: number) => void;
}) {
  const theme = useTheme();

  return (
    <OverlayPage visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText type="smallBold">
          {title} ({members.length})
        </ThemedText>
        {members.map((member) => {
          const photo = tmdbImageUrl(member.profile_path, 'w185');
          return (
            <Pressable
              key={`${member.id}-${member.character}`}
              onPress={() => onOpenPerson(member.id)}
              style={[styles.row, { backgroundColor: theme.backgroundSelected }]}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photo, { backgroundColor: theme.backgroundElement }]} />
              )}
              <View style={styles.text}>
                <ThemedText numberOfLines={1}>{member.name}</ThemedText>
                {member.character ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                    {member.character}
                  </ThemedText>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </OverlayPage>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: OVERLAY_CONTENT_TOP_PADDING,
    paddingBottom: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  photo: { width: 48, height: 48, borderRadius: 24 },
  text: { flex: 1 },
});
