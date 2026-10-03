import { describe, expect, it } from 'vitest';

import {
  applyHtmlDateValue,
  applyHtmlTimeValue,
  htmlValueFromChangeEvent,
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

  it('uses the HTML picker only on web', () => {
    expect(usesHtmlDateTimePicker('web')).toBe(true);
    expect(usesHtmlDateTimePicker('android')).toBe(false);
    expect(usesHtmlDateTimePicker('ios')).toBe(false);
  });
});
