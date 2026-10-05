import { beforeEach, describe, expect, it, vi } from 'vitest';

const { back, replace, canGoBack } = vi.hoisted(() => ({
  back: vi.fn(),
  replace: vi.fn(),
  canGoBack: vi.fn(),
}));

vi.mock('expo-router', () => ({
  router: { back, replace, canGoBack },
}));

import { goBackOrHome } from '@/lib/navigation';

describe('goBackOrHome', () => {
  beforeEach(() => {
    back.mockReset();
    replace.mockReset();
    canGoBack.mockReset();
  });

  it('uses router.back when the navigator has history', () => {
    canGoBack.mockReturnValue(true);
    goBackOrHome();
    expect(back).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });

  it('replaces home instead of dispatching an unhandled GO_BACK on web', () => {
    canGoBack.mockReturnValue(false);
    goBackOrHome();
    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/');
  });
});
