/**
 * AI Meter counts a generation only after a successful provider response
 * is stored. Failed, cancelled, or partial-then-failed streams are not
 * inserted and therefore do not change remaining allowance.
 */
export function shouldCountUsage(input: { stored: boolean; success: boolean }) {
  return input.stored && input.success;
}

export function remainingAllowance(used: number, limit: number) {
  return Math.max(0, limit - Math.max(0, used));
}

export function startOfUtcDay(now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export function summarizeDailyUsage(
  items: Array<{ createdAt: string }>,
  limit: number,
  now = new Date(),
) {
  const start = startOfUtcDay(now).getTime();
  const used = items.filter((item) => {
    const stamp = new Date(item.createdAt).getTime();
    return !Number.isNaN(stamp) && stamp >= start;
  }).length;
  return { used, limit, remaining: remainingAllowance(used, limit) };
}
