import React, { createElement, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { registerWebDialogPresenter, type WebDialogRequest } from '@/lib/dialog';

/**
 * In-app dialogs on web. window.confirm / window.alert can be blocked by Chrome,
 * and React Native Web's Alert.alert is a no-op. Native platforms keep Alert.alert.
 */
export function WebDialogHost() {
  const [request, setRequest] = useState<WebDialogRequest | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    registerWebDialogPresenter(setRequest);
    return () => {
      registerWebDialogPresenter(null);
    };
  }, []);

  if (Platform.OS !== 'web' || !request) return null;

  const confirmLabel = request.type === 'confirm' ? (request.confirmLabel ?? 'OK') : 'OK';
  const destructive = request.type === 'confirm' ? Boolean(request.destructive) : false;

  return createElement(
    'div',
    {
      role: 'dialog',
      'aria-modal': 'true',
      'data-testid': 'web-dialog',
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 2147483000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 12, 41, 0.55)',
        pointerEvents: 'auto',
        padding: 24,
      },
    },
    createElement(
      'div',
      {
        style: {
          width: 'min(420px, 100%)',
          backgroundColor: '#fff',
          color: '#15132A',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
          pointerEvents: 'auto',
        },
      },
      createElement('div', { style: { fontSize: 18, fontWeight: 800, marginBottom: 8 } }, request.title),
      request.message
        ? createElement('div', { style: { fontSize: 15, lineHeight: '22px', marginBottom: 18 } }, request.message)
        : null,
      createElement(
        'div',
        { style: { display: 'flex', justifyContent: 'flex-end', gap: 10 } },
        request.type === 'confirm'
          ? createElement(
              'button',
              {
                type: 'button',
                onClick: () => request.resolve(false),
                style: buttonStyle(false),
              },
              'Cancel',
            )
          : null,
        createElement(
          'button',
          {
            type: 'button',
            onClick: () => {
              if (request.type === 'confirm') request.resolve(true);
              else request.resolve();
            },
            style: buttonStyle(destructive),
          },
          confirmLabel,
        ),
      ),
    ),
  );
}

function buttonStyle(destructive: boolean): React.CSSProperties {
  return {
    appearance: 'none',
    border: 'none',
    borderRadius: 999,
    padding: '10px 16px',
    fontWeight: 800,
    cursor: 'pointer',
    backgroundColor: destructive ? '#E11D48' : '#5932E8',
    color: '#fff',
    pointerEvents: 'auto',
  };
}
