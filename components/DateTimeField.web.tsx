import { createElement, useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { applyHtmlDateValue, applyHtmlTimeValue, toHtmlDateValue, toHtmlTimeValue } from '@/lib/dates';
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

export function DateTimeField({
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
    <View style={[styles.field, { borderColor: colors.inputBorder, backgroundColor: colors.input }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => openPicker()}
        pointerEvents="none"
        style={styles.row}
      >
        <Text style={{ color: colors.mutedText, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{value ? displayText : placeholder}</Text>
      </Pressable>
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
  zIndex: 2,
} as const;

const styles = StyleSheet.create({
  field: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  row: {
    minHeight: 50,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
});
