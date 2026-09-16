export type StructuredServiceError = {
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
  httpStatus?: number;
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
    httpStatus: typeof record.httpStatus === 'number' ? record.httpStatus : undefined,
  };
}

async function payloadFromContext(context: unknown): Promise<StructuredServiceError | null> {
  const record = asRecord(context);
  if (!record) return null;

  if (typeof record.json === 'function') {
    try {
      const clone = typeof record.clone === 'function' ? record.clone() : record;
      return payloadFromUnknown(await clone.json());
    } catch {
      // Body may already be consumed.
    }
  }

  if (typeof record.text === 'function') {
    try {
      const clone = typeof record.clone === 'function' ? record.clone() : record;
      return payloadFromUnknown(await clone.text());
    } catch {
      // Ignore unreadable bodies.
    }
  }

  return payloadFromUnknown(record.body ?? record.data ?? record);
}

export async function parseFunctionsInvokeFailure(input: {
  error: unknown;
  data: unknown;
}): Promise<{
  httpStatus?: number;
  code?: string;
  message: string;
  details?: unknown;
  payload: StructuredServiceError;
}> {
  const errorRecord = asRecord(input.error);
  const context = errorRecord?.context;
  const contextRecord = asRecord(context);
  const httpStatus =
    (typeof contextRecord?.status === 'number' ? contextRecord.status : undefined) ??
    (typeof errorRecord?.status === 'number' ? errorRecord.status : undefined);

  const fromData = payloadFromUnknown(input.data);
  const fromContext = await payloadFromContext(context);
  const fromError = payloadFromUnknown(input.error);
  const payload = fromData ?? fromContext ?? fromError ?? {};

  const platformCode = payload.code ?? (typeof errorRecord?.name === 'string' ? errorRecord.name : undefined);
  const rawMessage =
    payload.error ||
    payload.message ||
    (typeof errorRecord?.message === 'string' ? errorRecord.message : '') ||
    'Unable to generate a response.';

  let message = rawMessage.replace(/\s+/g, ' ').trim();
  if (
    httpStatus === 404 ||
    payload.code === 'NOT_FOUND' ||
    platformCode === 'NOT_FOUND' ||
    /requested function was not found/i.test(message)
  ) {
    message =
      'The ai-generate Edge Function is not deployed on this Supabase project. Deploy supabase/functions/ai-generate and set the AI_API_KEY secret (Dashboard → Edge Functions → Secrets).';
  } else if (/non[- ]?2xx status code/i.test(message)) {
    const nested = payload.error || payload.message;
    if (nested && nested !== message) message = nested;
    else if (httpStatus) {
      message = `Edge Function HTTP ${httpStatus}.`;
    }
  }

  if (httpStatus && !/HTTP \d{3}/.test(message) && !isProductionSafeOnly(message)) {
    message = `${message} (HTTP ${httpStatus}${payload.code ? `, ${payload.code}` : ''})`;
  }

  return {
    httpStatus,
    code: payload.code ?? platformCode,
    message,
    details: payload.details,
    payload: { ...payload, httpStatus: payload.httpStatus ?? httpStatus },
  };
}

function isProductionSafeOnly(message: string) {
  return /sign in required|upgrade|free trial|today’s AI limit|today's AI limit|not configured/i.test(message);
}

export function describeMissingRelation(table: string) {
  return `The ${table} table is missing in this Supabase project. Apply supabase/migrations/202609160002_align_existing_project.sql with \`supabase db push\` or the SQL editor, then retry.`;
}
