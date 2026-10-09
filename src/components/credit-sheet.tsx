import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { jobLabel, type FilmographyEntry } from '@/api/person-credits';
import { getCreditDetails, getTvDetails, tmdbImageUrl } from '@/api/tmdb';
import type { TmdbCreditDetails, TmdbCreditEpisode, TmdbPersonCredit, TmdbTvDetails } from '@/api/tmdb-types';
import { OVERLAY_CONTENT_TOP_PADDING, OverlayPage } from '@/components/overlay-page';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  entry: FilmographyEntry | null;
  credits: TmdbPersonCredit[];
  onClose: () => void;
  onOpenSeries: () => void;
  onOpenEpisode: (seasonNumber: number, episodeNumber: number, roleLabel: string) => void;
};

function formatSeasons(numbers: number[]) {
  const sorted = [...new Set(numbers)].filter((n) => n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return `Saison ${sorted[0]}`;
  const contiguous = sorted.every((n, index) => index === 0 || n === sorted[index - 1] + 1);
  return contiguous
    ? `Saisons ${sorted[0]} à ${sorted[sorted.length - 1]}`
    : `Saisons ${sorted.join(', ')}`;
}

function groupBySeason(episodes: TmdbCreditEpisode[]) {
  const bySeason = new Map<number, TmdbCreditEpisode[]>();
  for (const episode of episodes) {
    const list = bySeason.get(episode.season_number) ?? [];
    list.push(episode);
    bySeason.set(episode.season_number, list);
  }
  return [...bySeason.entries()]
    .sort(([a], [b]) => (a === 0 ? 1 : b === 0 ? -1 : a - b))
    .map(([season, list]) => ({
      season,
      episodes: [...list].sort((a, b) => a.episode_number - b.episode_number),
    }));
}

function CreditSection({
  credit,
  totalEpisodes,
  onOpenEpisode,
}: {
  credit: TmdbPersonCredit;
  totalEpisodes: number | undefined;
  onOpenEpisode: Props['onOpenEpisode'];
}) {
  const theme = useTheme();
  const isCast = credit.character !== undefined;
  const query = useQuery<TmdbCreditDetails>({
    queryKey: ['tmdb-credit', credit.credit_id],
    queryFn: () => getCreditDetails(credit.credit_id),
  });

  const roleLabel = isCast ? credit.character?.trim() || 'Acteur' : jobLabel(credit.job);
  const title = isCast
    ? credit.character?.trim()
      ? `Rôle : ${credit.character.trim()}`
      : 'Rôle non précisé'
    : jobLabel(credit.job);

  const episodes = query.data?.media.episodes ?? [];
  const seasonsLabel = formatSeasons([
    ...(query.data?.media.seasons?.map((season) => season.season_number) ?? []),
    ...episodes.map((episode) => episode.season_number),
  ]);
  const count = credit.episode_count ?? (episodes.length > 0 ? episodes.length : null);
  const countLabel =
    count == null
      ? null
      : totalEpisodes != null && count <= totalEpisodes
        ? `${count} épisode${count > 1 ? 's' : ''} sur ${totalEpisodes}`
        : `${count} épisode${count > 1 ? 's' : ''}`;
  const partial = count != null && episodes.length < count;

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <View style={styles.chips}>
        {countLabel && (
          <View style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small">{countLabel}</ThemedText>
          </View>
        )}
        {seasonsLabel && (
          <View style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small">{seasonsLabel}</ThemedText>
          </View>
        )}
      </View>

      {query.isLoading && <ActivityIndicator />}

      {groupBySeason(episodes).map((group) => (
        <View key={group.season} style={styles.seasonBlock}>
          <ThemedText type="small" themeColor="textSecondary">
            {group.season === 0 ? 'Spéciaux' : `Saison ${group.season}`}
          </ThemedText>
          {group.episodes.map((episode) => (
            <Pressable
              key={episode.id}
              onPress={() => onOpenEpisode(episode.season_number, episode.episode_number, roleLabel)}
              style={[styles.episodeRow, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.episodeCode}>
                S{episode.season_number}E{episode.episode_number}
              </ThemedText>
              <ThemedText type="small" numberOfLines={1} style={styles.episodeName}>
                {episode.name}
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </Pressable>
          ))}
        </View>
      ))}

      {!query.isLoading && partial && (
        <ThemedText type="small" themeColor="textSecondary">
          {episodes.length > 0
            ? 'Liste partielle : TMDB ne détaille pas tous les épisodes de ce rôle.'
            : "TMDB ne détaille pas les épisodes de ce rôle."}
        </ThemedText>
      )}
    </View>
  );
}

export function CreditSheet({ entry, credits, onClose, onOpenSeries, onOpenEpisode }: Props) {
  const theme = useTheme();

  const tvQuery = useQuery<TmdbTvDetails>({
    queryKey: ['tmdb-detail', 'tv', entry?.id],
    queryFn: () => getTvDetails(entry!.id),
    enabled: entry != null,
  });
  const totalEpisodes = tvQuery.data?.number_of_episodes;
  const poster = entry ? tmdbImageUrl(entry.posterPath, 'w185') : null;

  return (
    <OverlayPage visible={entry != null} onClose={onClose}>
        {entry && (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              {poster ? (
                <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
              ) : (
                <View style={[styles.poster, { backgroundColor: theme.backgroundSelected }]} />
              )}
              <View style={styles.headerText}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {entry.title}
                </ThemedText>
                {entry.year && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {entry.year}
                  </ThemedText>
                )}
              </View>
            </View>

            {credits.map((credit) => (
              <CreditSection
                key={credit.credit_id}
                credit={credit}
                totalEpisodes={totalEpisodes}
                onOpenEpisode={onOpenEpisode}
              />
            ))}

            <Pressable onPress={onOpenSeries} style={[styles.openButton, { backgroundColor: theme.text }]}>
              <ThemedText style={{ color: theme.background }}>Ouvrir la série</ThemedText>
            </Pressable>
          </ScrollView>
        )}
    </OverlayPage>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: OVERLAY_CONTENT_TOP_PADDING,
    paddingBottom: Spacing.four,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  poster: { width: 46, height: 68, borderRadius: Spacing.one },
  headerText: { flex: 1, gap: Spacing.half },
  section: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Spacing.one },
  seasonBlock: { gap: Spacing.one },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  episodeCode: { width: 52 },
  episodeName: { flex: 1 },
  openButton: { paddingVertical: Spacing.two + 2, borderRadius: Spacing.two, alignItems: 'center' },
});
