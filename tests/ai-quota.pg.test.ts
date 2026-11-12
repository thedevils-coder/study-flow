import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const USER = '11111111-1111-1111-1111-111111111111';
const MIGRATION = readFileSync(
  path.resolve(__dirname, '../supabase/migrations/202611120003_ai_generation_reservations.sql'),
  'utf8',
);

let database = '';
let skipReason: string | null = null;

async function psql(db: string, sql: string) {
  const { stdout } = await execFileAsync('psql', ['-d', db, '-v', 'ON_ERROR_STOP=1', '-A', '-t', '-c', sql], {
    timeout: 20000,
    maxBuffer: 2_000_000,
  });
  return stdout.trim();
}

describe('PostgreSQL AI quota reservation RPC', () => {
  beforeAll(async () => {
    try {
      await execFileAsync('psql', ['-d', 'postgres', '-c', 'SELECT 1'], { timeout: 5000 });
    } catch {
      skipReason = 'PostgreSQL is unavailable; integration tests skipped.';
      return;
    }
    database = `studyflow_itest_${process.pid}_${randomBytes(3).toString('hex')}_test`;
    await psql('postgres', `CREATE DATABASE "${database}" TEMPLATE template0`);
    await psql(
      database,
      `
      create table public.profiles (id uuid primary key);
      insert into public.profiles (id) values ('${USER}');
      create table public.ai_generations (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references public.profiles(id) on delete cascade,
        kind text not null default 'other',
        prompt text not null default 'prompt',
        status text not null default 'success',
        created_at timestamptz not null default now()
      );
      `,
    );
    await execFileAsync('psql', ['-d', database, '-v', 'ON_ERROR_STOP=1', '-f', path.resolve(__dirname, '../supabase/migrations/202611120003_ai_generation_reservations.sql')], {
      timeout: 20000,
    });
  });

  afterAll(async () => {
    if (!database) return;
    await psql('postgres', `DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`).catch(() => undefined);
  });

  it('applies the reservation migration and enforces Basic 20 under concurrent RPC calls', async (ctx) => {
    if (skipReason) {
      ctx.skip();
      return;
    }
    expect(MIGRATION).toMatch(/private.ai_generation_reservations/);
    const calls = Array.from({ length: 30 }, () =>
      psql(database, `select public.reserve_ai_generation_slot('${USER}', 'basic')::text`),
    );
    const rows = await Promise.all(calls);
    const parsed = rows.map((row) => JSON.parse(row) as { allowed: boolean });
    expect(parsed.filter((row) => row.allowed)).toHaveLength(20);
    expect(parsed.filter((row) => !row.allowed)).toHaveLength(10);
    const active = await psql(database, `select count(*) from private.ai_generation_reservations where user_id = '${USER}'`);
    expect(Number(active)).toBe(20);
  });

  it('releases failed holds and ignores expired reservations', async (ctx) => {
    if (skipReason) {
      ctx.skip();
      return;
    }
    await psql(database, `delete from private.ai_generation_reservations; delete from public.ai_generations;`);
    const first = JSON.parse(await psql(database, `select public.reserve_ai_generation_slot('${USER}', 'basic')::text`)) as {
      allowed: boolean;
      id: string;
    };
    expect(first.allowed).toBe(true);
    expect(await psql(database, `select public.release_ai_generation_slot('${first.id}', '${USER}')`)).toBe('t');
    await psql(
      database,
      `insert into public.ai_generations (user_id, status) values ('${USER}', 'failed')`,
    );
    const afterFail = JSON.parse(
      await psql(database, `select public.reserve_ai_generation_slot('${USER}', 'basic')::text`),
    ) as { allowed: boolean; used: number };
    expect(afterFail.allowed).toBe(true);
    expect(afterFail.used).toBe(1);

    await psql(
      database,
      `update private.ai_generation_reservations
          set created_at = now() - interval '11 minutes',
              expires_at = now() - interval '1 minute'`,
    );
    const afterExpiry = JSON.parse(
      await psql(database, `select public.reserve_ai_generation_slot('${USER}', 'basic')::text`),
    ) as { allowed: boolean; used: number };
    expect(afterExpiry.allowed).toBe(true);
    expect(afterExpiry.used).toBe(1);
  });
});
