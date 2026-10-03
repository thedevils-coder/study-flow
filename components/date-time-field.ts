export type DateTimeFieldProps = {
  label: string;
  mode: 'date' | 'time';
  value: Date | null;
  displayText: string;
  placeholder?: string;
  onChange: (next: Date) => void;
};
