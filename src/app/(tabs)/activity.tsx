import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AddFab } from '@/components/ui/add-fab';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthPicker } from '@/components/ui/month-picker';
import { ScreenTitle } from '@/components/ui/screen-title';
import { TransactionRow } from '@/components/ui/transaction-row';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { listTransactions, type Transaction, type TransactionType } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { currentMonthKey, dayLabel } from '@/lib/dates';
import { formatMinor } from '@/lib/money';

type TypeFilter = 'all' | TransactionType;

const FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'expense', label: 'Expenses' },
  { key: 'income', label: 'Income' },
];

export default function ActivityScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [month, setMonth] = useState(currentMonthKey());
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');

  const { data, loading, error, reload } = useDbQuery(
    (db) =>
      listTransactions(db, {
        month,
        type: filter === 'all' ? undefined : filter,
        search,
      }),
    [month, filter, search],
  );

  const groups = useMemo(() => {
    const transactions = data ?? [];
    const map = new Map<string, Transaction[]>();
    for (const transaction of transactions) {
      const group = map.get(transaction.occurredOn);
      if (group) group.push(transaction);
      else map.set(transaction.occurredOn, [transaction]);
    }
    return Array.from(map.entries());
  }, [data]);

  const openTransaction = (id: number) =>
    router.push({ pathname: '/transaction/[id]', params: { id: String(id) } });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <ScreenTitle subtitle="Every rupee, accounted for" title="Activity" />
          <MonthPicker month={month} onChange={setMonth} />
        </View>

        <View
          style={[
            styles.searchRow,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            onChangeText={setSearch}
            placeholder="Search notes or categories"
            placeholderTextColor={theme.textSecondary}
            selectionColor={theme.accent}
            style={[styles.searchInput, { color: theme.text }]}
            value={search}
          />
          {search ? (
            <Pressable hitSlop={8} onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filters}>
          {FILTERS.map((item) => {
            const selected = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selected ? theme.text : theme.backgroundElement,
                    borderColor: selected ? theme.text : theme.border,
                  },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: selected ? theme.background : theme.textSecondary }}>
                  {item.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <Card>
            <EmptyState
              actionLabel="Try again"
              icon="cloud-offline-outline"
              message={error.message}
              onAction={reload}
              title="Could not load activity"
            />
          </Card>
        ) : null}

        {!error && groups.length === 0 && !loading ? (
          <Card>
            <EmptyState
              actionLabel="Add a transaction"
              icon="receipt-outline"
              message={
                search
                  ? 'No transactions match that search.'
                  : 'Nothing here for this month yet. Add an expense or income to get started.'
              }
              onAction={() => router.push('/transaction/new')}
              title={search ? 'No matches' : 'No transactions'}
            />
          </Card>
        ) : null}

        {!error &&
          groups.map(([iso, items]) => {
            const dayExpense = items
              .filter((item) => item.type === 'expense')
              .reduce((sum, item) => sum + item.amountMinor, 0);

            return (
              <View key={iso} style={styles.group}>
                <View style={styles.groupHeader}>
                  <ThemedText type="smallBold">{dayLabel(iso)}</ThemedText>
                  {dayExpense > 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatMinor(dayExpense)}
                    </ThemedText>
                  ) : null}
                </View>
                <Card style={styles.groupCard}>
                  {items.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      onPress={() => openTransaction(transaction.id)}
                      transaction={transaction}
                    />
                  ))}
                </Card>
              </View>
            );
          })}
      </ScrollView>

      <AddFab onPress={() => router.push('/transaction/new')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.one,
  },
  filters: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    borderWidth: StyleSheet.hairlineWidth,
  },
  group: {
    gap: Spacing.two,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  groupCard: {
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
});
