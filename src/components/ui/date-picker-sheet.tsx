import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addMonths,
  buildCalendar,
  currentMonthKey,
  monthKeyOf,
  monthLabel,
  todayISO,
  WEEKDAY_INITIALS,
} from '@/lib/dates';

interface DatePickerSheetProps {
  value: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
}

/**
 * Mount this only while the sheet is open so its month state starts from the
 * selected date each time, without syncing state in an effect.
 */
export function DatePickerSheet({ value, onSelect, onClose }: DatePickerSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => monthKeyOf(value));

  const cells = useMemo(() => buildCalendar(month), [month]);
  const today = todayISO();
  const canGoNext = month < currentMonthKey();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundElement,
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Previous month"
              hitSlop={8}
              onPress={() => setMonth((previous) => addMonths(previous, -1))}
              style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </Pressable>
            <ThemedText type="smallBold">{monthLabel(month)}</ThemedText>
            <Pressable
              accessibilityLabel="Next month"
              disabled={!canGoNext}
              hitSlop={8}
              onPress={() => setMonth((previous) => addMonths(previous, 1))}
              style={({ pressed }) => [
                styles.arrow,
                !canGoNext && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <Ionicons name="chevron-forward" size={20} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAY_INITIALS.map((initial, index) => (
              <View key={`${initial}-${index}`} style={styles.weekCell}>
                <ThemedText type="small" themeColor="textSecondary">
                  {initial}
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell, index) => {
              if (!cell.iso) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }

              const isSelected = cell.iso === value;
              const isToday = cell.iso === today;
              const isFuture = cell.iso > today;

              return (
                <View key={cell.iso} style={styles.dayCell}>
                  <Pressable
                    accessibilityLabel={cell.iso}
                    disabled={isFuture}
                    onPress={() => {
                      onSelect(cell.iso as string);
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.dayButton,
                      isSelected && { backgroundColor: theme.accent },
                      !isSelected && isToday && { borderColor: theme.accent, borderWidth: 1 },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type={isSelected ? 'smallBold' : 'small'}
                      style={[
                        isFuture && styles.disabled,
                        isSelected ? { color: theme.accentContrast } : null,
                      ]}>
                      {cell.day}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128, 128, 128, 0.4)',
    marginBottom: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.three,
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    paddingBottom: Spacing.one,
  },
  weekCell: {
    width: '14.2857%',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.3,
  },
  pressed: {
    opacity: 0.6,
  },
});
