import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');

function collectSourceFiles(dir: string, acc: string[] = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.expo') continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectSourceFiles(full, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

describe('PlatformDateTimePicker web safety', () => {
  it('uses local HTML inputs on web and never imports DateTimePicker', () => {
    const source = readFileSync(path.join(root, 'components/PlatformDateTimePicker.web.tsx'), 'utf8');
    expect(source).not.toMatch(/@react-native-community\/datetimepicker/);
    expect(source).not.toMatch(/<DateTimePicker/);
    expect(source).toMatch(/datetime-local/);
    expect(source).toMatch(/getFullYear\(\)/);
    expect(source).toMatch(/getMonth\(\)/);
    expect(source).toMatch(/getDate\(\)/);
    expect(source).toMatch(/getHours\(\)/);
    expect(source).toMatch(/getMinutes\(\)/);
    expect(source).not.toMatch(/toISOString\(\)\.slice\(0,\s*16\)/);
  });

  it('keeps the native DateTimePicker only in the non-web implementation', () => {
    const source = readFileSync(path.join(root, 'components/PlatformDateTimePicker.tsx'), 'utf8');
    expect(source).toMatch(/from '@react-native-community\/datetimepicker'/);
    expect(source).toMatch(/<DateTimePicker/);
    expect(source).not.toMatch(/createElement\('input'/);
  });

  it('does not let screens import DateTimePicker', () => {
    const screens = ['app/task/new.tsx', 'app/task/[id].tsx', 'app/goals.tsx'];
    const hits: string[] = [];
    for (const file of screens) {
      const source = readFileSync(path.join(root, file), 'utf8');
      expect(source).toMatch(/PlatformDateTimePicker/);
      if (source.includes('@react-native-community/datetimepicker') || /<DateTimePicker\b/.test(source)) {
        hits.push(file);
      }
    }
    expect(hits).toEqual([]);
  });

  it('allows a direct datetimepicker import only in PlatformDateTimePicker.tsx', () => {
    const hits: string[] = [];
    for (const dir of ['app', 'components', 'lib', 'providers', 'services']) {
      for (const file of collectSourceFiles(path.join(root, dir))) {
        const source = readFileSync(file, 'utf8');
        if (!source.includes("from '@react-native-community/datetimepicker'") && !source.includes('from "@react-native-community/datetimepicker"')) {
          continue;
        }
        hits.push(path.relative(root, file).replace(/\\/g, '/'));
      }
    }
    expect(hits).toEqual(['components/PlatformDateTimePicker.tsx']);
  });
});
