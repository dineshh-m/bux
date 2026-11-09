import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Logo } from '@/components/ui/logo';
import { Fonts, Spacing } from '@/constants/theme';

interface ScreenTitleProps {
  title: string;
  subtitle?: string;
  logoSize?: number;
}

/** Shared screen heading with the Bux mark before the title. */
export function ScreenTitle({ title, subtitle, logoSize = 30 }: ScreenTitleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Logo size={logoSize} />
        <ThemedText numberOfLines={1} type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
      </View>
      {subtitle ? (
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    lineHeight: 36,
  },
});
