import { createElement, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { PlatformDateTimePickerProps } from '@/components/platform-date-time-picker';
import {
  htmlValueFromChangeEvent,
  parseHtmlDateTimeValue,
  toHtmlDateTimeLocalValue,
  toHtmlDateValue,
  toHtmlTimeValue,
} from '@/lib/dates';
import { useTheme } from '@/providers/theme-provider';

function isValidDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function toLocalInputValue(value: Date | null, mode: NonNullable<PlatformDateTimePickerProps['mode']>) {
  if (!isValidDate(value)) return '';
  if (mode === 'date') return toHtmlDateValue(value);
  if (mode === 'time') return toHtmlTimeValue(value);
  return toHtmlDateTimeLocalValue(value);
}

function toLocalLimit(value: Date | undefined, mode: NonNullable<PlatformDateTimePickerProps['mode']>) {
  if (!isValidDate(value)) return undefined;
  return toLocalInputValue(value, mode) || undefined;
}

export function PlatformDateTimePicker({
  value,
  onChange,
  label,
  mode = 'datetime',
  minimumDate,
  maximumDate,
  disabled,
  placeholder = '',
}: PlatformDateTimePickerProps) {
  const { colors } = useTheme();
  const inputType = mode === 'date' ? 'date' : mode === 'time' ? 'time' : 'datetime-local';

  const handleChange = useCallback(
    (event: unknown) => {
      const nextValue = htmlValueFromChangeEvent(event);
      if (!nextValue) return;
      const parsed = parseHtmlDateTimeValue(nextValue, value, mode);
      if (!parsed) return;
      onChange(parsed);
    },
    [mode, onChange, value],
  );

  return (
    <View
      style={[
        styles.field,
        { borderColor: colors.inputBorder, backgroundColor: colors.input, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {label ? <Text style={{ color: colors.mutedText, fontWeight: '700' }}>{label}</Text> : null}
      {createElement('input', {
        type: inputType,
        value: toLocalInputValue(value, mode),
        placeholder,
        disabled,
        min: toLocalLimit(minimumDate, mode),
        max: toLocalLimit(maximumDate, mode),
        step: mode === 'date' ? undefined : 60,
        onChange: handleChange,
        onInput: handleChange,
        'aria-label': label,
        style: {
          flexGrow: 1,
          minWidth: 168,
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
