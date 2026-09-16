import Constants from 'expo-constants';

import { publicConfig } from '@/lib/config';
import {
  TESTER_COPY,
  TESTER_DISPLAY_NAME,
  TESTER_EMAIL,
  TESTER_PRODUCT_ID,
  TESTER_SEED_VERSION,
  applyTesterDemoAccess as applyTesterDemoAccessCore,
  extraFlag,
  isTesterBuildEnabled as isTesterBuildEnabledCore,
  isTesterEmail as isTesterEmailCore,
  resolveTesterEmail,
  testerDemoSnapshot,
} from '@/lib/tester-core';
import type { UserSession } from '@/types';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export {
  TESTER_COPY,
  TESTER_DISPLAY_NAME,
  TESTER_EMAIL,
  TESTER_PRODUCT_ID,
  TESTER_SEED_VERSION,
  testerDemoSnapshot,
};

export function isTesterBuildEnabled(input?: {
  testerAccountEnabled?: boolean;
  isDev?: boolean;
}) {
  return isTesterBuildEnabledCore({
    testerAccountEnabled: input?.testerAccountEnabled ?? extraFlag(extra.testerAccountEnabled),
    isDev: input?.isDev,
  });
}

export function testerEmail() {
  return resolveTesterEmail(publicConfig.testerEmail || undefined);
}

export function isTesterEmail(email: string | null | undefined) {
  return isTesterEmailCore(email, testerEmail());
}

export function isTesterSession(session: Pick<UserSession, 'email'> | null | undefined) {
  return Boolean(session && isTesterEmail(session.email));
}

export function applyTesterDemoAccess(session: UserSession, now = new Date()): UserSession {
  return applyTesterDemoAccessCore(session, now, isTesterBuildEnabled(), testerEmail());
}
