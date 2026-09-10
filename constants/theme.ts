export const colors = {
  purple: '#5932E8',
  purpleDark: '#3D1FBE',
  ink: '#15132A',
  muted: '#777487',
  soft: '#F6F4FF',
  lilac: '#EEE9FF',
  border: '#EAE7F3',
  success: '#1BAA68',
  danger: '#D84C5A',
  dangerSoft: '#FDECEC',
  warning: '#C2410C',
  white: '#FFFFFF',
  black: '#000000',
  gold: '#F5C518',
  background: '#FFFFFF',
  card: '#FFFFFF',
};

export const darkColors: typeof colors = {
  purple: '#8B73FF',
  purpleDark: '#B5A4FF',
  ink: '#F4F1FF',
  muted: '#A8A3BC',
  soft: '#1C1830',
  lilac: '#2A2444',
  border: '#3A3454',
  success: '#3DDB8A',
  danger: '#FF6B7A',
  dangerSoft: '#3A1822',
  warning: '#F0A04B',
  white: '#FFFFFF',
  black: '#000000',
  gold: '#F5C518',
  background: '#12101C',
  card: '#1C1830',
};

export type ThemeName = 'light' | 'dark';

export const paletteFor = (theme: ThemeName) => (theme === 'dark' ? darkColors : colors);

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
};

export const spacing = {
  screen: 20,
  stack: 12,
};

export const BRAND = {
  name: 'Study Flow',
  assistant: 'Leo',
  tagline: 'BUILT FOR DREAMERS. MADE FOR ACHIEVERS.',
  launchAt: '2026-09-12T13:30:00.000Z',
  website: 'https://getstudyflow.in',
  emailDomain: 'auth.getstudyflow.in',
  supportEmail: 'hello@getstudyflow.in',
};
