export const INTERSTITIAL_COOLDOWN_MS = 90_000;

export type InterstitialReason = 'goal_save' | 'task_save' | 'session_complete';

let lastShownAt = 0;
let inFlight = false;
const shownTokens = new Set<string>();

function tokenKey(reason: InterstitialReason, token?: string) {
  return token ? `${reason}:${token}` : '';
}

export function resetAdPolicyForTests() {
  lastShownAt = 0;
  inFlight = false;
  shownTokens.clear();
}

export function canShowInterstitial(input: {
  adsEnabled: boolean;
  reason: InterstitialReason;
  token?: string;
  now?: number;
}) {
  if (!input.adsEnabled) return false;
  if (inFlight) return false;
  const key = tokenKey(input.reason, input.token);
  if (key && shownTokens.has(key)) return false;
  const now = input.now ?? Date.now();
  if (lastShownAt > 0 && now - lastShownAt < INTERSTITIAL_COOLDOWN_MS) return false;
  return true;
}

export function beginInterstitialAttempt(reason: InterstitialReason, token?: string) {
  inFlight = true;
  const key = tokenKey(reason, token);
  if (key) shownTokens.add(key);
}

export function finishInterstitialAttempt(shown: boolean, now = Date.now()) {
  inFlight = false;
  if (shown) lastShownAt = now;
}

export function hasInterstitialCooldown(now = Date.now()) {
  return lastShownAt > 0 && now - lastShownAt < INTERSTITIAL_COOLDOWN_MS;
}
