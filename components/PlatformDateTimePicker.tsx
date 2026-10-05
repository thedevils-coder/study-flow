import DateTimePicker from '@react-native-community/datetimepicker';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import type { PlatformDateTimePickerProps } from '@/components/platform-date-time-picker';
import { combineDateAndTime, formatDate, formatTime } from '@/lib/dates';
import { useTheme } from '@/providers/theme-provider';

function isValidDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
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
  displayText,
}: PlatformDateTimePickerProps) {
  const { colors } = useTheme();
  const current = isValidDate(value) ? value : new Date();
  const latest = useRef(current);
  latest.current = current;
  const [open, setOpen] = useState<'date' | 'time' | 'datetime' | null>(null);

  const shown =
    displayText ??
    (!isValidDate(value)
      ? placeholder
      : mode === 'time'
        ? formatTime(value)
        : mode === 'date'
          ? formatDate(value)
          : `${formatDate(value)} ${formatTime(value)}`);

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => {
          if (disabled) return;
          if (mode === 'time') setOpen('time');
          else if (mode === 'datetime' && Platform.OS === 'ios') setOpen('datetime');
          else setOpen('date');
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled }}
        style={[
          styles.field,
          { borderColor: colors.inputBorder, backgroundColor: colors.input, opacity: disabled ? 0.5 : 1 },
        ]}
      >
        {label ? <Text style={{ color: colors.mutedText, fontWeight: '700' }}>{label}</Text> : null}
        <Text style={{ color: colors.text, fontWeight: '700' }}>{shown}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={current}
          mode={open === 'time' ? 'time' : open === 'datetime' ? 'datetime' : 'date'}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(_, selected) => {
            const continueToTime = mode === 'datetime' && open === 'date' && Platform.OS !== 'ios';
            if (Platform.OS !== 'ios') setOpen(continueToTime ? 'time' : null);
            if (!selected) return;
            if (open === 'datetime') {
              latest.current = new Date(selected);
              onChange(latest.current);
              return;
            }
            const next =
              open === 'date'
                ? combineDateAndTime(selected, latest.current)
                : combineDateAndTime(latest.current, selected);
            latest.current = next;
            onChange(next);
          }}
        />
      ) : null}
      {Platform.OS === 'ios' && open ? (
        <Button label="Done" variant="ghost" onPress={() => setOpen(null)} />
      ) : null}
    </>
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
