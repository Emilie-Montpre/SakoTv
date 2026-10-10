import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { readQuota } from '@/api/persistent-cache';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function barColor(ratio: number) {
  if (ratio >= 0.9) return '#E5484D';
  if (ratio >= 0.7) return '#F5A524';
  return '#22C55E';
}

export function StreamingQuotaCard() {
  const theme = useTheme();
  const query = useQuery({
    queryKey: ['streaming-quota'],
    queryFn: () => readQuota('streaming'),
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      query.refetch();
    }, [query.refetch]),
  );

  const quota = query.data ?? null;
  const ratio = quota ? quota.used / quota.granted : null;
  const resetLabel = quota?.reset
    ? new Date(quota.reset).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.header}>
        <ThemedText type="smallBold">Plateformes et langues</ThemedText>
        <ThemedText type="smallBold">{quota ? `${quota.used} / ${quota.granted}` : 'pas encore mesuré'}</ThemedText>
      </View>
      {ratio != null && (
        <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
          <View style={[styles.fill, { width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: barColor(ratio) }]} />
        </View>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        {quota
          ? `Requêtes à Streaming Availability ce mois-ci${resetLabel ? `, remise à zéro le ${resetLabel}` : ''}.`
          : "Le chiffre apparaît dès qu'une Fiche interroge Streaming Availability."}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.two },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
