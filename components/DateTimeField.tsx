import DateTimePicker from '@react-native-community/datetimepicker';
import { createElement, useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import {
  applyHtmlDateValue,
  applyHtmlTimeValue,
  combineDateAndTime,
  htmlValueFromChangeEvent,
  toHtmlDateValue,
  toHtmlTimeValue,
  usesHtmlDateTimePicker,
} from '@/lib/dates';
import { useTheme } from '@/providers/theme-provider';

type DateTimeFieldProps = {
  label: string;
  mode: 'date' | 'time';
  value: Date | null;
  displayText: string;
  placeholder?: string;
  onChange: (next: Date) => void;
};

export function DateTimeField(props: DateTimeFieldProps) {
  if (usesHtmlDateTimePicker(Platform.OS)) return <WebDateTimeField {...props} />;
  return <NativeDateTimeField {...props} />;
}

function NativeDateTimeField({
  label,
  mode,
  value,
  displayText,
  placeholder = '',
  onChange,
}: DateTimeFieldProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.field, { borderColor: colors.inputBorder, backgroundColor: colors.input }]}
      >
        <Text style={{ color: colors.mutedText, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{value ? displayText : placeholder}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (!selected) return;
            const current = value ?? selected;
            onChange(mode === 'date' ? combineDateAndTime(selected, current) : combineDateAndTime(current, selected));
          }}
        />
      ) : null}
      {Platform.OS === 'ios' && open ? <Button label="Done" variant="ghost" onPress={() => setOpen(false)} /> : null}
    </>
  );
}

function WebDateTimeField({ label, mode, value, onChange }: DateTimeFieldProps) {
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
    <View style={[styles.field, styles.webField, { borderColor: colors.inputBorder, backgroundColor: colors.input }]}>
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
  },
  webField: {
    gap: 12,
  },
});
