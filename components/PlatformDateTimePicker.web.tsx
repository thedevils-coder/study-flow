import { createElement, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { PlatformDateTimePickerMode, PlatformDateTimePickerProps } from '@/components/platform-date-time-picker';
import { useTheme } from '@/providers/theme-provider';

function isValidDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toLocalDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLocalTimeValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toLocalDateTimeValue(date: Date) {
  return `${toLocalDateValue(date)}T${toLocalTimeValue(date)}`;
}

function toInputValue(value: Date | null, mode: PlatformDateTimePickerMode) {
  if (!isValidDate(value)) return '';
  if (mode === 'date') return toLocalDateValue(value);
  if (mode === 'time') return toLocalTimeValue(value);
  return toLocalDateTimeValue(value);
}

function inputValueFromEvent(event: unknown): string {
  if (typeof event === 'string') return event;
  if (!event || typeof event !== 'object') return '';
  const record = event as { target?: { value?: unknown }; nativeEvent?: { text?: unknown; target?: { value?: unknown } } };
  if (typeof record.target?.value === 'string') return record.target.value;
  const fromNative = record.nativeEvent?.text ?? record.nativeEvent?.target?.value;
  return typeof fromNative === 'string' ? fromNative : '';
}

function parseLocalInput(value: string, current: Date | null, mode: PlatformDateTimePickerMode): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let year: number;
  let month: number;
  let day: number;
  let hour: number;
  let minute: number;

  if (mode === 'date') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!match) return null;
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
    const base = isValidDate(current) ? current : new Date();
    hour = base.getHours();
    minute = base.getMinutes();
  } else if (mode === 'time') {
    const match = /^(\d{1,2}):(\d{2})/.exec(trimmed);
    if (!match) return null;
    const base = isValidDate(current) ? current : new Date();
    year = base.getFullYear();
    month = base.getMonth() + 1;
    day = base.getDate();
    hour = Number(match[1]);
    minute = Number(match[2]);
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{1,2}):(\d{2})/.exec(trimmed);
    if (!match) return null;
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
    hour = Number(match[4]);
    minute = Number(match[5]);
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const probe = new Date(year, month - 1, day);
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) return null;

  const next = isValidDate(current) ? new Date(current) : new Date();
  next.setFullYear(year, month - 1, day);
  next.setHours(hour, minute, 0, 0);
  return next;
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
      const nextValue = inputValueFromEvent(event);
      if (!nextValue) return;
      const parsed = parseLocalInput(nextValue, value, mode);
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
        value: toInputValue(value, mode),
        placeholder,
        disabled,
        min: isValidDate(minimumDate) ? toInputValue(minimumDate, mode) : undefined,
        max: isValidDate(maximumDate) ? toInputValue(maximumDate, mode) : undefined,
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
