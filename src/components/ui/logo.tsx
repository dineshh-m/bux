import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

const LOGO_SOURCE = require('@/assets/images/bux-logo.svg');

interface LogoProps {
  size?: number;
}

export function Logo({ size = 30 }: LogoProps) {
  return (
    <Image
      accessible={false}
      contentFit="contain"
      source={LOGO_SOURCE}
      style={[styles.image, { width: size, height: size }]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    flexShrink: 0,
  },
});
