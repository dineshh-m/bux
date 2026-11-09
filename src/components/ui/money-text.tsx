import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatMinor, type FormatMoneyOptions } from '@/lib/money';

export type MoneySize = 'hero' | 'title' | 'subtitle' | 'body' | 'small';

interface MoneyTextProps {
  minor: number;
  size?: MoneySize;
  color?: string;
  options?: FormatMoneyOptions;
  style?: StyleProp<TextStyle>;
}

export function MoneyText({ minor, size = 'body', color, options, style }: MoneyTextProps) {
  return (
    <ThemedText
      adjustsFontSizeToFit
      numberOfLines={1}
      style={[
        styles.base,
        sizeStyles[size],
        color ? { color } : null,
        style,
      ]}>
      {formatMinor(minor, options)}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  base: {
    fontVariant: ['tabular-nums'],
  },
});

const sizeStyles = StyleSheet.create({
  hero: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: -1,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
