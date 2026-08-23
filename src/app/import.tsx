import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tmdbImageUrl } from '@/api/tmdb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { extractCandidates } from '@/import/extract';
import { findTmdbMatches } from '@/import/match';
import { pickAndParseZip } from '@/import/parse';
import type { ParsedCsvFile, ReviewEntry } from '@/import/types';
import { importMovie, importShow } from '@/repository/import';
import { recordImportFailure } from '@/repository/import-failures';
import { useTheme } from '@/hooks/use-theme';

type Step = 'idle' | 'files-picked' | 'matching' | 'review' | 'importing' | 'done';

export default function ImportScreen() {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('idle');
  const [files, setFiles] = useState<ParsedCsvFile[]>([]);
  const [ignoredCount, setIgnoredCount] = useState(0);
  const [emptyNameRows, setEmptyNameRows] = useState(0);
  const [entries, setEntries] = useState<ReviewEntry[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({ shows: 0, movies: 0, episodes: 0 });
  const [notImported, setNotImported] = useState<string[]>([]);

  const handlePickZip = async () => {
    setError(null);
    try {
      const result = await pickAndParseZip();
      if (!result) return;
      setFiles(result.files);
      setIgnoredCount(result.ignoredCount);
      setStep('files-picked');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de lecture du fichier zip.');
    }
  };

  const handleStartMatching = async () => {
    setStep('matching');
    setError(null);
    const { candidates, stats } = extractCandidates(files);
    setEmptyNameRows(stats.emptyNameRows);
    setProgress({ done: 0, total: candidates.length });

    const results: ReviewEntry[] = [];
    for (const candidate of candidates) {
      try {
        const options = await findTmdbMatches(candidate);
        results.push({
          reviewKey: `${candidate.kind}-${candidate.key}`,
          candidate,
          options,
          selectedTmdbId: options[0]?.score >= 0.3 ? options[0].tmdbId : null,
          skipped: options.length === 0,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur TMDB pendant la recherche de correspondances.');
        return;
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setEntries(results);
    setStep('review');
  };

  const cycleOption = (reviewKey: string) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.reviewKey !== reviewKey || entry.options.length === 0) return entry;
        const currentIndex = entry.options.findIndex((o) => o.tmdbId === entry.selectedTmdbId);
        const nextIndex = (currentIndex + 1) % entry.options.length;
        return { ...entry, selectedTmdbId: entry.options[nextIndex].tmdbId };
      }),
    );
  };

  const toggleSkip = (reviewKey: string) => {
    setEntries((prev) => prev.map((entry) => (entry.reviewKey === reviewKey ? { ...entry, skipped: !entry.skipped } : entry)));
  };

  const handleImport = async () => {
    setStep('importing');
    setError(null);
    const toImport = entries.filter((e) => !e.skipped && e.selectedTmdbId != null);
    const failedCandidates = entries
      .filter((e) => e.skipped || e.selectedTmdbId == null)
      .map((e) => e.candidate);
    setProgress({ done: 0, total: toImport.length });

    let shows = 0;
    let movies = 0;
    let episodes = 0;

    for (const entry of toImport) {
      try {
        if (entry.candidate.kind === 'tv') {
          const result = await importShow(entry.selectedTmdbId!, entry.candidate);
          shows++;
          episodes += result.matchedEpisodes;
        } else {
          await importMovie(entry.selectedTmdbId!, entry.candidate);
          movies++;
        }
      } catch {
        failedCandidates.push(entry.candidate);
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    for (const candidate of failedCandidates) {
      await recordImportFailure(candidate);
    }

    setSummary({ shows, movies, episodes });
    setNotImported(failedCandidates.map((c) => c.displayName).sort((a, b) => a.localeCompare(b)));
    setStep('done');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {step === 'idle' && (
          <View style={styles.centerBlock}>
            <ThemedText type="subtitle">Import TV Time</ThemedText>
            <ThemedText themeColor="textSecondary">
              Sélectionne le fichier .zip de ton export TV Time (ex. gdpr-data.zip), déjà transféré sur ce téléphone.
              Seuls les fichiers utiles sont lus (visionnages, suivi, statuts) — le reste est ignoré.
            </ThemedText>
            <Pressable style={[styles.primaryButton, { backgroundColor: theme.text }]} onPress={handlePickZip}>
              <ThemedText style={{ color: theme.background }}>Choisir le fichier .zip</ThemedText>
            </Pressable>
          </View>
        )}

        {step === 'files-picked' && (
          <View style={styles.centerBlock}>
            <ThemedText type="subtitle">Contenu du zip</ThemedText>
            {files.map((f) => (
              <ThemedText key={f.fileName} type="small" themeColor="textSecondary">
                ✓ {f.fileName} ({f.rows.length} lignes)
              </ThemedText>
            ))}
            {files.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Aucun fichier reconnu dans ce zip.
              </ThemedText>
            )}
            {ignoredCount > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {ignoredCount} autre(s) fichier(s) du zip ignoré(s) (hors périmètre).
              </ThemedText>
            )}
            {files.length > 0 && (
              <Pressable style={[styles.primaryButton, { backgroundColor: theme.text }]} onPress={handleStartMatching}>
                <ThemedText style={{ color: theme.background }}>Rechercher les correspondances TMDB</ThemedText>
              </Pressable>
            )}
          </View>
        )}

        {step === 'matching' && (
          <View style={styles.centerBlock}>
            <ActivityIndicator />
            <ThemedText themeColor="textSecondary">
              Recherche TMDB… {progress.done}/{progress.total}
            </ThemedText>
          </View>
        )}

        {step === 'review' && (
          <>
            <ThemedText type="subtitle" style={styles.reviewTitle}>
              Revue des correspondances ({entries.filter((e) => !e.skipped && e.selectedTmdbId != null).length}/{entries.length}{' '}
              confirmées)
            </ThemedText>
            <FlatList
              style={styles.list}
              data={entries}
              keyExtractor={(e) => e.reviewKey}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const selected = item.options.find((o) => o.tmdbId === item.selectedTmdbId);
                const poster = selected ? tmdbImageUrl(selected.posterPath, 'w185') : null;
                const notFound = item.options.length === 0;
                return (
                  <View
                    style={[
                      styles.reviewRow,
                      { backgroundColor: theme.backgroundElement, opacity: item.skipped ? 0.5 : 1 },
                      notFound && styles.reviewRowNotFound,
                    ]}>
                    {poster ? (
                      <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
                    ) : (
                      <View style={[styles.poster, { backgroundColor: theme.backgroundSelected }]} />
                    )}
                    <View style={styles.reviewText}>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {item.candidate.displayName}
                      </ThemedText>
                      <ThemedText numberOfLines={1}>
                        {selected ? `→ ${selected.name} (${selected.year || '?'})` : 'Aucune correspondance trouvée'}
                      </ThemedText>
                    </View>
                    {item.options.length > 1 && !item.skipped && (
                      <Pressable onPress={() => cycleOption(item.reviewKey)} style={styles.smallButton}>
                        <ThemedText type="small">Changer</ThemedText>
                      </Pressable>
                    )}
                    {item.options.length > 0 && (
                      <Pressable onPress={() => toggleSkip(item.reviewKey)} style={styles.smallButton}>
                        <ThemedText type="small">{item.skipped ? 'Inclure' : 'Ignorer'}</ThemedText>
                      </Pressable>
                    )}
                  </View>
                );
              }}
            />
            <Pressable style={[styles.primaryButton, { backgroundColor: theme.text }]} onPress={handleImport}>
              <ThemedText style={{ color: theme.background }}>
                Importer {entries.filter((e) => !e.skipped && e.selectedTmdbId != null).length} éléments
              </ThemedText>
            </Pressable>
          </>
        )}

        {step === 'importing' && (
          <View style={styles.centerBlock}>
            <ActivityIndicator />
            <ThemedText themeColor="textSecondary">
              Import en cours… {progress.done}/{progress.total}
            </ThemedText>
          </View>
        )}

        {step === 'done' && (
          <View style={styles.doneBlock}>
            <ThemedText type="subtitle">Import terminé</ThemedText>
            <ThemedText themeColor="textSecondary">
              {summary.shows} séries, {summary.movies} films, {summary.episodes} épisodes marqués vus.
            </ThemedText>
            {emptyNameRows > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {emptyNameRows} ligne(s) du zip sans nom exploitable, ignorée(s) avant même la recherche TMDB.
              </ThemedText>
            )}

            {notImported.length > 0 && (
              <>
                <ThemedText type="smallBold" style={styles.notFoundTitle}>
                  Non importés ({notImported.length}) — aucune correspondance TMDB trouvée ou ignorés :
                </ThemedText>
                <FlatList
                  style={styles.list}
                  data={notImported}
                  keyExtractor={(name, index) => `${name}-${index}`}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item}
                    </ThemedText>
                  )}
                />
              </>
            )}

            <Pressable style={[styles.primaryButton, { backgroundColor: theme.text }]} onPress={() => router.replace('/(tabs)/library')}>
              <ThemedText style={{ color: theme.background }}>Voir la bibliothèque</ThemedText>
            </Pressable>
          </View>
        )}

        {error && (
          <ThemedText themeColor="text" style={styles.error}>
            {error}
          </ThemedText>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  centerBlock: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  doneBlock: { flex: 1, gap: Spacing.three, paddingTop: Spacing.four },
  reviewTitle: { marginBottom: Spacing.one },
  notFoundTitle: { marginTop: Spacing.one },
  list: { flex: 1 },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.three },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Spacing.two, padding: Spacing.two },
  reviewRowNotFound: { borderWidth: 1, borderColor: '#E5484D' },
  poster: { width: 40, height: 60, borderRadius: Spacing.one },
  reviewText: { flex: 1, gap: Spacing.half },
  smallButton: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  primaryButton: { paddingVertical: Spacing.two + 2, borderRadius: Spacing.two, alignItems: 'center' },
  error: { color: '#E5484D' },
});
