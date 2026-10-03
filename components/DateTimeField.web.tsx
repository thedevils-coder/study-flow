import { createElement, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DateTimeFieldProps } from '@/components/date-time-field';
import {
  applyHtmlDateValue,
  applyHtmlTimeValue,
  htmlValueFromChangeEvent,
  toHtmlDateValue,
  toHtmlTimeValue,
} from '@/lib/dates';
import { useTheme } from '@/providers/theme-provider';

export function DateTimeField({ label, mode, value, onChange }: DateTimeFieldProps) {
  const { colors } = useTheme();
  const inputValue = value ? (mode === 'date' ? toHtmlDateValue(value) : toHtmlTimeValue(value)) : '';

  const handleChange = useCallback(
    (event: unknown) => {
      const nextValue = htmlValueFromChangeEvent(event);
      if (!nextValue) return;
      onChange(mode === 'date' ? applyHtmlDateValue(value, nextValue) : applyHtmlTimeValue(value, nextValue));
    },
    [mode, onChange, value],
  );

  return (
    <View style={[styles.field, { borderColor: colors.inputBorder, backgroundColor: colors.input }]}>
      <Text style={{ color: colors.mutedText, fontWeight: '700' }}>{label}</Text>
      {createElement('input', {
        type: mode === 'date' ? 'date' : 'time',
        value: inputValue,
        onChange: handleChange,
        onInput: handleChange,
        'aria-label': label,
        style: {
          flexGrow: 1,
          minWidth: 148,
          height: 40,
          margin: 0,
          borderWidth: 0,
          backgroundColor: 'transparent',
          color: colors.text,
          fontSize: 16,
          fontWeight: '700',
          textAlign: 'right',
          outlineWidth: 0,
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});
