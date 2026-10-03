import { router } from 'expo-router';

/** Web has no stack history when a screen is opened by URL; native usually does. */
export function goBackOrHome() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/');
}
