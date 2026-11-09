import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { MonthlyPoint } from '@/db/transactions';
import { useTheme } from '@/hooks/use-theme';
import { MONTH_NAMES } from '@/lib/dates';

const CHART_HEIGHT = 120;

interface MonthlyBarsProps {
  data: MonthlyPoint[];
  highlightMonth?: string;
}

export function MonthlyBars({ data, highlightMonth }: MonthlyBarsProps) {
  const theme = useTheme();
  const max = Math.max(1, ...data.flatMap((point) => [point.incomeMinor, point.expenseMinor]));

  return (
    <View style={styles.chart}>
      {data.map((point) => {
        const monthIndex = Number(point.month.slice(5, 7)) - 1;
        const highlighted = point.month === highlightMonth;

        return (
          <View key={point.month} style={styles.column}>
            <View style={styles.bars}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, (point.incomeMinor / max) * CHART_HEIGHT),
                    backgroundColor: theme.success,
                  },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, (point.expenseMinor / max) * CHART_HEIGHT),
                    backgroundColor: theme.danger,
                  },
                ]}
              />
            </View>
            <ThemedText
              type="small"
              themeColor={highlighted ? 'text' : 'textSecondary'}
              style={highlighted ? styles.highlighted : undefined}>
              {MONTH_NAMES[monthIndex] ?? point.month}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingTop: 12,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  bars: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    width: 10,
    borderRadius: 5,
  },
  highlighted: {
    fontWeight: '700',
  },
});
