import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AddFab } from '@/components/ui/add-fab';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { MoneyText } from '@/components/ui/money-text';
import { MonthPicker } from '@/components/ui/month-picker';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { TransactionRow } from '@/components/ui/transaction-row';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getCategoryBreakdown, getMonthSummary, getRecentTransactions } from '@/db/transactions';
import { getMonthlyTarget } from '@/db/targets';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { currentMonthKey, monthLabel } from '@/lib/dates';
import { formatMinor } from '@/lib/money';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [month, setMonth] = useState(currentMonthKey());

  const summaryQuery = useDbQuery((db) => getMonthSummary(db, month), [month]);
  const breakdownQuery = useDbQuery((db) => getCategoryBreakdown(db, month), [month]);
  const targetQuery = useDbQuery((db) => getMonthlyTarget(db, month), [month]);
  const recentQuery = useDbQuery((db) => getRecentTransactions(db, 5, month), [month]);

  const summary = summaryQuery.data;
  const breakdown = breakdownQuery.data ?? [];
  const recent = recentQuery.data ?? [];
  const target = targetQuery.data;

  const openTransaction = (id: number) =>
    router.push({ pathname: '/transaction/[id]', params: { id: String(id) } });

  if (!summary || (summary.month !== month && !summaryQuery.error)) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        {summaryQuery.error ? (
          <EmptyState
            icon="cloud-offline-outline"
            message={summaryQuery.error.message}
            onAction={summaryQuery.reload}
            actionLabel="Try again"
            title="Could not load your month"
          />
        ) : (
          <ActivityIndicator color={theme.accent} />
        )}
      </SafeAreaView>
    );
  }

  const overspent = summary.remainingMinor < 0;
  const budget = target?.budgetMinor ?? null;
  const budgetProgress = budget && budget > 0 ? summary.expenseMinor / budget : 0;
  const totalExpense = Math.max(1, summary.expenseMinor);
  const expectedSalary = target?.expectedIncomeMinor ?? null;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <ThemedText type="subtitle" style={styles.title}>
              Bux
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Where your money went
            </ThemedText>
          </View>
          <MonthPicker month={month} onChange={setMonth} />
        </View>

        <Card style={styles.hero}>
          <ThemedText type="small" themeColor="textSecondary">
            {overspent ? 'Overspent this month' : `Left to spend · ${monthLabel(month)}`}
          </ThemedText>
          <MoneyText
            color={overspent ? theme.danger : theme.success}
            minor={summary.remainingMinor}
            size="hero"
          />

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <ThemedText type="small" themeColor="textSecondary">
                In
              </ThemedText>
              <MoneyText minor={summary.incomeMinor} size="small" />
            </View>
            <View style={[styles.heroDivider, { backgroundColor: theme.border }]} />
            <View style={styles.heroStat}>
              <ThemedText type="small" themeColor="textSecondary">
                Out
              </ThemedText>
              <MoneyText minor={summary.expenseMinor} size="small" />
            </View>
            <View style={[styles.heroDivider, { backgroundColor: theme.border }]} />
            <View style={styles.heroStat}>
              <ThemedText type="small" themeColor="textSecondary">
                Activity
              </ThemedText>
              <ThemedText type="smallBold">{summary.transactionCount} items</ThemedText>
            </View>
          </View>

          {expectedSalary ? (
            <ThemedText type="small" themeColor="textSecondary">
              Salary received {formatMinor(summary.incomeMinor)} of{' '}
              {formatMinor(expectedSalary)}
            </ThemedText>
          ) : null}

          {budget && budget > 0 ? (
            <View style={styles.budgetBlock}>
              <View style={styles.budgetTop}>
                <ThemedText type="small" themeColor="textSecondary">
                  Monthly budget
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatMinor(summary.expenseMinor)} of {formatMinor(budget)}
                </ThemedText>
              </View>
              <ProgressBar
                color={budgetProgress >= 1 ? theme.danger : theme.accent}
                progress={budgetProgress}
              />
              <ThemedText
                type="small"
                style={{ color: budgetProgress >= 1 ? theme.danger : theme.textSecondary }}>
                {budgetProgress >= 1
                  ? `Over budget by ${formatMinor(summary.expenseMinor - budget)}`
                  : `${formatMinor(budget - summary.expenseMinor)} left in your budget`}
              </ThemedText>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [
                styles.budgetPrompt,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <Ionicons name="flag-outline" size={16} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                Set a monthly budget
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </Pressable>
          )}

          {summary.incomeMinor === 0 ? (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/transaction/new', params: { type: 'income' } })
              }
              style={({ pressed }) => [
                styles.salaryPrompt,
                { backgroundColor: `${theme.accent}18` },
                pressed && styles.pressed,
              ]}>
              <Ionicons name="cash-outline" size={18} color={theme.accent} />
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                Add your salary for {monthLabel(month)}
              </ThemedText>
            </Pressable>
          ) : null}
        </Card>

        <View style={styles.section}>
          <SectionHeader
            actionLabel="Insights"
            onAction={() => router.push('/insights')}
            title="Where it went"
          />
          <Card style={styles.listCard}>
            {breakdown.length === 0 ? (
              <EmptyState
                icon="pie-chart-outline"
                message="Log an expense and it will show up here, broken down by category."
                title="No spending yet"
              />
            ) : (
              breakdown.slice(0, 5).map((item) => (
                <View key={item.categoryId} style={styles.categoryRow}>
                  <CategoryIcon color={item.color} icon={item.icon} size={34} />
                  <View style={styles.categoryInfo}>
                    <View style={styles.categoryTop}>
                      <ThemedText type="smallBold" numberOfLines={1} style={styles.flex}>
                        {item.name}
                      </ThemedText>
                      <ThemedText type="smallBold">{formatMinor(item.totalMinor)}</ThemedText>
                    </View>
                    <ProgressBar
                      color={item.color}
                      height={6}
                      progress={item.totalMinor / totalExpense}
                    />
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader
            actionLabel="See all"
            onAction={() => router.push('/activity')}
            title="Recent"
          />
          <Card style={styles.listCard}>
            {recent.length === 0 ? (
              <EmptyState
                actionLabel="Add your first expense"
                icon="receipt-outline"
                onAction={() => router.push('/transaction/new')}
                title="Nothing recorded yet"
              />
            ) : (
              recent.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  onPress={() => openTransaction(transaction.id)}
                  showDate
                  transaction={transaction}
                />
              ))
            )}
          </Card>
        </View>
      </ScrollView>

      <AddFab onPress={() => router.push('/transaction/new')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.four,
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
  brand: {
    flexShrink: 1,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
  },
  hero: {
    gap: Spacing.two,
    padding: Spacing.four,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  heroStat: {
    flex: 1,
    gap: 2,
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  budgetBlock: {
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  budgetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  budgetPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  salaryPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  listCard: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  categoryInfo: {
    flex: 1,
    gap: 6,
  },
  categoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.65,
  },
});
