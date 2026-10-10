import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { departmentLabel, jobLabel } from '@/api/person-credits';
import { getEpisodeCredits, getEpisodeEnglish, tmdbImageUrl } from '@/api/tmdb';
import type { TmdbCastMember, TmdbEpisode, TmdbEpisodeCredits } from '@/api/tmdb-types';
import { Synopsis } from '@/components/synopsis';
import { OVERLAY_CONTENT_TOP_PADDING, OverlayPage } from '@/components/overlay-page';
import { ThemedText } from '@/components/themed-text';
import { EpisodeImdbRating } from '@/components/title-ratings';
import { EpisodeLanguages, EpisodePlatforms } from '@/components/title-streaming';
import { statusColors } from '@/constants/content';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type EpisodeSheetData = {
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  overview: string | null;
  airDate: string | null;
  runtime: number | null;
  stillPath: string | null;
  episodeId: number;
  watched: boolean;
  watchedAt: number | null;
  rewatchCount: number;
  seasonEpisodeCount: number;
  roleNote?: string | null;
};

type Props = {
  tvId: number;
  seriesImdbId: string | null | undefined;
  episode: EpisodeSheetData | null;
  onClose: () => void;
  onOpenPerson: (personId: number) => void;
  onMarkWatched: (episodeId: number) => void;
  onUnmarkWatched: (episodeId: number) => void;
  busy: boolean;
};

const PRIMARY_DEPARTMENTS = ['Directing', 'Writing'];

function formatAirDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function CastRow({
  title,
  members,
  onOpenPerson,
}: {
  title: string;
  members: TmdbCastMember[];
  onOpenPerson: Props['onOpenPerson'];
}) {
  const theme = useTheme();
  if (members.length === 0) return null;

  return (
    <View style={styles.block}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.castScroll}
        contentContainerStyle={styles.castRow}>
        {members.slice(0, 15).map((member) => {
          const photo = tmdbImageUrl(member.profile_path, 'w185');
          return (
            <Pressable
              key={`${member.id}-${member.character}`}
              style={styles.castItem}
              onPress={() => onOpenPerson(member.id)}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.castPhoto} contentFit="cover" />
              ) : (
                <View style={[styles.castPhoto, { backgroundColor: theme.backgroundSelected }]} />
              )}
              <ThemedText type="small" numberOfLines={1} style={styles.centered}>
                {member.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.centered}>
                {member.character}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function CrewBlock({ credits, onOpenPerson }: { credits: TmdbEpisodeCredits; onOpenPerson: Props['onOpenPerson'] }) {
  const theme = useTheme();
  const [showAll, setShowAll] = useState(false);

  const byDepartment = new Map<string, Map<number, { name: string; jobs: string[] }>>();
  for (const member of credits.crew) {
    const people = byDepartment.get(member.department) ?? new Map<number, { name: string; jobs: string[] }>();
    const existing = people.get(member.id);
    const job = jobLabel(member.job);
    if (existing) {
      if (!existing.jobs.includes(job)) existing.jobs.push(job);
    } else {
      people.set(member.id, { name: member.name, jobs: [job] });
    }
    byDepartment.set(member.department, people);
  }

  const rank = (department: string) => {
    const index = PRIMARY_DEPARTMENTS.indexOf(department);
    return index === -1 ? PRIMARY_DEPARTMENTS.length : index;
  };
  const departments = [...byDepartment.keys()].sort((a, b) => rank(a) - rank(b));
  if (departments.length === 0) return null;

  const primary = departments.filter((department) => PRIMARY_DEPARTMENTS.includes(department));
  const hasSecondary = primary.length > 0 && primary.length < departments.length;
  const visible = showAll || primary.length === 0 ? departments : primary;

  return (
    <View style={styles.block}>
      <ThemedText type="smallBold">Équipe</ThemedText>
      {visible.map((department) => (
        <View key={department} style={styles.department}>
          <ThemedText type="small" themeColor="textSecondary">
            {departmentLabel(department)}
          </ThemedText>
          {[...byDepartment.get(department)!.entries()].map(([personId, person]) => (
            <Pressable key={personId} onPress={() => onOpenPerson(personId)} style={styles.crewRow}>
              <ThemedText type="small" style={styles.crewName}>
                {person.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.crewJob} numberOfLines={1}>
                {person.jobs.join(', ')}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ))}
      {hasSecondary && (
        <Pressable onPress={() => setShowAll((value) => !value)} style={styles.toggleRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {showAll ? "Masquer le reste de l'équipe" : "Voir toute l'équipe"}
          </ThemedText>
          <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

function formatWatchedDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function WatchedButton({
  episode,
  busy,
  onMarkWatched,
  onUnmarkWatched,
}: {
  episode: EpisodeSheetData;
  busy: boolean;
  onMarkWatched: Props['onMarkWatched'];
  onUnmarkWatched: Props['onUnmarkWatched'];
}) {
  const theme = useTheme();
  const watchCount = episode.rewatchCount + 1;

  const handlePress = () => {
    if (!episode.watched) {
      onMarkWatched(episode.episodeId);
      return;
    }
    Alert.alert("Vous ne l'avez finalement pas regardé ?", undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Oups, pas vu !', style: 'destructive', onPress: () => onUnmarkWatched(episode.episodeId) },
    ]);
  };

  const handleLongPress = () => {
    if (!episode.watched) return;
    Alert.alert('Marquer comme revu ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Revu', onPress: () => onMarkWatched(episode.episodeId) },
    ]);
  };

  return (
    <Pressable
      disabled={busy}
      onPress={handlePress}
      onLongPress={handleLongPress}
      hitSlop={8}
      style={[
        styles.watchedTile,
        { backgroundColor: episode.watched ? statusColors.completed : theme.backgroundSelected, opacity: busy ? 0.5 : 1 },
      ]}>
      <Ionicons
        name={episode.watched ? 'checkmark-circle' : 'checkmark-circle-outline'}
        size={28}
        color={episode.watched ? '#fff' : theme.textSecondary}
      />
      <ThemedText type="small" style={[styles.watchedLabel, { color: episode.watched ? '#fff' : theme.textSecondary }]}>
        {episode.watched ? 'Vu' : 'Pas vu'}
      </ThemedText>
      {episode.watched && watchCount > 1 && (
        <View style={styles.rewatchBadge}>
          <ThemedText style={styles.rewatchBadgeText}>{watchCount}</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

function EpisodeContent({
  tvId,
  seriesImdbId,
  episode,
  onOpenPerson,
  onMarkWatched,
  onUnmarkWatched,
  busy,
}: {
  tvId: number;
  seriesImdbId: string | null | undefined;
  episode: EpisodeSheetData;
  onOpenPerson: Props['onOpenPerson'];
  onMarkWatched: Props['onMarkWatched'];
  onUnmarkWatched: Props['onUnmarkWatched'];
  busy: boolean;
}) {
  const theme = useTheme();
  const [revealed, setRevealed] = useState(false);

  const frenchOverview = episode.overview?.trim() ?? '';
  const overviewIncomplete = frenchOverview === '' || /(\.\.\.|\u2026)$/.test(frenchOverview);
  const englishQuery = useQuery<TmdbEpisode>({
    queryKey: ['tmdb-episode-english', tvId, episode.seasonNumber, episode.episodeNumber],
    queryFn: () => getEpisodeEnglish(tvId, episode.seasonNumber, episode.episodeNumber),
    enabled: overviewIncomplete && episode.seasonNumber > 0,
  });
  const englishOverview = englishQuery.data?.overview?.trim() ?? '';
  const useEnglish = overviewIncomplete && englishOverview.length > frenchOverview.length;

  const creditsQuery = useQuery<TmdbEpisodeCredits>({
    queryKey: ['tmdb-episode-credits', tvId, episode.seasonNumber, episode.episodeNumber],
    queryFn: () => getEpisodeCredits(tvId, episode.seasonNumber, episode.episodeNumber),
  });

  const still = tmdbImageUrl(episode.stillPath, 'w500');
  const hidden = !episode.watched && !revealed;
  const meta = [episode.airDate ? formatAirDate(episode.airDate) : null, episode.runtime ? `${episode.runtime} min` : null]
    .filter(Boolean)
    .join(' · ');

  const media = hidden ? (
    <View style={[styles.spoiler, { backgroundColor: theme.backgroundSelected }]}>
      <Ionicons name="eye-off-outline" size={22} color={theme.textSecondary} />
      <ThemedText type="small" style={styles.centered}>
        Cet épisode n'a pas encore été regardé : le résumé et l'image peuvent révéler des éléments de l'intrigue.
      </ThemedText>
      <Pressable onPress={() => setRevealed(true)} style={[styles.revealButton, { backgroundColor: theme.text }]}>
        <ThemedText type="small" style={{ color: theme.background }}>
          Afficher quand même
        </ThemedText>
      </Pressable>
    </View>
  ) : still ? (
    <Image source={{ uri: still }} style={styles.still} contentFit="cover" />
  ) : null;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {media}
      <View style={[styles.body, !media && { paddingTop: OVERLAY_CONTENT_TOP_PADDING }]}>
      {episode.roleNote ? (
        <View style={[styles.roleNote, { backgroundColor: theme.backgroundSelected }]}>
          <Ionicons name="person-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="small" style={styles.roleNoteText}>
            {episode.roleNote}
          </ThemedText>
        </View>
      ) : null}
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <ThemedText type="small" themeColor="textSecondary">
            {episode.seasonNumber === 0 ? 'Spécial' : `Saison ${episode.seasonNumber}`} · Épisode {episode.episodeNumber}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.title}>
            {episode.name ?? `Épisode ${episode.episodeNumber}`}
          </ThemedText>
          {meta ? (
            <ThemedText type="small" themeColor="textSecondary">
              {meta}
            </ThemedText>
          ) : null}
          {episode.watched && episode.watchedAt ? (
            <ThemedText type="small" themeColor="textSecondary">
              Dernier visionnage : {formatWatchedDate(episode.watchedAt)}
            </ThemedText>
          ) : null}
        </View>
        <WatchedButton
          episode={episode}
          busy={busy}
          onMarkWatched={onMarkWatched}
          onUnmarkWatched={onUnmarkWatched}
        />
      </View>

      {!hidden && (useEnglish ? englishOverview : frenchOverview) ? (
        <View style={styles.overviewBlock}>
          <Synopsis text={useEnglish ? englishOverview : frenchOverview} padded={false} />
          {useEnglish && (
            <ThemedText type="small" themeColor="textSecondary">
              Résumé en anglais : la version française est absente ou incomplète.
            </ThemedText>
          )}
        </View>
      ) : null}

      <View style={styles.infoRow}>
        <EpisodeImdbRating
          seriesImdbId={seriesImdbId}
          seasonNumber={episode.seasonNumber}
          episodeNumber={episode.episodeNumber}
        />
      </View>

      <EpisodeLanguages
        tmdbId={tvId}
        seasonNumber={episode.seasonNumber}
        episodeNumber={episode.episodeNumber}
        seasonEpisodeCount={episode.seasonEpisodeCount}
      />

      <EpisodePlatforms
        tmdbId={tvId}
        seasonNumber={episode.seasonNumber}
        episodeNumber={episode.episodeNumber}
        seasonEpisodeCount={episode.seasonEpisodeCount}
      />

      {creditsQuery.isLoading && <ActivityIndicator />}
      {creditsQuery.data && (
        <>
          <CastRow title="Distribution" members={creditsQuery.data.cast} onOpenPerson={onOpenPerson} />
          <CastRow title="Invités" members={creditsQuery.data.guest_stars} onOpenPerson={onOpenPerson} />
          <CrewBlock credits={creditsQuery.data} onOpenPerson={onOpenPerson} />
        </>
      )}
      </View>
    </ScrollView>
  );
}

export function EpisodeSheet({
  tvId,
  seriesImdbId,
  episode,
  onClose,
  onOpenPerson,
  onMarkWatched,
  onUnmarkWatched,
  busy,
}: Props) {
  return (
    <OverlayPage visible={episode != null} onClose={onClose}>
      {episode && (
        <EpisodeContent
          key={`${episode.seasonNumber}-${episode.episodeNumber}`}
          tvId={tvId}
          seriesImdbId={seriesImdbId}
          episode={episode}
          onOpenPerson={onOpenPerson}
          onMarkWatched={onMarkWatched}
          onUnmarkWatched={onUnmarkWatched}
          busy={busy}
        />
      )}
    </OverlayPage>
  );
}

const styles = StyleSheet.create({
  overviewBlock: { gap: Spacing.one },
  scrollContent: { paddingBottom: Spacing.four },
  body: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  roleNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  roleNoteText: { flex: 1 },
  watchedTile: {
    width: 68,
    height: 68,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    flexShrink: 0,
  },
  watchedLabel: { fontSize: 12, lineHeight: 16 },
  rewatchBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewatchBadgeText: { color: '#1B5E3B', fontWeight: 'bold', fontSize: 12, lineHeight: 16 },
  infoRow: { flexDirection: 'row' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  titleBlock: { flex: 1, gap: Spacing.half },
  title: { fontSize: 24, lineHeight: 30 },
  centered: { textAlign: 'center' },
  still: { width: '100%', aspectRatio: 16 / 9 },
  spoiler: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  revealButton: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Spacing.two },
  block: { gap: Spacing.two },
  castScroll: { marginHorizontal: -Spacing.three },
  castRow: { gap: Spacing.three, paddingVertical: Spacing.one, paddingHorizontal: Spacing.three },
  castItem: { width: 80, gap: Spacing.half },
  castPhoto: { width: 80, height: 80, borderRadius: 40 },
  department: { gap: Spacing.half },
  crewRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.half },
  crewName: { flex: 1 },
  crewJob: { flex: 1, textAlign: 'right' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
});
