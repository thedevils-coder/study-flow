import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { radius } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';

export function Input({
  label,
  error,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.secondaryText }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.mutedText}
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: colors.input,
            borderColor: error ? colors.danger : colors.inputBorder,
            color: colors.text,
          },
          props.style,
        ]}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  error: { marginTop: 6, fontSize: 12, fontWeight: '600' },
});
