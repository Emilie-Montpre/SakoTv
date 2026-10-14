import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListNameModal } from '@/components/list-name-modal';
import { ListPreview } from '@/components/list-preview';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createCustomList,
  deleteCustomList,
  listCustomLists,
  renameCustomList,
  type CustomListSummary,
} from '@/repository/custom-lists';

export default function ListsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<CustomListSummary | null>(null);

  const { data } = useQuery({ queryKey: ['custom-lists'], queryFn: listCustomLists });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
    }, [queryClient]),
  );

  const lists = data ?? [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    queryClient.invalidateQueries({ queryKey: ['stats-list'] });
  };

  const handleCreate = async (name: string) => {
    await createCustomList(name);
    setCreating(false);
    refresh();
  };

  const handleRename = async (name: string) => {
    if (!renaming) return;
    await renameCustomList(renaming.id, name);
    setRenaming(null);
    refresh();
  };

  const confirmDelete = (list: CustomListSummary) => {
    Alert.alert(`Supprimer "${list.name}" ?`, 'Les titres ne sont pas supprimés, seulement la liste.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomList(list.id);
          refresh();
        },
      },
    ]);
  };

  const openActions = (list: CustomListSummary) => {
    Alert.alert(list.name, undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Renommer', onPress: () => setRenaming(list) },
      { text: 'Supprimer', style: 'destructive', onPress: () => confirmDelete(list) },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </Pressable>
            <ThemedText type="subtitle">Mes listes{data ? ` (${lists.length})` : ''}</ThemedText>
          </View>

          {data && lists.length === 0 && (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Aucune liste pour l'instant. Crée-en une, puis ajoute des titres depuis leur fiche avec le menu en haut à
              droite.
            </ThemedText>
          )}

          <FlatList
            style={styles.list}
            data={lists}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              <Pressable onPress={() => setCreating(true)} style={[styles.newList, { borderColor: theme.textSecondary }]}>
                <Ionicons name="add" size={20} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  Nouvelle liste
                </ThemedText>
              </Pressable>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.row, { backgroundColor: theme.backgroundElement }]}
                onPress={() => router.push({ pathname: '/list/[kind]', params: { kind: `custom-${item.id}` } })}
                onLongPress={() => openActions(item)}>
                <ListPreview posters={item.posters} count={item.count} />
                <View style={styles.rowText}>
                  <ThemedText numberOfLines={1}>{item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.count === 0 ? 'Aucun titre' : `${item.count} titre${item.count > 1 ? 's' : ''}`}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </Pressable>
            )}
          />
        </SafeAreaView>
      </ThemedView>

      <ListNameModal
        visible={creating}
        title="Nouvelle liste"
        confirmLabel="Créer"
        onSubmit={handleCreate}
        onClose={() => setCreating(false)}
      />
      <ListNameModal
        visible={renaming != null}
        title="Renommer la liste"
        initialValue={renaming?.name ?? ''}
        confirmLabel="Renommer"
        onSubmit={handleRename}
        onClose={() => setRenaming(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  empty: { textAlign: 'center', marginTop: Spacing.four },
  list: { flex: 1 },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.six },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    alignItems: 'center',
  },
  rowText: { flex: 1, gap: Spacing.half },
  newList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
