import { afterEach, describe, expect, it, vi } from 'vitest';
import { Alert, Platform } from 'react-native';

import { alertDialog, confirmDialog, registerWebDialogPresenter } from '@/lib/dialog';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
  Alert: { alert: vi.fn() },
}));

describe('web and native dialogs', () => {
  afterEach(() => {
    Platform.OS = 'web';
    registerWebDialogPresenter(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('uses window.confirm on web so Sign out and Delete account can complete', async () => {
    const confirm = vi.fn(() => true);
    vi.stubGlobal('confirm', confirm);
    await expect(
      confirmDialog({
        title: 'Sign out',
        message: 'Sign out of Study Flow?',
        confirmLabel: 'Sign out',
        destructive: true,
      }),
    ).resolves.toBe(true);
    expect(confirm).toHaveBeenCalledWith('Sign out\n\nSign out of Study Flow?');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('uses the in-app web dialog host instead of window.confirm when registered', async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    registerWebDialogPresenter((request) => {
      if (request?.type === 'confirm') request.resolve(true);
    });
    await expect(
      confirmDialog({
        title: 'Sign out',
        message: 'Sign out of Study Flow?',
        confirmLabel: 'Sign out',
        destructive: true,
      }),
    ).resolves.toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('returns false when the web confirm is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    await expect(confirmDialog({ title: 'Sign out', message: 'Leave?' })).resolves.toBe(false);
  });

  it('keeps Alert.alert on Android/iOS', async () => {
    Platform.OS = 'android';
    vi.mocked(Alert.alert).mockImplementation((_title, _message, buttons) => {
      const confirm = buttons?.find((button) => button.style === 'destructive');
      confirm?.onPress?.();
    });
    await expect(
      confirmDialog({
        title: 'Delete account',
        message: 'This cannot be undone.',
        confirmLabel: 'Delete my account',
        destructive: true,
      }),
    ).resolves.toBe(true);
    expect(Alert.alert).toHaveBeenCalled();
    expect(vi.mocked(Alert.alert).mock.calls[0]?.[2]?.map((button) => button.text)).toEqual([
      'Cancel',
      'Delete my account',
    ]);
  });

  it('shows window.alert on web instead of the no-op Alert.alert', async () => {
    const alert = vi.fn();
    vi.stubGlobal('alert', alert);
    await alertDialog('Delete account', 'Unable to delete the account right now.');
    expect(alert).toHaveBeenCalledWith('Delete account\n\nUnable to delete the account right now.');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('uses the in-app web dialog host instead of window.alert when registered', async () => {
    const alert = vi.fn();
    vi.stubGlobal('alert', alert);
    registerWebDialogPresenter((request) => {
      if (request?.type === 'alert') request.resolve();
    });
    await alertDialog('Task', 'Enter a task title.');
    expect(alert).not.toHaveBeenCalled();
  });
});
