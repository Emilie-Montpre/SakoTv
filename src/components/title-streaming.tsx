import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState, type ComponentProps } from 'react';
import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  getShowByTmdbId,
  getShowEpisodesByTmdbId,
  summarizeEpisodeLanguages,
  summarizeStreaming,
  type StreamingOffer,
  type StreamingOptionType,
} from '@/api/streaming-availability';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type OfferTileData = {
  key: string;
  serviceName: string;
  logoLight: string | null;
  logoDark: string | null;
  link: string;
  lines: string[];
};

const INCLUDED_GROUPS: { title: string; types: StreamingOptionType[] }[] = [
  { title: "Inclus dans l'abonnement", types: ['subscription'] },
  { title: 'Gratuit', types: ['free'] },
];

function formatPrice(label: string | null) {
  if (!label) return null;
  return label.replace('.', ',').replace(/\s*EUR$/, ' \u20AC');
}

function joinFrench(words: string[]) {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} et ${words[words.length - 1]}`;
}

function toTile(offer: StreamingOffer, lines: string[]): OfferTileData {
  return {
    key: offer.key,
    serviceName: offer.serviceName,
    logoLight: offer.logoLight,
    logoDark: offer.logoDark,
    link: offer.link,
    lines,
  };
}

function mergeRentAndBuy(offers: StreamingOffer[]): OfferTileData[] {
  const byService = new Map<string, { rent?: StreamingOffer; buy?: StreamingOffer }>();
  for (const offer of offers) {
    if (offer.type !== 'rent' && offer.type !== 'buy') continue;
    const entry = byService.get(offer.serviceName) ?? {};
    entry[offer.type] = offer;
    byService.set(offer.serviceName, entry);
  }

  return [...byService.entries()].map(([serviceName, { rent, buy }]) => {
    const lines = [
      rent ? `Loc. ${formatPrice(rent.priceLabel) ?? ''}`.trim() : null,
      buy ? `Achat ${formatPrice(buy.priceLabel) ?? ''}`.trim() : null,
    ].filter((line): line is string => line != null);
    return { ...toTile((rent ?? buy)!, lines), key: `paid-${serviceName}` };
  });
}

function OfferTile({ tile, width }: { tile: OfferTileData; width: number }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = scheme === 'dark' ? tile.logoDark : tile.logoLight;
  const showLogo = logo != null && !logoFailed;

  return (
    <Pressable
      onPress={() => Linking.openURL(tile.link)}
      style={[styles.offerTile, { width, backgroundColor: theme.backgroundElement }]}>
      <View style={styles.logoSlot}>
        {showLogo ? (
          <Image
            source={{ uri: logo }}
            style={styles.logo}
            contentFit="contain"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <ThemedText type="smallBold" numberOfLines={2} style={styles.logoFallback}>
            {tile.serviceName}
          </ThemedText>
        )}
      </View>
      {tile.lines.map((line) => (
        <ThemedText key={line} type="small" themeColor="textSecondary" style={styles.offerLine}>
          {line}
        </ThemedText>
      ))}
    </Pressable>
  );
}

function OfferGroup({ title, tiles, width }: { title: string; tiles: OfferTileData[]; width: number }) {
  if (tiles.length === 0) return null;
  return (
    <View style={styles.offerGroup}>
      <ThemedText type="small" themeColor="textSecondary">
        {title}
      </ThemedText>
      <View style={styles.offerRow}>
        {tiles.map((tile) => (
          <OfferTile key={tile.key} tile={tile} width={width} />
        ))}
      </View>
    </View>
  );
}

function useStreamingSummary(mediaType: 'movie' | 'tv', tmdbId: number) {
  return useQuery({
    queryKey: ['streaming-availability', mediaType, tmdbId],
    queryFn: async () => summarizeStreaming(await getShowByTmdbId(mediaType, tmdbId, 'fr')),
  }).data;
}

function shortLanguages(languages: string[], isAudio: boolean) {
  const french = languages.includes('Français');
  const head = french ? (isAudio ? 'VF' : 'Français') : languages[0];
  const rest = languages.length - 1;
  return rest > 0 ? `${head} +${rest}` : head;
}

export function TitleLanguagesLine({
  mediaType,
  tmdbId,
  open,
  onToggle,
}: {
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  open: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const summary = useStreamingSummary(mediaType, tmdbId);

  if (!summary) return null;
  const { audioLanguages, subtitleLanguages } = summary;
  if (audioLanguages.length === 0 && subtitleLanguages.length === 0) return null;

  return (
    <Pressable onPress={onToggle} hitSlop={8} style={styles.languagesLine}>
      {audioLanguages.length > 0 && (
        <View style={styles.languagesItem}>
          <Ionicons name="volume-medium-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">{shortLanguages(audioLanguages, true)}</ThemedText>
        </View>
      )}
      {subtitleLanguages.length > 0 && (
        <View style={styles.languagesItem}>
          <Ionicons name="chatbox-ellipses-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">{shortLanguages(subtitleLanguages, false)}</ThemedText>
        </View>
      )}
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

export function TitleLanguagesDetails({
  mediaType,
  tmdbId,
  open,
}: {
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  open: boolean;
}) {
  const summary = useStreamingSummary(mediaType, tmdbId);
  if (!open || !summary) return null;

  const rows = [
    { label: 'Audio', languages: summary.audioLanguages },
    { label: 'Sous-titres', languages: summary.subtitleLanguages },
  ].filter((row) => row.languages.length > 0);

  return (
    <View style={styles.languagesDetails}>
      {rows.map((row) => (
        <View key={row.label} style={styles.languagesDetailRow}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.languagesDetailLabel}>
            {row.label}
          </ThemedText>
          <ThemedText type="small" style={styles.languagesDetailValue}>
            {row.languages.join(', ')}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const EPISODE_LANGUAGES_PREVIEW_COUNT = 3;

function EpisodeLanguageRow({
  icon,
  label,
  items,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  items: string[];
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const expandable = items.length > EPISODE_LANGUAGES_PREVIEW_COUNT;
  const hiddenCount = items.length - EPISODE_LANGUAGES_PREVIEW_COUNT;
  const text = expanded || !expandable ? items.join(', ') : items.slice(0, EPISODE_LANGUAGES_PREVIEW_COUNT).join(', ');

  return (
    <Pressable
      disabled={!expandable}
      onPress={() => setExpanded((value) => !value)}
      style={styles.episodeLanguageRow}>
      <Ionicons name={icon} size={16} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.episodeLanguageLabel}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.languagesDetailValue}>
        {text}
        {expandable && !expanded ? (
          <ThemedText type="small" themeColor="textSecondary">{`  +${hiddenCount}`}</ThemedText>
        ) : null}
      </ThemedText>
      {expandable && (
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
      )}
    </Pressable>
  );
}

export function EpisodeLanguages({
  tmdbId,
  seasonNumber,
  episodeNumber,
  seasonEpisodeCount,
}: {
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  seasonEpisodeCount: number;
}) {
  const theme = useTheme();
  const query = useQuery({
    queryKey: ['streaming-availability-episodes', tmdbId],
    queryFn: () => getShowEpisodesByTmdbId(tmdbId, 'fr'),
    enabled: seasonNumber > 0,
  });

  if (!query.data) return null;
  const languages = summarizeEpisodeLanguages(query.data, seasonNumber, episodeNumber, seasonEpisodeCount);
  if (!languages || (languages.audioLanguages.length === 0 && languages.subtitleLanguages.length === 0)) return null;

  const rows = [
    { icon: 'volume-medium-outline' as const, label: 'Audio', items: languages.audioLanguages },
    { icon: 'chatbox-ellipses-outline' as const, label: 'Sous-titres', items: languages.subtitleLanguages },
  ].filter((row) => row.items.length > 0);

  return (
    <View style={styles.episodeLanguages}>
      {rows.map((row) => (
        <EpisodeLanguageRow key={row.label} icon={row.icon} label={row.label} items={row.items} />
      ))}
    </View>
  );
}

export function TitleStreaming({ mediaType, tmdbId }: { mediaType: 'movie' | 'tv'; tmdbId: number }) {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const tileWidth = (screenWidth - Spacing.three * 2 - Spacing.two * 2) / 3;
  const summary = useStreamingSummary(mediaType, tmdbId);
  const [paidOpen, setPaidOpen] = useState(false);

  if (!summary || summary.offers.length === 0) return null;

  const includedGroups = INCLUDED_GROUPS.map((group) => ({
    title: group.title,
    tiles: summary.offers.filter((offer) => group.types.includes(offer.type)).map((offer) => toTile(offer, [])),
  })).filter((group) => group.tiles.length > 0);
  const addonTiles = summary.offers.filter((offer) => offer.type === 'addon').map((offer) => toTile(offer, []));
  const paidTiles = mergeRentAndBuy(summary.offers);

  const hasRent = summary.offers.some((offer) => offer.type === 'rent');
  const hasBuy = summary.offers.some((offer) => offer.type === 'buy');
  const paidTitle = hasRent && hasBuy ? 'Location ou achat' : hasRent ? 'Location' : 'Achat';

  const hiddenCount = paidTiles.length + addonTiles.length;
  const hiddenKinds = [hasRent ? 'location' : null, hasBuy ? 'achat' : null, addonTiles.length > 0 ? 'options' : null].filter(
    (kind): kind is string => kind != null,
  );
  const hiddenKindsLabel = joinFrench(hiddenKinds);
  const hasIncluded = includedGroups.length > 0;
  const showPaid = hiddenCount > 0 && (!hasIncluded || paidOpen);

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Où regarder</ThemedText>
      {includedGroups.map((group) => (
        <OfferGroup key={group.title} title={group.title} tiles={group.tiles} width={tileWidth} />
      ))}

      {showPaid && (
        <>
          <OfferGroup title="Avec une option payante" tiles={addonTiles} width={tileWidth} />
          <OfferGroup title={paidTitle} tiles={paidTiles} width={tileWidth} />
        </>
      )}

      {hasIncluded && hiddenCount > 0 && (
        <Pressable onPress={() => setPaidOpen((open) => !open)} style={styles.paidToggle}>
          <ThemedText type="small" themeColor="textSecondary">
            {paidOpen
              ? `Masquer ${hiddenKindsLabel}`
              : `${hiddenKindsLabel.charAt(0).toUpperCase()}${hiddenKindsLabel.slice(1)} (${hiddenCount})`}
          </ThemedText>
          <Ionicons name={paidOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  offerGroup: { gap: Spacing.one },
  offerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  offerTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  logoSlot: { width: '100%', height: 36, alignItems: 'center', justifyContent: 'center' },
  logo: { width: '100%', height: '100%' },
  logoFallback: { textAlign: 'center' },
  offerLine: { fontSize: 12, lineHeight: 16 },
  paidToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one, paddingVertical: Spacing.two },
  languagesLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: Spacing.two, rowGap: Spacing.half, marginTop: Spacing.half },
  languagesItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  languagesDetails: { gap: Spacing.one, paddingHorizontal: Spacing.three },
  languagesDetailRow: { flexDirection: 'row', gap: Spacing.two },
  episodeLanguages: { gap: Spacing.one },
  episodeLanguageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  episodeLanguageLabel: { width: 76 },
  languagesDetailLabel: { width: 84 },
  languagesDetailValue: { flex: 1 },
});
