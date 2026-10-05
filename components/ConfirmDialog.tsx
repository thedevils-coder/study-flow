import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/providers/theme-provider';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.card,
              borderColor: colors.divider,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {title}
          </Text>

          <Text style={[styles.message, { color: colors.secondaryText }]}>
            {message}
          </Text>

          <View style={styles.actions}>
            {!loading ? (
              <Pressable
                onPress={onCancel}
                style={[
                  styles.button,
                  styles.cancelButton,
                  {
                    borderColor: colors.divider,
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <Text style={[styles.cancelText, { color: colors.text }]}>
                  {cancelLabel}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              disabled={loading}
              onPress={onConfirm}
              style={[
                styles.button,
                {
                  backgroundColor: destructive
                    ? colors.danger
                    : colors.accent,
                  opacity: loading ? 0.7 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.confirmText}>
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  dialog: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },

  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },

  button: {
    minHeight: 44,
    minWidth: 110,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  cancelButton: {
    borderWidth: 1,
  },

  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },

  confirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});