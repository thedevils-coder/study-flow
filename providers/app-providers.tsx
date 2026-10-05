import React, { useCallback, useState } from 'react';

import { WebDialogHost } from '@/components/WebDialogHost';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { StudyProvider, useStudy } from '@/providers/study-provider';
import type { ThemePreference } from '@/constants/theme';

function ThemedTree({ children }: { children: React.ReactNode }) {
  const { settings, saveSettings } = useStudy();
  const [localPreference, setLocalPreference] = useState<ThemePreference>('system');
  const preference = settings?.theme ?? localPreference;

  const onPreferenceChange = useCallback(
    (next: ThemePreference) => {
      setLocalPreference(next);
      void saveSettings({ theme: next });
    },
    [saveSettings],
  );

  return (
    <ThemeProvider preference={preference} onPreferenceChange={onPreferenceChange}>
      {children}
    </ThemeProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <StudyProvider>
        <ThemedTree>
          {children}
          <WebDialogHost />
        </ThemedTree>
      </StudyProvider>
    </AuthProvider>
  );
}
