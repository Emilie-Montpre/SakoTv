import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { getOmdbByImdbId, getOmdbEpisodeRating, omdbRatings } from '@/api/omdb';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const IMDB_YELLOW = '#F5C518';
const TOMATO_FRESH = '#FA320A';
const TOMATO_ROTTEN = '#5BA32B';
const TOMATO_STEM = '#2E7D32';
const METACRITIC_GOOD = '#66CC33';
const METACRITIC_MIXED = '#FFCC33';
const METACRITIC_BAD = '#FF0000';

function metascoreColor(score: number) {
  if (score >= 75) return METACRITIC_GOOD;
  if (score >= 50) return METACRITIC_MIXED;
  return METACRITIC_BAD;
}

function ImdbBadge() {
  return (
    <View style={[styles.imdbBadge, { backgroundColor: IMDB_YELLOW }]}>
      <Text style={styles.imdbBadgeText}>IMDb</Text>
    </View>
  );
}

function TomatoBadge({ percent }: { percent: number }) {
  const fresh = percent >= 60;
  return (
    <View style={styles.tomatoWrap}>
      <View style={[styles.tomatoStem, { backgroundColor: TOMATO_STEM }]} />
      <View style={[styles.tomatoBody, { backgroundColor: fresh ? TOMATO_FRESH : TOMATO_ROTTEN }]} />
    </View>
  );
}

function MetascoreBadge({ score }: { score: number }) {
  return (
    <View style={[styles.metaBadge, { backgroundColor: metascoreColor(score) }]}>
      <Text style={[styles.metaBadgeText, score >= 50 && score < 75 && { color: '#000' }]}>{score}</Text>
    </View>
  );
}

function RatingTile({ badge, value, label, width }: { badge: ReactNode; value?: string; label: string; width?: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.backgroundElement, width }]}>
      <View style={styles.badgeSlot}>{badge}</View>
      <View style={styles.tileText}>
        {value ? <ThemedText type="smallBold">{value}</ThemedText> : null}
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </ThemedText>
      </View>
    </View>
  );
}

export function EpisodeImdbRating({
  seriesImdbId,
  seasonNumber,
  episodeNumber,
}: {
  seriesImdbId: string | null | undefined;
  seasonNumber: number;
  episodeNumber: number;
}) {
  const query = useQuery({
    queryKey: ['omdb-episode-rating', seriesImdbId, seasonNumber, episodeNumber],
    queryFn: () => getOmdbEpisodeRating(seriesImdbId!, seasonNumber, episodeNumber),
    enabled: !!seriesImdbId && seasonNumber > 0,
  });

  if (!query.data) return null;
  return <RatingTile badge={<ImdbBadge />} value={`${query.data}/10`} label="Note de l'épisode" />;
}

export function TitleRatings({ imdbId }: { imdbId: string | null | undefined }) {
  const { width: screenWidth } = useWindowDimensions();
  const tileWidth = (screenWidth - Spacing.three * 2 - Spacing.two * 2) / 3;
  const query = useQuery({
    queryKey: ['omdb-ratings', imdbId],
    queryFn: async () => omdbRatings(await getOmdbByImdbId(imdbId!)),
    enabled: !!imdbId,
  });

  if (!query.data) return null;

  const imdb = query.data.imdb;
  const tomatometer = query.data.tomatometer ? parseInt(query.data.tomatometer, 10) : null;
  const metascore = query.data.metascore ? parseInt(query.data.metascore, 10) : null;

  const hasTomatometer = tomatometer != null && !Number.isNaN(tomatometer);
  const hasMetascore = metascore != null && !Number.isNaN(metascore);

  if (!imdb && !hasTomatometer && !hasMetascore) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Avis</ThemedText>
      <View style={styles.row}>
        {imdb && <RatingTile width={tileWidth} badge={<ImdbBadge />} value={`${imdb}/10`} label="IMDb" />}
        {hasTomatometer && (
          <RatingTile width={tileWidth} badge={<TomatoBadge percent={tomatometer} />} value={`${tomatometer}%`} label="Tomatomètre" />
        )}
        {hasMetascore && <RatingTile width={tileWidth} badge={<MetascoreBadge score={metascore} />} label="Metascore" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.two },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    paddingTop: Spacing.two + 4,
    paddingBottom: Spacing.two + 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  badgeSlot: { height: 28, alignItems: 'center', justifyContent: 'center' },
  tileText: { alignItems: 'center' },
  imdbBadge: {
    paddingHorizontal: Spacing.one + 2,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  imdbBadgeText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: -0.5 },
  tomatoWrap: { width: 26, height: 26, alignItems: 'center', justifyContent: 'flex-end' },
  tomatoBody: { width: 24, height: 22, borderRadius: 12 },
  tomatoStem: { position: 'absolute', top: 0, width: 8, height: 7, borderRadius: 2, zIndex: 1 },
  metaBadge: {
    width: 28,
    height: 28,
    borderRadius: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaBadgeText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
