import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { combineDateAndTime } from '@/lib/dates';
import { useTheme } from '@/providers/theme-provider';

type DateTimeFieldProps = {
  label: string;
  mode: 'date' | 'time';
  value: Date | null;
  displayText: string;
  placeholder?: string;
  onChange: (next: Date) => void;
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
});
