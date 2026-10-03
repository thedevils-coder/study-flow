import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('web DateTimeField module graph', () => {
  it('does not import datetimepicker in the web implementation', () => {
    const source = readFileSync(path.resolve(__dirname, '../components/DateTimeField.web.tsx'), 'utf8');
    expect(source).not.toMatch(/@react-native-community\/datetimepicker/);
    expect(source).not.toMatch(/<DateTimePicker/);
    expect(source).toMatch(/type: mode === 'date' \? 'date' : 'time'/);
  });

  it('keeps the native DateTimePicker only in the non-web implementation', () => {
    const source = readFileSync(path.resolve(__dirname, '../components/DateTimeField.tsx'), 'utf8');
    expect(source).toMatch(/from '@react-native-community\/datetimepicker'/);
    expect(source).toMatch(/<DateTimePicker/);
    expect(source).not.toMatch(/createElement\('input'/);
  });
});
