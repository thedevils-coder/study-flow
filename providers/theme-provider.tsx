import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';

import { paletteFor, type ColorTokens, type ThemeName, type ThemePreference } from '@/constants/theme';

type ThemeContextValue = {
  preference: ThemePreference;
  theme: ThemeName;
  colors: ColorTokens;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const resolve = (preference: ThemePreference, scheme: ColorSchemeName): ThemeName => {
  if (preference === 'system') return scheme === 'dark' ? 'dark' : 'light';
  return preference;
};

export function ThemeProvider({
  children,
  preference,
  onPreferenceChange,
}: {
  children: React.ReactNode;
  preference: ThemePreference;
  onPreferenceChange?: (preference: ThemePreference) => void;
}) {
  const [scheme, setScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setScheme(colorScheme));
    return () => sub.remove();
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const theme = resolve(preference, scheme);
    return {
      preference,
      theme,
      colors: paletteFor(theme),
      setPreference: (next) => onPreferenceChange?.(next),
    };
  }, [preference, scheme, onPreferenceChange]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider is missing.');
  return value;
}
