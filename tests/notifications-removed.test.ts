import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Notifications feature removal', () => {
  it('does not keep the Settings notifications UI', () => {
    const source = readFileSync(path.resolve(__dirname, '../app/settings.tsx'), 'utf8');
    expect(source).not.toMatch(/Notifications \/ reminders/);
    expect(source).not.toMatch(/notifications-outline/);
    expect(source).not.toMatch(/Study reminders/);
  });

  it('does not keep expo-notifications in the app package', () => {
    const pkg = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.['expo-notifications']).toBeUndefined();
    const appJson = readFileSync(path.resolve(__dirname, '../app.json'), 'utf8');
    expect(appJson).not.toMatch(/expo-notifications/);
  });
});
