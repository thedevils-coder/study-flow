import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { TapTarget } from '@/components/TapTarget';
import { radius } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const background =
    variant === 'primary'
      ? colors.accent
      : variant === 'secondary'
        ? colors.accentSoft
        : variant === 'danger'
          ? colors.danger
          : 'transparent';
  const textColor =
    variant === 'secondary' || variant === 'ghost' ? colors.accent : colors.accentText;

  return (
    <TapTarget
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: background, opacity: disabled || loading ? 0.6 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </TapTarget>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
  },
});
