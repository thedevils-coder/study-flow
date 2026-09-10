import { useColorScheme } from 'react-native';
import { colors, darkColors, paletteFor, ThemeName } from '@/constants/theme';
import { useApp } from '@/store/app-store';

export function useResolvedTheme(): ThemeName {
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';

  try {
    const { settings } = useApp();
    if (settings.theme === 'dark' || settings.theme === 'light') {
      return settings.theme;
    }
    return system;
  } catch {
    return system;
  }
}

export function useColors() {
  return paletteFor(useResolvedTheme());
}

export { colors, darkColors };
