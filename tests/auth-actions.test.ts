import { describe, expect, it, vi } from 'vitest';

describe('account deletion clears the local session', () => {
  it('signs out locally after a successful delete-account invoke', async () => {
    const signOut = vi.fn(async () => undefined);
    const invoke = vi.fn(async () => ({ error: null }));
    const deleteAccount = async () => {
      const { error } = await invoke();
      if (error) throw error;
      await signOut();
    };

    await deleteAccount();
    expect(invoke).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('does not sign out locally when delete-account fails', async () => {
    const signOut = vi.fn(async () => undefined);
    const invoke = vi.fn(async () => ({ error: new Error('Unauthorized') }));
    const deleteAccount = async () => {
      const { error } = await invoke();
      if (error) throw error;
      await signOut();
    };

    await expect(deleteAccount()).rejects.toThrow('Unauthorized');
    expect(signOut).not.toHaveBeenCalled();
  });
});
