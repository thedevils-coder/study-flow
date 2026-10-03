import { createRequire } from 'node:module';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = path.resolve(__dirname, '..');

const metroWebProductionCaller = {
  name: 'metro',
  bundler: 'metro',
  platform: 'web',
  isDev: false,
  projectRoot: root,
};

function collectSourceFiles(dir: string, acc: string[] = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.expo') continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectSourceFiles(full, acc);
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

describe('Expo web production Supabase env', () => {
  it('reads Supabase public values through static process.env members', () => {
    const source = readFileSync(path.join(root, 'lib/config.ts'), 'utf8');
    expect(source).toMatch(/process\.env\.EXPO_PUBLIC_SUPABASE_URL/);
    expect(source).toMatch(/process\.env\.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    expect(source).not.toMatch(/env\(['"]EXPO_PUBLIC_SUPABASE_URL['"]\)/);
    expect(source).not.toMatch(/env\(['"]EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY['"]\)/);
    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('copies public Supabase env into Expo extra at config evaluation, never the service-role key', () => {
    const source = readFileSync(path.join(root, 'app.config.js'), 'utf8');
    expect(source).toMatch(/EXPO_PUBLIC_SUPABASE_URL:\s*process\.env\.EXPO_PUBLIC_SUPABASE_URL/);
    expect(source).toMatch(
      /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:\s*process\.env\.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
    expect(source).not.toMatch(/process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*:/);
  });

  it('does not put the service-role key in client source', () => {
    const clientDirs = ['app', 'components', 'lib', 'providers', 'services'];
    const hits: string[] = [];
    for (const dir of clientDirs) {
      for (const file of collectSourceFiles(path.join(root, dir))) {
        const source = readFileSync(file, 'utf8');
        if (source.includes('SUPABASE_SERVICE_ROLE_KEY') || source.includes('SERVICE_ROLE_KEY')) {
          hits.push(path.relative(root, file));
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('inlines static EXPO_PUBLIC Supabase members in production web Babel, not dynamic process.env[key]', () => {
    const babel = require('@babel/core') as typeof import('@babel/core');
    const url = 'https://web-export-verify.supabase.co';
    const key = 'sb_publishable_web_export_verify_key';
    const previousUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const previousKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.EXPO_PUBLIC_SUPABASE_URL = url;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
    try {
      const staticResult = babel.transformSync(
        [
          'export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;',
          'export const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;',
        ].join('\n'),
        {
          filename: path.join(root, 'lib/config.ts'),
          presets: ['babel-preset-expo'],
          caller: metroWebProductionCaller,
          babelrc: false,
          configFile: false,
        },
      );
      expect(staticResult?.code).toContain(url);
      expect(staticResult?.code).toContain(key);
      expect(staticResult?.code).not.toMatch(/process\.env\.EXPO_PUBLIC_SUPABASE_URL/);

      const dynamicResult = babel.transformSync(
        "const key = 'EXPO_PUBLIC_SUPABASE_URL';\nexport const supabaseUrl = process.env[key];",
        {
          filename: path.join(root, 'lib/config.ts'),
          presets: ['babel-preset-expo'],
          caller: metroWebProductionCaller,
          babelrc: false,
          configFile: false,
        },
      );
      expect(dynamicResult?.code).not.toContain(url);
      expect(dynamicResult?.code).toMatch(/process\.env/);
    } finally {
      if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      else process.env.EXPO_PUBLIC_SUPABASE_URL = previousUrl;
      if (previousKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      else process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
    }
  });
});
