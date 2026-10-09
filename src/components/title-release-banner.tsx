import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { preReleaseLabel } from '@/constants/release-status';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function TitleReleaseBanner({
  status,
  releaseDate,
  networks,
  creators,
  companies,
}: {
  status: string | undefined;
  releaseDate: string | null | undefined;
  networks: string[];
  creators: string[];
  companies: string[];
}) {
  const theme = useTheme();
  const label = preReleaseLabel(status);
  if (!label) return null;

  const dateLine = releaseDate ? `Sortie prévue le ${formatDate(releaseDate)}` : 'Pas encore de date de sortie annoncée';
  const details = [
    networks.length > 0 ? { label: 'Diffusion', value: networks.join(', ') } : null,
    creators.length > 0 ? { label: 'Créé par', value: creators.join(', ') } : null,
    companies.length > 0 ? { label: 'Production', value: companies.join(', ') } : null,
  ].filter((detail): detail is { label: string; value: string } => detail != null);

  return (
    <View style={[styles.banner, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.header}>
        <Ionicons name="time-outline" size={22} color={theme.textSecondary} />
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {dateLine}
          </ThemedText>
        </View>
      </View>
      {details.map((detail) => (
        <View key={detail.label} style={styles.detailRow}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.detailLabel}>
            {detail.label}
          </ThemedText>
          <ThemedText type="small" style={styles.detailValue}>
            {detail.value}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: Spacing.three, padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headerText: { flex: 1 },
  detailRow: { flexDirection: 'row', gap: Spacing.two },
  detailLabel: { width: 84 },
  detailValue: { flex: 1 },
});
