export type PlatformDateTimePickerMode = 'date' | 'time' | 'datetime';

export type PlatformDateTimePickerProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  label?: string;
  mode?: PlatformDateTimePickerMode;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  placeholder?: string;
  displayText?: string;
};
