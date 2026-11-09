import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Spacing } from '@/constants/theme';
import type { Transaction } from '@/db/transactions';
import { useTheme } from '@/hooks/use-theme';
import { dayLabel } from '@/lib/dates';
import { formatMinor } from '@/lib/money';

interface TransactionRowProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  showDate?: boolean;
}

export function TransactionRow({ transaction, onPress, showDate = false }: TransactionRowProps) {
  const theme = useTheme();
  const isIncome = transaction.type === 'income';
  const note = transaction.note?.trim();
  const subtitle = [showDate ? dayLabel(transaction.occurredOn) : null, note || null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={() => onPress?.(transaction)}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null]}>
      <CategoryIcon color={transaction.categoryColor} icon={transaction.categoryIcon} size={40} />

      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {transaction.categoryName}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      <ThemedText
        type="smallBold"
        style={[styles.amount, { color: isIncome ? theme.success : theme.text }]}>
        {isIncome ? '+' : '-'}
        {formatMinor(transaction.amountMinor)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.6,
  },
});
