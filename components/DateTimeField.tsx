import DateTimePicker from '@react-native-community/datetimepicker';
import { createElement, useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import {
  applyHtmlDateValue,
  applyHtmlTimeValue,
  combineDateAndTime,
  toHtmlDateValue,
  toHtmlTimeValue,
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

type HtmlPickerInput = {
  showPicker?: () => void;
  focus: () => void;
  click: () => void;
};

export function DateTimeField(props: DateTimeFieldProps) {
  if (Platform.OS === 'web') return <WebDateTimeField {...props} />;
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

function WebDateTimeField({
  label,
  mode,
  value,
  displayText,
  placeholder = '',
  onChange,
}: DateTimeFieldProps) {
  const { colors } = useTheme();
  const inputRef = useRef<HtmlPickerInput | null>(null);
  const inputValue = value ? (mode === 'date' ? toHtmlDateValue(value) : toHtmlTimeValue(value)) : '';

  const openPicker = useCallback((input?: HtmlPickerInput | null) => {
    const target = input ?? inputRef.current;
    if (!target) return;
    try {
      if (typeof target.showPicker === 'function') {
        target.showPicker();
        return;
      }
    } catch {
      // Some browsers throw if showPicker is blocked; keep the input focused.
    }
    target.focus();
  }, []);

  const handleChange = useCallback(
    (event: { target: { value: string } }) => {
      const nextValue = event.target.value;
      if (!nextValue) return;
      onChange(mode === 'date' ? applyHtmlDateValue(value, nextValue) : applyHtmlTimeValue(value, nextValue));
    },
    [mode, onChange, value],
  );

  return (
    <View style={[styles.field, styles.webField, { borderColor: colors.inputBorder, backgroundColor: colors.input }]}>
      <View pointerEvents="none" style={styles.webRow}>
        <Text style={{ color: colors.mutedText, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{value ? displayText : placeholder}</Text>
      </View>
      {createElement('input', {
        ref: (node: HtmlPickerInput | null) => {
          inputRef.current = node;
        },
        type: mode === 'date' ? 'date' : 'time',
        value: inputValue,
        onChange: handleChange,
        onInput: handleChange,
        onPointerDown: (event: { currentTarget: HtmlPickerInput }) => openPicker(event.currentTarget),
        'aria-label': label,
        style: webInputStyle,
      })}
    </View>
  );
}

const webInputStyle = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  opacity: 0.01,
  border: 0,
  margin: 0,
  padding: 0,
  background: 'transparent',
  color: 'transparent',
  cursor: 'pointer',
} as const;

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
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 0,
  },
  webRow: {
    minHeight: 50,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
});
