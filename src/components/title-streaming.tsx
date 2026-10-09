import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  getShowByTmdbId,
  summarizeStreaming,
  type StreamingOffer,
  type StreamingOptionType,
} from '@/api/streaming-availability';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

const OFFER_GROUPS: { title: string; types: StreamingOptionType[] }[] = [
  { title: "Inclus dans l'abonnement", types: ['subscription'] },
  { title: 'Gratuit', types: ['free'] },
  { title: 'Avec une option payante', types: ['addon'] },
  { title: 'Location', types: ['rent'] },
  { title: 'Achat', types: ['buy'] },
];

function OfferTile({ offer, width }: { offer: StreamingOffer; width: number }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = scheme === 'dark' ? offer.logoDark : offer.logoLight;
  const showLogo = logo != null && !logoFailed;

  return (
    <Pressable
      onPress={() => Linking.openURL(offer.link)}
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
            {offer.serviceName}
          </ThemedText>
        )}
      </View>
      {offer.priceLabel && (
        <ThemedText type="small" themeColor="textSecondary">
          {offer.priceLabel}
        </ThemedText>
      )}
    </Pressable>
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
          <ThemedText type="small">{shortLanguages(audioLanguages, true)}</ThemedText>
        </View>
      )}
      {subtitleLanguages.length > 0 && (
        <View style={styles.languagesItem}>
          <Ionicons name="chatbox-ellipses-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="small">{shortLanguages(subtitleLanguages, false)}</ThemedText>
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

export function TitleStreaming({ mediaType, tmdbId }: { mediaType: 'movie' | 'tv'; tmdbId: number }) {
  const { width: screenWidth } = useWindowDimensions();
  const tileWidth = (screenWidth - Spacing.three * 2 - Spacing.two * 2) / 3;
  const summary = useStreamingSummary(mediaType, tmdbId);

  if (!summary || summary.offers.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Où regarder</ThemedText>
      {OFFER_GROUPS.map((group) => {
        const offers = summary.offers.filter((offer) => group.types.includes(offer.type));
        if (offers.length === 0) return null;
        return (
          <View key={group.title} style={styles.offerGroup}>
            <ThemedText type="small" themeColor="textSecondary">
              {group.title}
            </ThemedText>
            <View style={styles.offerRow}>
              {offers.map((offer) => (
                <OfferTile key={offer.key} offer={offer} width={tileWidth} />
              ))}
            </View>
          </View>
        );
      })}
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
  languagesLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: Spacing.two, rowGap: Spacing.half, marginTop: Spacing.half },
  languagesItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  languagesDetails: { gap: Spacing.one, paddingHorizontal: Spacing.three },
  languagesDetailRow: { flexDirection: 'row', gap: Spacing.two },
  languagesDetailLabel: { width: 84 },
  languagesDetailValue: { flex: 1 },
});
