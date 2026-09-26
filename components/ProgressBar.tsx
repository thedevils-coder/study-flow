import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';

export function ProgressBar({ value }: { value: number }) {
  const { colors } = useTheme();
  const width = Math.max(0, Math.min(100, value));
  return (
    <View style={[styles.track, { backgroundColor: colors.progressTrack }]}>
      <View style={[styles.fill, { width: `${width}%`, backgroundColor: colors.progressFill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
});
