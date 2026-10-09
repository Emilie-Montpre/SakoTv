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

function LanguageList({ title, languages }: { title: string; languages: string[] }) {
  if (languages.length === 0) return null;
  return (
    <View style={styles.languageBlock}>
      <ThemedText type="small" themeColor="textSecondary">
        {title}
      </ThemedText>
      <ThemedText type="small">{languages.join(', ')}</ThemedText>
    </View>
  );
}

export function TitleStreaming({ mediaType, tmdbId }: { mediaType: 'movie' | 'tv'; tmdbId: number }) {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const tileWidth = (screenWidth - Spacing.three * 2 - Spacing.two * 2) / 3;
  const [languagesOpen, setLanguagesOpen] = useState(false);

  const query = useQuery({
    queryKey: ['streaming-availability', mediaType, tmdbId],
    queryFn: async () => summarizeStreaming(await getShowByTmdbId(mediaType, tmdbId, 'fr')),
  });

  const summary = query.data;
  if (!summary) return null;

  const hasLanguages = summary.audioLanguages.length > 0 || summary.subtitleLanguages.length > 0;
  if (summary.offers.length === 0 && !hasLanguages) return null;

  return (
    <>
      {summary.offers.length > 0 && (
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
      )}

      {hasLanguages && (
        <View style={styles.section}>
          <Pressable onPress={() => setLanguagesOpen((open) => !open)} style={styles.languagesHeader}>
            <ThemedText type="smallBold">Langues disponibles en France</ThemedText>
            <Ionicons name={languagesOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
          </Pressable>
          {languagesOpen && (
            <View style={[styles.languagesBody, { backgroundColor: theme.backgroundElement }]}>
              <LanguageList title="Doublage" languages={summary.audioLanguages} />
              <LanguageList title="Sous-titres" languages={summary.subtitleLanguages} />
            </View>
          )}
        </View>
      )}
    </>
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
  languagesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  languagesBody: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.two },
  languageBlock: { gap: Spacing.half },
});
