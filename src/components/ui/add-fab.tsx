import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface AddFabProps {
  onPress: () => void;
  bottom?: number;
}

export function AddFab({ onPress, bottom }: AddFabProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Native tabs already inset the screen content above the tab bar on Android, so the
  // FAB only needs a small margin there. On iOS the content extends behind the tab bar,
  // so the tab bar height and home-indicator inset still have to be added.
  const offset =
    bottom ??
    Platform.select({
      android: Spacing.four,
      ios: insets.bottom + BottomTabInset + Spacing.three,
      web: 96,
    }) ??
    Spacing.four;

  return (
    <Pressable
      accessibilityLabel="Add transaction"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: theme.accent, bottom: offset },
        pressed && styles.pressed,
      ]}>
      <Ionicons name="add" size={30} color={theme.accentContrast} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.four,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
