import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ConfirmationPopup, type ConfirmationPreview } from '@/components/confirmation-popup';
import { ListNameModal } from '@/components/list-name-modal';
import { ListPreview } from '@/components/list-preview';
import { OVERLAY_CONTENT_TOP_PADDING, OverlayPage } from '@/components/overlay-page';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addTitleToList,
  createCustomList,
  getListIdsForTitle,
  LIST_PREVIEW_POSTERS,
  listCustomLists,
  toggleTitleInList,
} from '@/repository/custom-lists';

const ACCENT_COLOR = '#3B82F6';
const MAX_NAMED_LISTS = 3;

function formatListNames(names: string[]) {
  if (names.length > MAX_NAMED_LISTS) return `${names.length} listes`;
  return names.map((name) => `« ${name} »`).join(', ');
}

function buildSummary(titleName: string, added: string[], removed: string[]) {
  const lines = [
    added.length > 0 ? `« ${titleName} » est enregistré dans ${formatListNames(added)}` : null,
    removed.length > 0 ? `« ${titleName} » est retiré de ${formatListNames(removed)}` : null,
  ].filter((line): line is string => line != null);
  return lines.length > 0 ? lines.join('\n') : null;
}


export function AddToListSheet({
  visible,
  titleId,
  titleName,
  titlePosterPath,
  onClose,
}: {
  visible: boolean;
  titleId: number;
  titleName: string;
  titlePosterPath: string | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [confirmation, setConfirmation] = useState<{ message: string; preview: ConfirmationPreview | null } | null>(
    null,
  );

  const listsQuery = useQuery({ queryKey: ['custom-lists'], queryFn: listCustomLists, enabled: visible });
  const memberQuery = useQuery({
    queryKey: ['title-lists', titleId],
    queryFn: () => getListIdsForTitle(titleId),
    enabled: visible,
  });

  const lists = listsQuery.data ?? [];
  const memberOf = new Set(memberQuery.data ?? []);

  const initialMembers = useRef<Set<number> | null>(null);

  useEffect(() => {
    if (!visible) {
      initialMembers.current = null;
      return;
    }
    if (initialMembers.current == null && memberQuery.data) {
      initialMembers.current = new Set(memberQuery.data);
    }
  }, [visible, memberQuery.data]);

  const finish = () => {
    const before = initialMembers.current;
    if (before) {
      const addedLists = lists.filter((list) => memberOf.has(list.id) && !before.has(list.id));
      const removedLists = lists.filter((list) => !memberOf.has(list.id) && before.has(list.id));
      const summary = buildSummary(
        titleName,
        addedLists.map((list) => list.name),
        removedLists.map((list) => list.name),
      );
      if (summary) {
        let preview: ConfirmationPreview | null = null;
        if (addedLists.length === 1 && removedLists.length === 0) {
          preview = {
            posters: addedLists[0].posters.slice(1, LIST_PREVIEW_POSTERS),
            change: 'added',
            titlePosterPath,
          };
        } else if (removedLists.length === 1 && addedLists.length === 0) {
          preview = {
            posters: removedLists[0].posters.slice(0, LIST_PREVIEW_POSTERS - 1),
            change: 'removed',
            titlePosterPath,
          };
        }
        setConfirmation({ message: summary, preview });
      }
    }
    onClose();
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
    queryClient.invalidateQueries({ queryKey: ['title-lists', titleId] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    queryClient.invalidateQueries({ queryKey: ['stats-list'] });
  };

  const handleToggle = async (listId: number) => {
    await toggleTitleInList(listId, titleId);
    refresh();
  };

  const handleCreate = async (name: string) => {
    const listId = await createCustomList(name);
    await addTitleToList(listId, titleId);
    setCreating(false);
    refresh();
  };

  return (
    <>
      <OverlayPage visible={visible} onClose={finish}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="smallBold">Ajouter à une liste</ThemedText>

          {lists.map((list) => {
            const isMember = memberOf.has(list.id);
            return (
              <Pressable
                key={list.id}
                onPress={() => handleToggle(list.id)}
                style={[
                  styles.row,
                  { backgroundColor: theme.backgroundSelected, borderColor: isMember ? ACCENT_COLOR : 'transparent' },
                ]}>
                <ListPreview posters={list.posters} count={list.count} />
                <View style={styles.rowText}>
                  <ThemedText numberOfLines={1}>{list.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {list.count === 0
                      ? 'Aucun titre'
                      : `${list.count} titre${list.count > 1 ? 's' : ''}${isMember ? ' · ce titre est dedans' : ''}`}
                  </ThemedText>
                </View>
                <Ionicons
                  name={isMember ? 'checkbox' : 'square-outline'}
                  size={26}
                  color={isMember ? ACCENT_COLOR : theme.textSecondary}
                />
              </Pressable>
            );
          })}

          <Pressable
            onPress={() => setCreating(true)}
            style={[styles.newList, { borderColor: theme.textSecondary }]}>
            <Ionicons name="add" size={20} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              Nouvelle liste
            </ThemedText>
          </Pressable>

          <Pressable onPress={finish} style={[styles.doneButton, { backgroundColor: theme.text }]}>
            <ThemedText style={{ color: theme.background }}>Terminé</ThemedText>
          </Pressable>
        </ScrollView>
      </OverlayPage>

      <ConfirmationPopup
        message={confirmation?.message ?? null}
        preview={confirmation?.preview}
        onClose={() => setConfirmation(null)}
      />

      <ListNameModal
        visible={creating}
        title="Nouvelle liste"
        confirmLabel="Créer"
        onSubmit={handleCreate}
        onClose={() => setCreating(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: OVERLAY_CONTENT_TOP_PADDING - Spacing.three,
    paddingBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.two + 2,
    borderWidth: 2,
  },
  rowText: { flex: 1, gap: Spacing.half },
  doneButton: {
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.two + 2,
    marginTop: Spacing.two,
  },
  newList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.two + 2,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
