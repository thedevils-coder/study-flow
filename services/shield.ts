import { Platform } from 'react-native';
import * as KeepAwake from 'expo-keep-awake';

export type ShieldCapability = {
  keepAwake: boolean;
  systemDndHint: boolean;
  appBlocking: boolean;
};

export function detectShieldSupport(): ShieldCapability {
  return {
    keepAwake: Platform.OS !== 'web',
    systemDndHint: Platform.OS === 'android',
    appBlocking: false,
  };
}

export const shieldService = {
  capabilities: detectShieldSupport(),

  async enableSessionGuards() {
    if (this.capabilities.keepAwake) {
      KeepAwake.activateKeepAwakeAsync('study-flow-focus');
    }
  },

  async disableSessionGuards() {
    if (this.capabilities.keepAwake) {
      KeepAwake.deactivateKeepAwake('study-flow-focus');
    }
  },
};
