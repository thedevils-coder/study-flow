import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'light' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        s.button,
        variant === 'light' && s.light,
        variant === 'danger' && s.danger,
        (disabled || loading) && s.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'light' ? colors.purple : 'white'} />
      ) : (
        <Text
          style={[
            s.buttonText,
            variant === 'light' && s.lightText,
            variant === 'danger' && s.dangerText,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Row({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={s.row}
    >
      <View style={s.icon}>
        <Ionicons name={icon} size={18} color={colors.purple} />
      </View>
      <Text style={s.rowText}>{label}</Text>
      {value ? <Text style={s.value}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={17} color={colors.muted} /> : null}
    </Pressable>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <Card>
      <Text style={s.emptyTitle}>{title}</Text>
      {body ? <Text style={s.emptyBody}>{body}</Text> : null}
    </Card>
  );
}

export function ErrorState({
  title,
  onRetry,
  retryLabel,
}: {
  title: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <Card>
      <Text style={s.emptyTitle}>{title}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <Text style={s.retry}>{retryLabel ?? 'Retry'}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

export function ScreenSpinner() {
  return (
    <View style={s.spinner}>
      <ActivityIndicator color={colors.purple} />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.purple,
    borderRadius: radius.pill,
    paddingVertical: 15,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '800',
    color: 'white',
    fontSize: 15,
  },
  light: {
    backgroundColor: colors.lilac,
  },
  lightText: {
    color: colors.purple,
  },
  danger: {
    backgroundColor: '#FDECEC',
  },
  dangerText: {
    color: colors.danger,
  },
  disabled: {
    opacity: 0.6,
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    backgroundColor: colors.soft,
    padding: 8,
    borderRadius: 10,
  },
  rowText: {
    flex: 1,
    fontWeight: '600',
    color: colors.ink,
  },
  value: {
    color: colors.muted,
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  retry: {
    marginTop: 10,
    color: colors.purple,
    fontWeight: '800',
  },
  spinner: {
    padding: 24,
    alignItems: 'center',
  },
});
