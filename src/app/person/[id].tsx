import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ageFrom,
  buildAboutRows,
  buildFilmography,
  buildKnownFor,
  creditsForShow,
  jobLabel,
  formatPersonDate,
  type FilmographyEntry,
  type FilmographyGroup,
} from '@/api/person-credits';
import { getCreditDetails, getPersonBiographyEnglish, getPersonDetails, tmdbImageUrl } from '@/api/tmdb';
import type { TmdbPersonCredit, TmdbPersonDetails } from '@/api/tmdb-types';
import { getPersonWikidataProfile } from '@/api/wikidata';
import { getWikipediaIntro } from '@/api/wikipedia';
import { CreditSheet } from '@/components/credit-sheet';
import { AboutBlock, AwardsBlock, FamilyBlock } from '@/components/person-about';
import { PhotoViewer } from '@/components/photo-viewer';
import { Synopsis } from '@/components/synopsis';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const GROUP_PREVIEW_COUNT = 8;

function roleNoteFor(personName: string, roleLabel: string) {
  return `${personName} : ${roleLabel}`;
}

function openEpisode(showId: number, seasonNumber: number, episodeNumber: number, roleNote: string) {
  router.push({
    pathname: '/title/[id]',
    params: { id: `tv-${showId}`, episode: `${seasonNumber}-${episodeNumber}`, role: roleNote },
  });
}

async function openCredit(
  entry: FilmographyEntry,
  credits: TmdbPersonCredit[],
  personName: string,
  openSheet: (entry: FilmographyEntry) => void,
) {
  if (entry.mediaType === 'movie') {
    router.push(`/title/movie-${entry.id}`);
    return;
  }

  if (credits.length === 1) {
    try {
      const details = await getCreditDetails(credits[0].credit_id);
      const episodes = details.media.episodes ?? [];
      if (episodes.length === 1) {
        const credit = credits[0];
        const roleLabel =
          credit.character !== undefined ? credit.character.trim() || 'Acteur' : jobLabel(credit.job);
        openEpisode(entry.id, episodes[0].season_number, episodes[0].episode_number, roleNoteFor(personName, roleLabel));
        return;
      }
    } catch {
      openSheet(entry);
      return;
    }
  }

  openSheet(entry);
}

type SocialLink = { key: string; icon: ComponentProps<typeof Ionicons>['name']; url: string };

function buildSocialLinks(ids: TmdbPersonDetails['external_ids']): SocialLink[] {
  if (!ids) return [];
  const links: (SocialLink | null)[] = [
    ids.instagram_id ? { key: 'instagram', icon: 'logo-instagram', url: `https://www.instagram.com/${ids.instagram_id}` } : null,
    ids.twitter_id ? { key: 'x', icon: 'logo-twitter', url: `https://x.com/${ids.twitter_id}` } : null,
    ids.facebook_id ? { key: 'facebook', icon: 'logo-facebook', url: `https://www.facebook.com/${ids.facebook_id}` } : null,
    ids.tiktok_id ? { key: 'tiktok', icon: 'logo-tiktok', url: `https://www.tiktok.com/@${ids.tiktok_id}` } : null,
    ids.youtube_id ? { key: 'youtube', icon: 'logo-youtube', url: `https://www.youtube.com/${ids.youtube_id}` } : null,
  ];
  return links.filter((link): link is SocialLink => link != null);
}

function FilmographyRow({ entry, onOpen }: { entry: FilmographyEntry; onOpen: (entry: FilmographyEntry) => void }) {
  const theme = useTheme();
  const poster = tmdbImageUrl(entry.posterPath, 'w185');
  const details = [
    entry.year ?? 'Date inconnue',
    entry.role,
    entry.mediaType === 'tv' && entry.episodeCount ? `${entry.episodeCount} épisode${entry.episodeCount > 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable onPress={() => onOpen(entry)} style={[styles.creditRow, { backgroundColor: theme.backgroundElement }]}>
      {poster ? (
        <Image source={{ uri: poster }} style={styles.creditPoster} contentFit="cover" />
      ) : (
        <View style={[styles.creditPoster, { backgroundColor: theme.backgroundSelected }]} />
      )}
      <View style={styles.creditText}>
        <ThemedText numberOfLines={2}>{entry.title}</ThemedText>
        {details ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {details}
          </ThemedText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

function FilmographyGroupSection({
  group,
  onOpen,
}: {
  group: FilmographyGroup;
  onOpen: (entry: FilmographyEntry) => void;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? group.entries : group.entries.slice(0, GROUP_PREVIEW_COUNT);
  const hiddenCount = group.entries.length - visible.length;

  return (
    <View style={styles.group}>
      <ThemedText type="smallBold">
        {group.label} ({group.entries.length})
      </ThemedText>
      {visible.map((entry) => (
        <FilmographyRow key={entry.key} entry={entry} onOpen={onOpen} />
      ))}
      {group.entries.length > GROUP_PREVIEW_COUNT && (
        <Pressable onPress={() => setExpanded((value) => !value)} style={styles.toggleRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {expanded ? 'Voir moins' : `Voir les ${hiddenCount} autres`}
          </ThemedText>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Number(id);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [viewer, setViewer] = useState<{ photos: string[]; index: number } | null>(null);
  const [sheetEntry, setSheetEntry] = useState<FilmographyEntry | null>(null);

  const personQuery = useQuery({
    queryKey: ['tmdb-person', personId],
    queryFn: () => getPersonDetails(personId),
  });

  const wikidataId = personQuery.data?.external_ids?.wikidata_id;
  const wikidataQuery = useQuery({
    queryKey: ['wikidata-person', wikidataId],
    queryFn: () => getPersonWikidataProfile(wikidataId!),
    enabled: !!wikidataId,
  });

  const wikipediaTitle = wikidataQuery.data?.wikipediaTitles.fr ?? null;
  const wikipediaQuery = useQuery({
    queryKey: ['wikipedia-fr', wikipediaTitle],
    queryFn: () => getWikipediaIntro('fr', wikipediaTitle!),
    enabled: !!wikipediaTitle,
  });

  const tmdbFrenchBiography = personQuery.data?.biography?.trim() ?? '';
  const wikipediaIntro = wikipediaQuery.data ?? null;
  const wikipediaSettled = !wikipediaTitle || wikipediaQuery.isFetched;
  const useWikipedia = !!wikipediaIntro && wikipediaIntro.text.length > tmdbFrenchBiography.length;
  const frenchBiography = useWikipedia ? wikipediaIntro!.text : tmdbFrenchBiography;

  const englishBiographyQuery = useQuery({
    queryKey: ['tmdb-person-biography-en', personId],
    queryFn: () => getPersonBiographyEnglish(personId),
    enabled: personQuery.data != null && frenchBiography === '' && wikipediaSettled,
  });
  const englishBiography = englishBiographyQuery.data?.biography?.trim() ?? '';

  const backButton = (
    <Pressable
      onPress={() => router.back()}
      style={[styles.floatingIconButton, { top: insets.top + Spacing.two }]}
      hitSlop={12}>
      <Ionicons name="chevron-back" size={22} color="#fff" />
    </Pressable>
  );

  if (personQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
          {backButton}
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        </View>
      </>
    );
  }

  if (personQuery.error || !personQuery.data) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
          {backButton}
          <View style={styles.center}>
            <ThemedText>Impossible de charger cette personne.</ThemedText>
            <Pressable
              onPress={() => personQuery.refetch()}
              style={[styles.retryButton, { backgroundColor: theme.text }]}>
              <ThemedText style={{ color: theme.background }}>Réessayer</ThemedText>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  const person = personQuery.data;
  const handleOpen = (entry: FilmographyEntry) =>
    openCredit(entry, creditsForShow(person, entry.mediaType, entry.id), person.name, setSheetEntry);
  const profile = tmdbImageUrl(person.profile_path, 'w342');
  const knownFor = buildKnownFor(person);
  const socialLinks = buildSocialLinks(person.external_ids);
  const filmography = buildFilmography(person);
  const photos = person.images?.profiles ?? [];
  const taggedPhotos = (person.tagged_images?.results ?? []).filter((image) => image.aspect_ratio > 1).slice(0, 20);
  const wikidata = wikidataQuery.data;

  const birthLine = person.birthday
    ? `${formatPersonDate(person.birthday)}${
        person.deathday ? ` - ${formatPersonDate(person.deathday)}` : ` (${ageFrom(person.birthday, null)} ans)`
      }`
    : null;
  const heightLine = wikidata?.heightMeters ? `${wikidata.heightMeters.toFixed(2).replace('.', ',')} m` : null;
  const aboutRows = buildAboutRows(person, wikidata, wikipediaIntro?.url ?? null);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
        {backButton}
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing.six }]}>
          <View style={styles.headerRow}>
            {profile ? (
              <Image source={{ uri: profile }} style={styles.profile} contentFit="cover" />
            ) : (
              <View style={[styles.profile, { backgroundColor: theme.backgroundSelected }]} />
            )}
            <View style={styles.headerText}>
              <ThemedText type="subtitle">{person.name}</ThemedText>
              {birthLine && (
                <ThemedText type="small" themeColor="textSecondary">
                  {birthLine}
                </ThemedText>
              )}
              {person.place_of_birth && (
                <ThemedText type="small" themeColor="textSecondary">
                  {person.place_of_birth}
                </ThemedText>
              )}
              {heightLine && (
                <ThemedText type="small" themeColor="textSecondary">
                  Taille : {heightLine}
                </ThemedText>
              )}
            </View>
          </View>

          {socialLinks.length > 0 && (
            <View style={styles.socialRow}>
              {socialLinks.map((link) => (
                <Pressable
                  key={link.key}
                  onPress={() => Linking.openURL(link.url)}
                  hitSlop={6}
                  style={[styles.socialButton, { backgroundColor: theme.backgroundElement }]}>
                  <Ionicons name={link.icon} size={22} color={theme.text} />
                </Pressable>
              ))}
            </View>
          )}

          {knownFor.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold">Connu pour</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {knownFor.map((entry) => {
                  const poster = tmdbImageUrl(entry.posterPath, 'w185');
                  return (
                    <Pressable key={entry.key} style={styles.knownForItem} onPress={() => handleOpen(entry)}>
                      {poster ? (
                        <Image source={{ uri: poster }} style={styles.knownForPoster} contentFit="cover" />
                      ) : (
                        <View style={[styles.knownForPoster, { backgroundColor: theme.backgroundSelected }]} />
                      )}
                      <ThemedText type="small" numberOfLines={2} style={styles.centered}>
                        {entry.title}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {frenchBiography ? (
            <View style={styles.biographyBlock}>
              <Synopsis text={frenchBiography} />
              {useWikipedia && wikipediaIntro && (
                <Pressable onPress={() => Linking.openURL(wikipediaIntro.url)} style={styles.biographyNote}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Source : Wikipédia (licence CC BY-SA)
                  </ThemedText>
                </Pressable>
              )}
            </View>
          ) : englishBiography ? (
            <View style={styles.biographyBlock}>
              <Synopsis text={englishBiography} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.biographyNote}>
                Biographie en anglais : aucune version française n'existe.
              </ThemedText>
            </View>
          ) : null}

          <AboutBlock rows={aboutRows} />

          {photos.length > 1 && (
            <View style={styles.section}>
              <ThemedText type="smallBold">Photos ({photos.length})</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {photos.map((photo, index) => (
                  <Pressable key={photo.file_path} onPress={() => setViewer({ photos: photos.map((item) => item.file_path), index })}>
                    <Image
                      source={{ uri: tmdbImageUrl(photo.file_path, 'w185') ?? undefined }}
                      style={styles.photo}
                      contentFit="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {taggedPhotos.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold">Images de films et de séries ({taggedPhotos.length})</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {taggedPhotos.map((photo, index) => (
                  <Pressable
                    key={photo.file_path}
                    onPress={() => setViewer({ photos: taggedPhotos.map((item) => item.file_path), index })}>
                    <Image
                      source={{ uri: tmdbImageUrl(photo.file_path, 'w342') ?? undefined }}
                      style={styles.taggedPhoto}
                      contentFit="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {wikidata && <FamilyBlock family={wikidata.family} />}
          {wikidata && <AwardsBlock title="Récompenses" awards={wikidata.awards} />}
          {wikidata && <AwardsBlock title="Nominations" awards={wikidata.nominations} />}

          {filmography.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold">Filmographie</ThemedText>
              {filmography.map((group) => (
                <FilmographyGroupSection key={group.department} group={group} onOpen={handleOpen} />
              ))}
            </View>
          )}
        </ScrollView>

        <CreditSheet
          entry={sheetEntry}
          credits={sheetEntry ? creditsForShow(person, sheetEntry.mediaType, sheetEntry.id) : []}
          onClose={() => setSheetEntry(null)}
          onOpenSeries={() => {
            const target = sheetEntry;
            setSheetEntry(null);
            if (target) router.push(`/title/tv-${target.id}`);
          }}
          onOpenEpisode={(seasonNumber, episodeNumber, roleLabel) => {
            const target = sheetEntry;
            setSheetEntry(null);
            if (target) openEpisode(target.id, seasonNumber, episodeNumber, roleNoteFor(person.name, roleLabel));
          }}
        />

        <PhotoViewer
          photos={viewer?.photos ?? []}
          initialIndex={viewer?.index ?? null}
          onClose={() => setViewer(null)}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  retryButton: { paddingVertical: Spacing.two + 2, paddingHorizontal: Spacing.four, borderRadius: Spacing.two },
  floatingIconButton: {
    position: 'absolute',
    left: Spacing.three,
    zIndex: 10,
    padding: Spacing.two,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 17, 17, 0.45)',
  },
  scroll: { paddingBottom: Spacing.six, gap: Spacing.four },
  headerRow: { flexDirection: 'row', gap: Spacing.three, paddingHorizontal: Spacing.three },
  profile: { width: 110, height: 165, borderRadius: Spacing.two },
  headerText: { flex: 1, justifyContent: 'flex-end', gap: Spacing.half },
  socialRow: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three },
  socialButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  biographyBlock: { gap: Spacing.one },
  biographyNote: { paddingHorizontal: Spacing.three },
  section: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  row: { gap: Spacing.two, paddingVertical: Spacing.one },
  knownForItem: { width: 100, gap: Spacing.one },
  knownForPoster: { width: 100, height: 150, borderRadius: Spacing.two },
  centered: { textAlign: 'center' },
  photo: { width: 100, height: 150, borderRadius: Spacing.two },
  taggedPhoto: { width: 180, height: 101, borderRadius: Spacing.two },
  infoBlock: { gap: Spacing.one, marginBottom: Spacing.two },
  infoRow: { flexDirection: 'row', gap: Spacing.two },
  infoLabel: { width: 96 },
  infoValue: { flex: 1 },
  group: { gap: Spacing.one, marginTop: Spacing.two },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  creditPoster: { width: 40, height: 60, borderRadius: Spacing.one },
  creditText: { flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one, paddingVertical: Spacing.two },
});
