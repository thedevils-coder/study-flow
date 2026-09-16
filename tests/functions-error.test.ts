import { describe, expect, it } from 'vitest';

import { isMissingColumnError, isMissingRelationError, userFacingError } from '@/lib/errors';
import { describeMissingRelation, parseFunctionsInvokeFailure } from '@/lib/functions-error';

describe('Supabase / Edge Function errors', () => {
  it('recognizes missing tables and columns', () => {
    expect(
      isMissingRelationError({
        code: 'PGRST205',
        message: "Could not find the table 'public.study_goals' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isMissingColumnError({
        code: 'PGRST204',
        message: "Could not find the 'focus_minutes' column of 'user_settings' in the schema cache",
      }),
    ).toBe(true);
  });

  it('parses a Functions 404 body instead of the generic non-2xx message', async () => {
    const parsed = await parseFunctionsInvokeFailure({
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: { status: 404 },
      },
      data: { code: 'NOT_FOUND', message: 'Requested function was not found' },
    });
    expect(parsed.httpStatus).toBe(404);
    expect(parsed.message).toMatch(/ai-generate Edge Function is not deployed/i);
  });

  it('keeps structured Edge Function errors', async () => {
    const parsed = await parseFunctionsInvokeFailure({
      error: { message: 'Edge Function returned a non-2xx status code', context: { status: 503 } },
      data: {
        error: 'AI generation is not configured on the server yet.',
        code: 'ai_not_configured',
      },
    });
    expect(parsed.code).toBe('ai_not_configured');
    expect(parsed.message).toMatch(/not configured/i);
    expect(parsed.httpStatus).toBe(503);
  });

  it('surfaces missing-relation guidance', () => {
    expect(describeMissingRelation('study_goals')).toMatch(/202609160002_align_existing_project/);
  });

  it('does not hide PostgREST messages in development', () => {
    expect(
      userFacingError(
        { code: 'PGRST205', message: "Could not find the table 'public.study_goals' in the schema cache" },
        'Unable to save the goal.',
      ),
    ).toMatch(/study_goals/);
  });
});
