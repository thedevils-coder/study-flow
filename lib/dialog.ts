import { Alert, Platform } from 'react-native';

export function confirmDialog(input: {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = input.message ? `${input.title}\n\n${input.message}` : input.title;
    return Promise.resolve(typeof globalThis.confirm === 'function' && globalThis.confirm(text));
  }

  return new Promise((resolve) => {
    Alert.alert(input.title, input.message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: input.confirmLabel ?? 'OK',
        style: input.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export function alertDialog(title: string, message?: string) {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    if (typeof globalThis.alert === 'function') globalThis.alert(text);
    return;
  }
  Alert.alert(title, message);
}
