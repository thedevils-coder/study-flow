import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { useColors } from '@/lib/use-colors';
import { t } from '@/i18n';
import { useApp } from '@/store/app-store';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  const palette = useColors();
  return (
    <View
      style={[
        s.card,
        { backgroundColor: palette.card, borderColor: palette.border },
        style,
      ]}
    >
      {children}
    </View>
  );
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
  const palette = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        s.button,
        { backgroundColor: palette.purple },
        variant === 'light' && { backgroundColor: palette.lilac },
        variant === 'danger' && { backgroundColor: palette.dangerSoft },
        (disabled || loading) && s.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'light'
              ? palette.purple
              : variant === 'danger'
                ? palette.danger
                : 'white'
          }
        />
      ) : (
        <Text
          style={[
            s.buttonText,
            variant === 'light' && { color: palette.purple },
            variant === 'danger' && { color: palette.danger },
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
  const palette = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={[s.row, { borderColor: palette.border }]}
    >
      <View style={[s.icon, { backgroundColor: palette.soft }]}>
        <Ionicons name={icon} size={18} color={palette.purple} />
      </View>
      <Text style={[s.rowText, { color: palette.ink }]}>{label}</Text>
      {value ? <Text style={[s.value, { color: palette.muted }]}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={17} color={palette.muted} /> : null}
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
  const palette = useColors();
  return (
    <Card>
      <Text style={[s.emptyTitle, { color: palette.ink }]}>{title}</Text>
      {body ? <Text style={[s.emptyBody, { color: palette.muted }]}>{body}</Text> : null}
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
  const palette = useColors();
  const { session } = useApp();
  return (
    <Card>
      <Text style={[s.emptyTitle, { color: palette.ink }]}>{title}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <Text style={[s.retry, { color: palette.purple }]}>
            {retryLabel ?? t(session?.language || 'en', 'retry')}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

export function ScreenSpinner() {
  const palette = useColors();
  return (
    <View style={s.spinner}>
      <ActivityIndicator color={palette.purple} />
    </View>
  );
}

export function ThemedSafeArea({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  const palette = useColors();
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: palette.background }, style]}>
      {children}
    </SafeAreaView>
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
