import { Platform } from 'react-native';

import { alertDialog } from '@/lib/dialog';

export const WEB_SUBSCRIBE_TITLE = 'Subscriptions are purchased through Google Play on Android.';
export const WEB_SUBSCRIBE_MESSAGE = 'Open the Android app to subscribe.';

export function shouldAttemptStorePurchase() {
  return Platform.OS !== 'web';
}

export function notifyWebSubscribeOnAndroid() {
  return alertDialog(WEB_SUBSCRIBE_TITLE, WEB_SUBSCRIBE_MESSAGE);
}
