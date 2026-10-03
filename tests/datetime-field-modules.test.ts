import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

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

describe('web DateTimeField module graph', () => {
  it('does not import datetimepicker in the web implementation', () => {
    const source = readFileSync(path.join(root, 'components/PlatformDateTimePicker.web.tsx'), 'utf8');
    expect(source).not.toMatch(/@react-native-community\/datetimepicker/);
    expect(source).not.toMatch(/<DateTimePicker/);
    expect(source).toMatch(/datetime-local/);
    expect(source).not.toMatch(/toISOString\(\)\.slice\(0,\s*16\)/);
  });

  it('keeps the native DateTimePicker only in the non-web implementation', () => {
    const source = readFileSync(path.join(root, 'components/PlatformDateTimePicker.tsx'), 'utf8');
    expect(source).toMatch(/from '@react-native-community\/datetimepicker'/);
    expect(source).toMatch(/<DateTimePicker/);
    expect(source).not.toMatch(/createElement\('input'/);
    expect(source).not.toMatch(/datetime-local/);
  });

  it('does not let screens import or render DateTimePicker directly', () => {
    const screens = ['app/task/new.tsx', 'app/task/[id].tsx', 'app/goals.tsx'];
    for (const file of screens) {
      const source = readFileSync(path.join(root, file), 'utf8');
      expect(source).not.toMatch(/@react-native-community\/datetimepicker/);
      expect(source).not.toMatch(/<DateTimePicker/);
      expect(source).toMatch(/PlatformDateTimePicker/);
    }
  });

  it('does not load DateTimePicker from app screens or the web picker module', () => {
    const hits: string[] = [];
    for (const file of collectSourceFiles(path.join(root, 'app'))) {
      const source = readFileSync(file, 'utf8');
      if (source.includes('@react-native-community/datetimepicker') || source.includes('<DateTimePicker')) {
        hits.push(path.relative(root, file));
      }
    }
    const web = readFileSync(path.join(root, 'components/PlatformDateTimePicker.web.tsx'), 'utf8');
    expect(web).not.toMatch(/@react-native-community\/datetimepicker/);
    expect(hits).toEqual([]);
  });
});
