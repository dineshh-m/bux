import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type KeypadKey =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '.'
  | '0'
  | 'back';

const KEYS: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

interface AmountKeypadProps {
  onKey: (key: KeypadKey) => void;
}

export function AmountKeypad({ onKey }: AmountKeypadProps) {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {KEYS.map((key) => (
        <View key={key} style={styles.cell}>
          <Pressable
            accessibilityLabel={key === 'back' ? 'Delete' : key}
            accessibilityRole="button"
            onPress={() => onKey(key)}
            style={({ pressed }) => [
              styles.key,
              {
                backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}>
            {key === 'back' ? (
              <Ionicons name="backspace-outline" size={24} color={theme.text} />
            ) : (
              <ThemedText style={styles.keyLabel}>{key}</ThemedText>
            )}
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.two,
  },
  cell: {
    width: '33.3333%',
    padding: Spacing.half,
  },
  key: {
    height: 52,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
  },
});
