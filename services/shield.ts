import { Linking, Platform } from 'react-native';
import * as KeepAwake from 'expo-keep-awake';

import { isExpoGo } from '@/lib/runtime';
import { getStudyShieldNative } from '@/modules/study-shield';

const TAG = 'study-flow-focus';

export type ShieldState = {
  keepAwakeSupported: boolean;
  keepAwakeActive: boolean;
  nativeDndSupported: boolean;
  dndAccessGranted: boolean;
  dndActive: boolean;
  appBlocking: boolean;
  requiresDevBuild: boolean;
  summary: string;
};

function nativeOrNull() {
  return getStudyShieldNative();
}

function describeState(state: Omit<ShieldState, 'summary'>): string {
  const parts = [];
  parts.push(state.keepAwakeActive ? 'Screen stay-awake is on.' : 'Screen stay-awake is off.');
  if (state.appBlocking) {
    parts.push('App blocking is active.');
  } else {
    parts.push('Study Flow cannot block other apps on this device.');
  }
  if (state.nativeDndSupported) {
    if (!state.dndAccessGranted) {
      parts.push('Do Not Disturb access is not granted, so interruption filter is off.');
    } else if (state.dndActive) {
      parts.push('Do Not Disturb (priority only) is on for this session.');
    } else {
      parts.push('Do Not Disturb access is granted and idle.');
    }
  } else if (Platform.OS === 'android') {
    parts.push(
      state.requiresDevBuild
        ? 'Turning on Do Not Disturb from the app needs an EAS development or preview build, not Expo Go.'
        : 'Open Android Do Not Disturb settings yourself; the app cannot flip that switch without DND access.',
    );
  }
  return parts.join(' ');
}

export function detectShieldSupport() {
  return {
    keepAwake: Platform.OS !== 'web',
    systemDndHint: Platform.OS === 'android',
    nativeDnd: Boolean(nativeOrNull()?.isNativeAvailable?.()),
    appBlocking: false,
    expoGo: isExpoGo(),
  };
}

export const shieldService = {
  capabilities: detectShieldSupport(),

  readState(sessionRunning: boolean, extra?: { dndActive?: boolean }): ShieldState {
    const native = nativeOrNull();
    const nativeDndSupported = Boolean(native?.isNativeAvailable?.());
    const dndAccessGranted = Boolean(native?.hasNotificationPolicyAccess?.());
    const keepAwakeSupported = Platform.OS !== 'web';
    const state = {
      keepAwakeSupported,
      keepAwakeActive: keepAwakeSupported && sessionRunning,
      nativeDndSupported,
      dndAccessGranted,
      dndActive: Boolean(sessionRunning && extra?.dndActive),
      appBlocking: false,
      requiresDevBuild: Platform.OS === 'android' && (isExpoGo() || !nativeDndSupported),
    };
    return { ...state, summary: describeState(state) };
  },

  async openDndSettings() {
    const native = nativeOrNull();
    if (native?.openZenSettings) {
      native.openZenSettings();
      return true;
    }
    if (Platform.OS === 'android') {
      try {
        await Linking.sendIntent('android.settings.ZEN_MODE_SETTINGS');
        return true;
      } catch {
        await Linking.openSettings();
        return true;
      }
    }
    await Linking.openSettings();
    return true;
  },

  async openDndAccessSettings() {
    const native = nativeOrNull();
    if (native?.openNotificationPolicySettings) {
      native.openNotificationPolicySettings();
      return true;
    }
    if (Platform.OS === 'android') {
      try {
        await Linking.sendIntent('android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS');
        return true;
      } catch {
        await Linking.openSettings();
        return true;
      }
    }
    await Linking.openSettings();
    return true;
  },

  async enableSessionGuards() {
    const result = {
      keepAwake: false,
      dnd: false,
      dndAccessGranted: false,
      nativeDndSupported: false,
    };
    if (Platform.OS !== 'web') {
      await KeepAwake.activateKeepAwakeAsync(TAG);
      result.keepAwake = true;
    }
    const native = nativeOrNull();
    result.nativeDndSupported = Boolean(native?.isNativeAvailable?.());
    result.dndAccessGranted = Boolean(native?.hasNotificationPolicyAccess?.());
    if (native && result.dndAccessGranted) {
      result.dnd = Boolean(native.setSessionFilter(true));
    }
    return result;
  },

  async disableSessionGuards() {
    if (Platform.OS !== 'web') {
      KeepAwake.deactivateKeepAwake(TAG);
    }
    const native = nativeOrNull();
    if (native?.hasNotificationPolicyAccess?.()) {
      native.setSessionFilter(false);
    }
  },
};
