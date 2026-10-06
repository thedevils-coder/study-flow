import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');

function collectSourceFiles(dir: string, acc: string[] = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.expo' || entry === 'coverage') continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectSourceFiles(full, acc);
      continue;
    }
    if (/\.(ts|tsx|js|jsx|json|md|toml|html|example)$/.test(entry) || entry === '.env.example') acc.push(full);
  }
  return acc;
}

describe('RevenueCat removal', () => {
  it('has no active RevenueCat usage outside generated folders', () => {
    const files = [
      path.join(root, 'package.json'),
      path.join(root, 'app.json'),
      path.join(root, 'app.config.js'),
      path.join(root, 'README.md'),
      path.join(root, '.env.example'),
    ];
    for (const dir of ['app', 'components', 'lib', 'providers', 'services', 'supabase', 'tests', 'docs', 'website']) {
      collectSourceFiles(path.join(root, dir), files);
    }

    const hits: string[] = [];
    const banned =
      /revenuecat|react-native-purchases|EXPO_PUBLIC_REVENUECAT|REVENUECAT_WEBHOOK_SECRET|Purchases\.configure/i;
    for (const file of files) {
      const relative = path.relative(root, file);
      if (relative.split(path.sep)[0] === 'dist') continue;
      if (relative.endsWith('no-revenuecat.test.ts')) continue;
      if (relative.startsWith(`supabase${path.sep}migrations${path.sep}`)) continue;
      const source = readFileSync(file, 'utf8');
      if (banned.test(source)) hits.push(relative);
    }

    expect(hits).toEqual([]);
  });

  it('does not put Google Play service-account credentials in client code', () => {
    const files: string[] = [];
    for (const dir of ['app', 'components', 'lib', 'providers', 'services']) {
      collectSourceFiles(path.join(root, dir), files);
    }
    const secretHits = files.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return /GOOGLE_PLAY_SERVICE_ACCOUNT_JSON|BEGIN PRIVATE KEY/i.test(source);
    });
    expect(secretHits.map((file) => path.relative(root, file))).toEqual([]);
  });
});
