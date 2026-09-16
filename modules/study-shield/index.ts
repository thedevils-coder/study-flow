import { Platform } from 'react-native';

export type StudyShieldNative = {
  isNativeAvailable: () => boolean;
  hasNotificationPolicyAccess: () => boolean;
  openNotificationPolicySettings: () => void;
  openZenSettings: () => void;
  setSessionFilter: (enable: boolean) => boolean;
};

export function getStudyShieldNative(): StudyShieldNative | null {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo-modules-core') as {
      requireNativeModule: (name: string) => StudyShieldNative;
    };
    const native = requireNativeModule('StudyShield');
    if (!native || typeof native.hasNotificationPolicyAccess !== 'function') return null;
    return native;
  } catch {
    return null;
  }
}
