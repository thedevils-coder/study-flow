import Constants from 'expo-constants';

export function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

export function isProductionClient() {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  if (extra.testerAccountEnabled === false || extra.testerAccountEnabled === 'false') {
    return true;
  }
  return false;
}

export function shouldSurfaceDeveloperErrors() {
  if (isProductionClient()) return false;
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  return true;
}
