import { Platform } from 'react-native';

export function webDebug(message: string) {
  if (Platform.OS !== 'web') return;
  console.log(`[WEB DEBUG] ${message}`);
}
