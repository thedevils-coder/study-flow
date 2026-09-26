export type ThemeName = 'light' | 'dark';
export type ThemePreference = 'system' | ThemeName;

export type ColorTokens = {
  background: string;
  surface: string;
  card: string;
  elevated: string;
  text: string;
  secondaryText: string;
  mutedText: string;
  border: string;
  divider: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  accentText: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  gold: string;
  input: string;
  inputBorder: string;
  overlay: string;
  tabBar: string;
  progressTrack: string;
  progressFill: string;
  modal: string;
  white: string;
};

export const lightColors: ColorTokens = {
  background: '#F5F3FB',
  surface: '#FBFBFE',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  text: '#15132A',
  secondaryText: '#5C5874',
  mutedText: '#8B87A2',
  border: '#E7E3F2',
  divider: '#EEEAF6',
  accent: '#5932E8',
  accentSoft: '#EEE9FF',
  accentStrong: '#3D1FBE',
  accentText: '#FFFFFF',
  success: '#1BAA68',
  successSoft: '#E6F8EF',
  danger: '#D84C5A',
  dangerSoft: '#FDECEC',
  warning: '#C2410C',
  gold: '#F5C518',
  input: '#FAFAFC',
  inputBorder: '#E4E1EA',
  overlay: 'rgba(21, 19, 42, 0.45)',
  tabBar: '#FFFFFF',
  progressTrack: '#ECEAF1',
  progressFill: '#5932E8',
  modal: '#FFFFFF',
  white: '#FFFFFF',
};

export const darkColors: ColorTokens = {
  background: '#0E0C16',
  surface: '#141221',
  card: '#1A1628',
  elevated: '#221D35',
  text: '#F4F1FF',
  secondaryText: '#B7B1CC',
  mutedText: '#8E88A8',
  border: '#322C48',
  divider: '#2A2540',
  accent: '#8B73FF',
  accentSoft: '#2A2444',
  accentStrong: '#B5A4FF',
  accentText: '#FFFFFF',
  success: '#3DDB8A',
  successSoft: '#163427',
  danger: '#FF6B7A',
  dangerSoft: '#3A1822',
  warning: '#F0A04B',
  gold: '#F5C518',
  input: '#1C1830',
  inputBorder: '#3A3454',
  overlay: 'rgba(0, 0, 0, 0.62)',
  tabBar: '#161326',
  progressTrack: '#2A2444',
  progressFill: '#8B73FF',
  modal: '#1C1830',
  white: '#FFFFFF',
};

export const paletteFor = (theme: ThemeName): ColorTokens =>
  theme === 'dark' ? darkColors : lightColors;

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const spacing = {
  screen: 20,
  stack: 12,
  section: 24,
} as const;

export const typography = {
  title: 28,
  heading: 20,
  body: 16,
  caption: 13,
} as const;
