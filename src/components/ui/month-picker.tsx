import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addMonths, currentMonthKey, monthLabel } from '@/lib/dates';

interface MonthPickerProps {
  month: string;
  onChange: (month: string) => void;
}

export function MonthPicker({ month, onChange }: MonthPickerProps) {
  const theme = useTheme();
  const canGoNext = month < currentMonthKey();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Pressable
        accessibilityLabel="Previous month"
        hitSlop={8}
        onPress={() => onChange(addMonths(month, -1))}
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
        <Ionicons name="chevron-back" size={18} color={theme.text} />
      </Pressable>

      <ThemedText type="smallBold" style={styles.label}>
        {monthLabel(month)}
      </ThemedText>

      <Pressable
        accessibilityLabel="Next month"
        disabled={!canGoNext}
        hitSlop={8}
        onPress={() => onChange(addMonths(month, 1))}
        style={({ pressed }) => [
          styles.arrow,
          !canGoNext && styles.disabled,
          pressed && styles.pressed,
        ]}>
        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.five,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
    alignSelf: 'flex-start',
  },
  arrow: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  disabled: {
    opacity: 0.3,
  },
  label: {
    minWidth: 82,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.55,
  },
});
