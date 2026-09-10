import {Redirect} from 'expo-router';
import {ActivityIndicator,View} from 'react-native';
import {useApp} from '@/store/app-store';
import {useColors} from '@/lib/use-colors';

export default function Index() {
  const {session, ready} = useApp();
  const palette = useColors();
  if (!ready) {
    return (
      <View style={{flex: 1, justifyContent: 'center', backgroundColor: palette.background}}>
        <ActivityIndicator color={palette.purple} />
      </View>
    );
  }
  return <Redirect href={session ? '/(tabs)' : '/(auth)/welcome'} />;
}
