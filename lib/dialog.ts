import { Alert, Platform } from 'react-native';

export type ConfirmDialogInput = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
};

export type WebDialogRequest =
  | (ConfirmDialogInput & { type: 'confirm'; resolve: (value: boolean) => void })
  | { type: 'alert'; title: string; message?: string; resolve: () => void };

type Presenter = (request: WebDialogRequest | null) => void;

let presenter: Presenter | null = null;
let active: WebDialogRequest | null = null;

export function registerWebDialogPresenter(next: Presenter | null) {
  presenter = next;
  if (next && active) next(active);
}

function present(request: WebDialogRequest) {
  active = request;
  if (presenter) {
    presenter(request);
    return;
  }
  if (request.type === 'confirm') {
    const text = request.message ? `${request.title}\n\n${request.message}` : request.title;
    request.resolve(typeof globalThis.confirm === 'function' && globalThis.confirm(text));
    active = null;
    return;
  }
  const text = request.message ? `${request.title}\n\n${request.message}` : request.title;
  if (typeof globalThis.alert === 'function') globalThis.alert(text);
  request.resolve();
  active = null;
}

export function completeWebDialog() {
  active = null;
  presenter?.(null);
}

export function confirmDialog(input: ConfirmDialogInput): Promise<boolean> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      present({
        type: 'confirm',
        ...input,
        resolve: (value) => {
          completeWebDialog();
          resolve(value);
        },
      });
    });
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
    return new Promise<void>((resolve) => {
      present({
        type: 'alert',
        title,
        message,
        resolve: () => {
          completeWebDialog();
          resolve();
        },
      });
    });
  }
  Alert.alert(title, message);
}
