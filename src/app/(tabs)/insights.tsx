import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { MoneyText } from '@/components/ui/money-text';
import { MonthPicker } from '@/components/ui/month-picker';
import { MonthlyBars } from '@/components/ui/monthly-bars';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenTitle } from '@/components/ui/screen-title';
import { SectionHeader } from '@/components/ui/section-header';
import { BottomTabInset, Spacing } from '@/constants/theme';
import {
  getCategoryBreakdown,
  getMonthSummary,
  getMonthlySeries,
} from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import {
  currentMonthKey,
  daysElapsedInMonth,
  daysInMonth,
  monthLabel,
  previousMonths,
} from '@/lib/dates';
import { formatCompactMinor, formatMinor } from '@/lib/money';

export default function InsightsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [month, setMonth] = useState(currentMonthKey());

  const summaryQuery = useDbQuery((db) => getMonthSummary(db, month), [month]);
  const breakdownQuery = useDbQuery((db) => getCategoryBreakdown(db, month), [month]);
  const seriesQuery = useDbQuery(
    (db) => getMonthlySeries(db, previousMonths(month, 6)),
    [month],
  );

  const summary = summaryQuery.data;
  const breakdown = breakdownQuery.data ?? [];
  const series = seriesQuery.data ?? [];

  if (!summary || (summary.month !== month && !summaryQuery.error)) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        {summaryQuery.error ? (
          <EmptyState
            actionLabel="Try again"
            icon="cloud-offline-outline"
            message={summaryQuery.error.message}
            onAction={summaryQuery.reload}
            title="Could not load insights"
          />
        ) : (
          <ActivityIndicator color={theme.accent} />
        )}
      </SafeAreaView>
    );
  }

  const totalExpense = Math.max(1, summary.expenseMinor);
  const elapsedDays = Math.max(1, daysElapsedInMonth(month));
  const totalDays = daysInMonth(month);
  const dailyAverage = Math.round(summary.expenseMinor / elapsedDays);
  const projected = Math.round(dailyAverage * totalDays);
  const isCurrentMonth = month === currentMonthKey();
  const biggest = breakdown[0];
  const peak = Math.max(1, ...series.flatMap((point) => [point.incomeMinor, point.expenseMinor]));
  const hasSeriesData = series.some(
    (point) => point.incomeMinor > 0 || point.expenseMinor > 0,
  );
  const previousPoint = series.length >= 2 ? series[series.length - 2] : null;
  const monthOverMonth =
    previousPoint && previousPoint.expenseMinor > 0
      ? (summary.expenseMinor - previousPoint.expenseMinor) / previousPoint.expenseMinor
      : null;
  const monthOverMonthPercent = monthOverMonth === null ? 0 : Math.round(Math.abs(monthOverMonth) * 100);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <ScreenTitle subtitle="Patterns behind your spending" title="Insights" />
          <MonthPicker month={month} onChange={setMonth} />
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <ThemedText type="small" themeColor="textSecondary">
              Daily average
            </ThemedText>
            <MoneyText minor={dailyAverage} size="subtitle" />
            <ThemedText type="small" themeColor="textSecondary">
              {isCurrentMonth ? `${elapsedDays} days in` : `${totalDays} days`}
            </ThemedText>
          </Card>

          <Card style={styles.statCard}>
            <ThemedText type="small" themeColor="textSecondary">
              {isCurrentMonth ? 'Projected spend' : 'Total spent'}
            </ThemedText>
            <MoneyText
              color={
                isCurrentMonth && summary.incomeMinor > 0 && projected > summary.incomeMinor
                  ? theme.danger
                  : undefined
              }
              minor={isCurrentMonth ? projected : summary.expenseMinor}
              size="subtitle"
            />
            <ThemedText type="small" themeColor="textSecondary">
              {isCurrentMonth ? 'at your current pace' : monthLabel(month)}
            </ThemedText>
          </Card>
        </View>

        {biggest ? (
          <Card style={styles.biggestCard}>
            <CategoryIcon color={biggest.color} icon={biggest.icon} size={42} />
            <View style={styles.flex}>
              <ThemedText type="small" themeColor="textSecondary">
                Biggest category
              </ThemedText>
              <ThemedText type="smallBold">{biggest.name}</ThemedText>
            </View>
            <View style={styles.biggestAmount}>
              <MoneyText minor={biggest.totalMinor} size="body" />
              <ThemedText type="small" themeColor="textSecondary">
                {Math.round((biggest.totalMinor / totalExpense) * 100)}% of spend
              </ThemedText>
            </View>
          </Card>
        ) : null}

        <View style={styles.section}>
          <SectionHeader title="Last 6 months" />
          <Card style={styles.chartCard}>
            <View style={styles.chartTop}>
              <ThemedText type="smallBold">Income vs spending</ThemedText>
              {hasSeriesData ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Peak {formatCompactMinor(peak)}
                </ThemedText>
              ) : null}
            </View>

            {hasSeriesData ? (
              <>
                <MonthlyBars data={series} highlightMonth={month} />
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: theme.success }]} />
                    <ThemedText type="small" themeColor="textSecondary">
                      Income
                    </ThemedText>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: theme.danger }]} />
                    <ThemedText type="small" themeColor="textSecondary">
                      Spending
                    </ThemedText>
                  </View>
                </View>

                {monthOverMonth !== null && previousPoint ? (
                  <View style={styles.comparisonRow}>
                    <Ionicons
                      name={monthOverMonth > 0 ? 'trending-up' : 'trending-down'}
                      size={15}
                      color={monthOverMonth > 0 ? theme.danger : theme.success}
                    />
                    <ThemedText
                      type="small"
                      style={{
                        color: monthOverMonth > 0 ? theme.danger : theme.success,
                      }}>
                      {monthOverMonthPercent === 0
                        ? `About the same as ${monthLabel(previousPoint.month)}`
                        : `${monthOverMonthPercent}% ${
                            monthOverMonth > 0 ? 'more' : 'less'
                          } than ${monthLabel(previousPoint.month)}`}
                    </ThemedText>
                  </View>
                ) : null}
              </>
            ) : (
              <EmptyState
                icon="bar-chart-outline"
                message="Add a few months of transactions to see the comparison."
                title="Not enough history yet"
              />
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader
            actionLabel="View activity"
            onAction={() => router.push('/activity')}
            title={`${monthLabel(month)} by category`}
          />
          <Card style={styles.listCard}>
            {breakdown.length === 0 ? (
              <EmptyState
                icon="pie-chart-outline"
                message="No expenses recorded for this month."
                title="Nothing to break down"
              />
            ) : (
              breakdown.map((item) => (
                <View key={item.categoryId} style={styles.breakdownRow}>
                  <CategoryIcon color={item.color} icon={item.icon} size={36} />
                  <View style={styles.breakdownInfo}>
                    <View style={styles.breakdownTop}>
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
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.count} {item.count === 1 ? 'transaction' : 'transactions'} ·{' '}
                      {Math.round((item.totalMinor / totalExpense) * 100)}%
                    </ThemedText>
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
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
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    gap: Spacing.half,
    padding: Spacing.three,
  },
  biggestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  biggestAmount: {
    alignItems: 'flex-end',
    gap: 2,
  },
  section: {
    gap: Spacing.two,
  },
  chartCard: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  chartTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingTop: Spacing.one,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listCard: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  breakdownInfo: {
    flex: 1,
    gap: 4,
  },
  breakdownTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
