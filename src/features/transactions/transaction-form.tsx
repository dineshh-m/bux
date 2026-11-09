import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AmountKeypad, type KeypadKey } from '@/components/ui/amount-keypad';
import { DatePickerSheet } from '@/components/ui/date-picker-sheet';
import { Spacing } from '@/constants/theme';
import { useDataRefresh } from '@/context/data-refresh';
import { listCategories } from '@/db/categories';
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
  type Transaction,
  type TransactionType,
} from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { dayLabel, longDateLabel, todayISO } from '@/lib/dates';
import { formatTypedAmount, minorToInput, parseAmountToMinor } from '@/lib/money';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TransactionFormProps {
  transaction?: Transaction;
  initialType?: TransactionType;
}

export function TransactionForm({ transaction, initialType = 'expense' }: TransactionFormProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const router = useRouter();
  const { refresh } = useDataRefresh();

  const isEditing = Boolean(transaction);

  const [type, setType] = useState<TransactionType>(transaction?.type ?? initialType);
  const [amountRaw, setAmountRaw] = useState(
    transaction ? minorToInput(transaction.amountMinor) : '',
  );
  const [categoryId, setCategoryId] = useState<number | null>(transaction?.categoryId ?? null);
  const [occurredOn, setOccurredOn] = useState(transaction?.occurredOn ?? todayISO());
  const [note, setNote] = useState(transaction?.note ?? '');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: categories } = useDbQuery(
    (database) => listCategories(database, type),
    [type],
  );

  // Fall back to the first category of the current kind until the user picks one.
  const selectedCategoryId =
    categories && categories.length > 0
      ? categories.some((category) => category.id === categoryId)
        ? categoryId
        : categories[0].id
      : null;

  const amountMinor = parseAmountToMinor(amountRaw);
  const canSave = amountMinor !== null && selectedCategoryId !== null && !saving;

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const handleKey = (key: KeypadKey) => {
    if (key === 'back') {
      setAmountRaw((previous) => previous.slice(0, -1));
      return;
    }
    if (key === '.') {
      setAmountRaw((previous) => {
        if (previous.includes('.')) return previous;
        return previous === '' ? '0.' : `${previous}.`;
      });
      return;
    }
    setAmountRaw((previous) => {
      if (previous.includes('.')) {
        const [, fraction = ''] = previous.split('.');
        if (fraction.length >= 2) return previous;
      }
      if (previous.replace('.', '').length >= 9) return previous;
      if (previous === '0') return key;
      return previous + key;
    });
  };

  const handleSave = async () => {
    if (amountMinor === null || selectedCategoryId === null || saving) return;

    setSaving(true);
    try {
      const input = { type, amountMinor, categoryId: selectedCategoryId, occurredOn, note };
      if (transaction) {
        await updateTransaction(db, transaction.id, input);
      } else {
        await createTransaction(db, input);
      }
      refresh();
      close();
    } catch (error) {
      setSaving(false);
      Alert.alert(
        'Could not save',
        error instanceof Error ? error.message : 'Something went wrong. Try again.',
      );
    }
  };

  const handleDelete = () => {
    if (!transaction) return;
    Alert.alert('Delete transaction?', 'This removes it from your history for good.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransaction(db, transaction.id);
            refresh();
            close();
          } catch (error) {
            Alert.alert(
              'Could not delete',
              error instanceof Error ? error.message : 'Something went wrong.',
            );
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            hitSlop={8}
            onPress={close}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>

          <ThemedText type="smallBold">{isEditing ? 'Edit transaction' : 'New transaction'}</ThemedText>

          <Pressable
            disabled={!canSave}
            hitSlop={8}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: canSave ? theme.accent : theme.backgroundSelected },
              pressed && canSave && styles.pressed,
            ]}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.accentContrast} />
            ) : (
              <ThemedText
                type="smallBold"
                style={{ color: canSave ? theme.accentContrast : theme.textSecondary }}>
                Save
              </ThemedText>
            )}
          </Pressable>
        </View>

        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.formScroll}>
          <View style={[styles.segmented, { backgroundColor: theme.backgroundSelected }]}>
            {(['expense', 'income'] as const).map((kind) => {
              const selected = type === kind;
              return (
                <Pressable
                  key={kind}
                  onPress={() => setType(kind)}
                  style={[
                    styles.segment,
                    selected && { backgroundColor: theme.backgroundElement },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    themeColor={selected ? 'text' : 'textSecondary'}>
                    {kind === 'expense' ? 'Expense' : 'Income'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.amountRow}>
            <ThemedText type="title" themeColor="textSecondary" style={styles.currency}>
              ₹
            </ThemedText>
            <ThemedText
              style={[
                styles.amount,
                { color: amountRaw ? theme.text : theme.textSecondary },
                type === 'income' && amountRaw ? { color: theme.success } : null,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {amountRaw ? formatTypedAmount(amountRaw) : '0'}
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Category
            </ThemedText>
            <ScrollView
              horizontal
              contentContainerStyle={styles.chipRow}
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}>
              {(categories ?? []).map((category) => {
                const selected = category.id === selectedCategoryId;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setCategoryId(category.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? `${category.color}20` : theme.backgroundElement,
                        borderColor: selected ? category.color : theme.border,
                      },
                    ]}>
                    <Ionicons
                      name={category.icon as IoniconName}
                      size={15}
                      color={selected ? category.color : theme.textSecondary}
                    />
                    <ThemedText
                      type="small"
                      style={selected ? { color: category.color } : undefined}>
                      {category.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setDatePickerOpen(true);
            }}
            style={({ pressed }) => [
              styles.metaRow,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
            <ThemedText type="small" style={styles.metaText}>
              {dayLabel(occurredOn)} · {longDateLabel(occurredOn)}
            </ThemedText>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </Pressable>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Note (optional)
            </ThemedText>
            <TextInput
              maxLength={120}
              onChangeText={setNote}
              onSubmitEditing={() => Keyboard.dismiss()}
              placeholder="What was this for?"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="done"
              selectionColor={theme.accent}
              style={[
                styles.noteInput,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={note}
            />
          </View>

          {isEditing ? (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
              <Ionicons name="trash-outline" size={16} color={theme.danger} />
              <ThemedText type="smallBold" style={{ color: theme.danger }}>
                Delete transaction
              </ThemedText>
            </Pressable>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.keypadFooter,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom, Spacing.two),
            },
          ]}>
          <AmountKeypad onKey={handleKey} />
        </View>
      </SafeAreaView>

      {datePickerOpen ? (
        <DatePickerSheet
          onClose={() => setDatePickerOpen(false)}
          onSelect={setOccurredOn}
          value={occurredOn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  headerButton: {
    minWidth: 60,
    paddingVertical: Spacing.one,
  },
  saveButton: {
    minWidth: 64,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.half,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three - 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  currency: {
    fontSize: 30,
    lineHeight: 38,
  },
  amount: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    maxWidth: '85%',
  },
  section: {
    gap: Spacing.two,
  },
  chipScroll: {
    marginHorizontal: -Spacing.three,
  },
  chipRow: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaText: {
    flex: 1,
  },
  noteInput: {
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    minHeight: 46,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
  },
  keypadFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
