import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

type Palette = typeof colors.light;

/**
 * Returns design tokens for the current color scheme.
 * Falls back to light palette when dark is not available.
 */
export function useColors(): Palette & { radius: number } {
  const scheme = useColorScheme();
  const palette: Palette =
    scheme === 'dark' && colors.dark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
