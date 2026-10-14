import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ListNameModal({
  visible,
  title,
  initialValue = '',
  confirmLabel,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  title: string;
  initialValue?: string;
  confirmLabel: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState(initialValue);

  useEffect(() => {
    if (visible) setName(initialValue);
  }, [visible, initialValue]);

  const trimmed = name.trim();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">{title}</ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nom de la liste"
            placeholderTextColor={theme.textSecondary}
            autoFocus
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={() => trimmed && onSubmit(trimmed)}
            style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
          />
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.button, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small">Annuler</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => trimmed && onSubmit(trimmed)}
              style={[styles.button, { backgroundColor: theme.text, opacity: trimmed ? 1 : 0.4 }]}>
              <ThemedText type="small" style={{ color: theme.background }}>
                {confirmLabel}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.four },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.three },
  input: { borderRadius: Spacing.two, padding: Spacing.three, fontSize: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two },
  button: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Spacing.two },
});
