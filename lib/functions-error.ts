export type StructuredServiceError = {
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function payloadFromUnknown(value: unknown): StructuredServiceError | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return payloadFromUnknown(JSON.parse(trimmed));
    } catch {
      return { error: trimmed };
    }
  }
  const record = asRecord(value);
  if (!record) return null;
  return {
    error: typeof record.error === 'string' ? record.error : undefined,
    message: typeof record.message === 'string' ? record.message : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    details: record.details,
  };
}

export async function parseFunctionsInvokeFailure(input: { error: unknown; data: unknown }) {
  const errorRecord = asRecord(input.error);
  const context = asRecord(errorRecord?.context);
  const httpStatus =
    (typeof context?.status === 'number' ? context.status : undefined) ??
    (typeof errorRecord?.status === 'number' ? errorRecord.status : undefined);
  const payload = payloadFromUnknown(input.data) ?? payloadFromUnknown(input.error) ?? {};
  let message = (payload.error || payload.message || (typeof errorRecord?.message === 'string' ? errorRecord.message : '') ||
    'Unable to generate a response.'
  ).replace(/\s+/g, ' ').trim();

  if (httpStatus === 404 || payload.code === 'NOT_FOUND' || /requested function was not found/i.test(message)) {
    message =
      'The ai-generate Edge Function is not deployed. Deploy supabase/functions/ai-generate and set the required server secrets.';
  } else if (/non[- ]?2xx status code/i.test(message) && (payload.error || payload.message)) {
    message = String(payload.error || payload.message);
  }

  if (httpStatus && !/HTTP \d{3}/.test(message)) {
    message = `${message} (HTTP ${httpStatus}${payload.code ? `, ${payload.code}` : ''})`;
  }

  return { httpStatus, code: payload.code, message, payload };
}
