import { afterEach, describe, expect, it, vi } from 'vitest';
import { Alert, Platform } from 'react-native';

import {
  WEB_SUBSCRIBE_MESSAGE,
  WEB_SUBSCRIBE_TITLE,
  notifyWebSubscribeOnAndroid,
  shouldAttemptStorePurchase,
} from '@/lib/web-subscription';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
  Alert: { alert: vi.fn() },
}));

describe('web subscription plan clicks', () => {
  afterEach(() => {
    Platform.OS = 'web';
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('does not attempt Google Play Billing on web', () => {
    Platform.OS = 'web';
    expect(shouldAttemptStorePurchase()).toBe(false);
  });

  it('keeps the Android store purchase path enabled', () => {
    Platform.OS = 'android';
    expect(shouldAttemptStorePurchase()).toBe(true);
  });

  it('shows a dismissible Google Play Android message instead of a fake purchase', async () => {
    const alert = vi.fn();
    vi.stubGlobal('alert', alert);
    await notifyWebSubscribeOnAndroid();
    expect(alert).toHaveBeenCalledWith(`${WEB_SUBSCRIBE_TITLE}\n\n${WEB_SUBSCRIBE_MESSAGE}`);
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
