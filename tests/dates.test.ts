import { describe, expect, it } from 'vitest';

import {
  applyHtmlDateTimeLocalValue,
  applyHtmlDateValue,
  applyHtmlTimeValue,
  htmlValueFromChangeEvent,
  parseHtmlDateTimeValue,
  toHtmlDateTimeLocalValue,
  toHtmlDateValue,
  toHtmlTimeValue,
  usesHtmlDateTimePicker,
} from '@/lib/dates';

describe('HTML date/time field values', () => {
  it('formats local dates and times for native web inputs', () => {
    const value = new Date(2026, 8, 26, 14, 5, 30);
    expect(toHtmlDateValue(value)).toBe('2026-09-26');
    expect(toHtmlTimeValue(value)).toBe('14:05');
  });

  it('applies a picked date without changing the current time', () => {
    const current = new Date(2026, 0, 1, 9, 30, 0);
    const next = applyHtmlDateValue(current, '2026-10-03');
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(9);
    expect(next.getDate()).toBe(3);
    expect(next.getHours()).toBe(9);
    expect(next.getMinutes()).toBe(30);
  });

  it('applies a picked time without changing the current date', () => {
    const current = new Date(2026, 8, 26, 9, 30, 0);
    const next = applyHtmlTimeValue(current, '18:45');
    expect(toHtmlDateValue(next)).toBe('2026-09-26');
    expect(next.getHours()).toBe(18);
    expect(next.getMinutes()).toBe(45);
    expect(next.getSeconds()).toBe(0);
  });

  it('reads values from DOM onChange, onChangeText strings, and nativeEvent text', () => {
    expect(htmlValueFromChangeEvent({ target: { value: '2026-10-15' } })).toBe('2026-10-15');
    expect(htmlValueFromChangeEvent('19:15')).toBe('19:15');
    expect(htmlValueFromChangeEvent({ nativeEvent: { text: '07:15' } })).toBe('07:15');
    expect(htmlValueFromChangeEvent({ target: {} })).toBe('');
  });

  it('uses local datetime-local values instead of UTC ISO slices', () => {
    const value = new Date(2026, 9, 3, 20, 30, 0);
    expect(toHtmlDateTimeLocalValue(value)).toBe('2026-10-03T20:30');
    const utcSlice = value.toISOString().slice(0, 16);
    expect(toHtmlDateTimeLocalValue(value).includes('T')).toBe(true);
    if (value.getTimezoneOffset() !== 0) {
      expect(toHtmlDateTimeLocalValue(value)).not.toBe(utcSlice);
    }
    const next = applyHtmlDateTimeLocalValue(new Date(2026, 0, 1, 1, 2, 3), '2026-10-03T20:30');
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(9);
    expect(next.getDate()).toBe(3);
    expect(next.getHours()).toBe(20);
    expect(next.getMinutes()).toBe(30);
    expect(next.getSeconds()).toBe(0);
  });

  it('ignores empty and invalid browser datetime values', () => {
    const current = new Date(2026, 8, 26, 9, 30, 0);
    expect(parseHtmlDateTimeValue('', current, 'datetime')).toBeNull();
    expect(parseHtmlDateTimeValue('not-a-date', current, 'datetime')).toBeNull();
    expect(parseHtmlDateTimeValue('2026-13-40T99:99', current, 'datetime')).toBeNull();
    const parsed = parseHtmlDateTimeValue('2026-10-03T18:45', current, 'datetime');
    expect(parsed?.getHours()).toBe(18);
    expect(parsed?.getMinutes()).toBe(45);
  });

  it('uses the HTML picker only on web', () => {
    expect(usesHtmlDateTimePicker('web')).toBe(true);
    expect(usesHtmlDateTimePicker('android')).toBe(false);
    expect(usesHtmlDateTimePicker('ios')).toBe(false);
  });
});
