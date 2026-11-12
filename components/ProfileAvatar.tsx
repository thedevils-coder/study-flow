import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'react-native';

import { useTheme } from '@/providers/theme-provider';

export function ProfileAvatar({
  uri,
  size = 64,
  label = '🎓',
}: {
  uri?: string | null;
  size?: number;
  label?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentSoft },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={{ fontSize: size * 0.44 }}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
