import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t, deviceLanguage } from '@/i18n';
import { PHONE_AUTH_ENABLED } from '@/services/auth';
import { useColors } from '@/lib/use-colors';

type Mode = 'email' | 'phone';
type EmailMode = 'magic' | 'password' | 'signup' | 'reset';

export default function Welcome() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('email');
  const [emailMode, setEmailMode] = useState<EmailMode>('magic');
  const {
    requestSignIn,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    sendPhoneCode,
    verifyPhoneCode,
    resetPassword,
  } = useApp();

  const language = deviceLanguage();
  const tr = (key: string) => t(language, key);
  const palette = useColors();

  const run = async (action: () => Promise<void>, success?: { title: string; body: string }) => {
    setBusy(true);
    try {
      await action();
      if (success) {
        Alert.alert(success.title, success.body);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : tr('errorGeneric');
      const mapped = message.includes('not configured')
        ? tr('supabaseNotConfigured')
        : message.includes('not enabled')
          ? tr('phoneAuthDisabled')
          : message;
      Alert.alert(tr('authError'), mapped);
    } finally {
      setBusy(false);
    }
  };

  const submitEmail = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert(tr('signIn'), tr('invalidEmail'));
      return;
    }

    if (emailMode === 'magic') {
      void run(() => requestSignIn(email, name || 'Student'), {
        title: tr('checkEmail'),
        body: tr('checkEmailBody'),
      });
      return;
    }

    if (emailMode === 'reset') {
      void run(() => resetPassword(email), {
        title: tr('resetPassword'),
        body: tr('passwordResetSent'),
      });
      return;
    }

    if (password.length < 8) {
      Alert.alert(tr('signIn'), tr('invalidPassword'));
      return;
    }

    if (emailMode === 'signup') {
      void run(() => signUpWithPassword(email, password, name || 'Student'), {
        title: tr('checkEmail'),
        body: tr('checkEmailBody'),
      });
      return;
    }

    void run(() => signInWithPassword(email, password));
  };

  const submitPhone = () => {
    if (!/^\+?[1-9]\d{7,14}$/.test(phone.replace(/\s/g, ''))) {
      Alert.alert(tr('signIn'), tr('invalidPhone'));
      return;
    }

    if (!codeSent) {
      void run(async () => {
        await sendPhoneCode(phone.replace(/\s/g, ''));
        setCodeSent(true);
      }, { title: tr('verifyPhone'), body: tr('enterCode') });
      return;
    }

    if (code.trim().length < 4) {
      Alert.alert(tr('verifyPhone'), tr('enterCode'));
      return;
    }

    void run(() => verifyPhoneCode(phone.replace(/\s/g, ''), code.trim()));
  };

  return (
    <SafeAreaView style={[s.page, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Image
            source={require('../../assets/images/icon.png')}
            style={s.logo}
            accessibilityLabel={tr('brandName')}
          />
          <Text style={[s.brand, { color: palette.ink }]}>{tr('brandName').toUpperCase()}</Text>
          <Text style={[s.tagline, { color: palette.purple }]}>{tr('tagline')}</Text>
          <Text style={[s.title, { color: palette.ink }]}>{tr('welcomeTitle')}</Text>
          <Text style={[s.sub, { color: palette.muted }]}>{tr('welcomeSubtitle')}</Text>

          {PHONE_AUTH_ENABLED ? (
            <View style={[s.tabs, { backgroundColor: palette.soft }]}>
              {(['email', 'phone'] as Mode[]).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setMode(item)}
                  style={[s.tab, mode === item && [s.tabActive, { backgroundColor: palette.card }]]}
                  accessibilityRole="button"
                  accessibilityLabel={item === 'email' ? tr('continueWithEmail') : tr('continueWithPhone')}
                >
                  <Text style={[s.tabText, { color: palette.muted }, mode === item && { color: palette.purple }]}>
                    {item === 'email' ? tr('email') : tr('phone')}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {mode === 'email' || !PHONE_AUTH_ENABLED ? (
            <View style={s.form}>
              {emailMode === 'signup' || emailMode === 'magic' ? (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={tr('name')}
                  placeholderTextColor={palette.muted}
                  style={[s.input, { backgroundColor: palette.soft, color: palette.ink }]}
                  autoCapitalize="words"
                />
              ) : null}
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder={tr('email')}
                placeholderTextColor={palette.muted}
                style={[s.input, { backgroundColor: palette.soft, color: palette.ink }]}
              />
              {emailMode === 'password' || emailMode === 'signup' ? (
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={tr('password')}
                  placeholderTextColor={palette.muted}
                  style={[s.input, { backgroundColor: palette.soft, color: palette.ink }]}
                  secureTextEntry
                />
              ) : null}
              <Button
                label={
                  emailMode === 'reset'
                    ? tr('sendResetLink')
                    : emailMode === 'signup'
                      ? tr('createAccount')
                      : tr('getStarted')
                }
                onPress={submitEmail}
                loading={busy}
              />
              <Pressable onPress={() => setEmailMode(emailMode === 'magic' ? 'password' : 'magic')}>
                <Text style={[s.link, { color: palette.purple }]}>
                  {emailMode === 'magic' ? tr('usePassword') : tr('useMagicLink')}
                </Text>
              </Pressable>
              <Pressable onPress={() => setEmailMode(emailMode === 'signup' ? 'password' : 'signup')}>
                <Text style={[s.link, { color: palette.purple }]}>
                  {emailMode === 'signup' ? tr('alreadyHaveAccount') : tr('noAccount')}
                </Text>
              </Pressable>
              <Pressable onPress={() => setEmailMode('reset')}>
                <Text style={[s.link, { color: palette.purple }]}>{tr('forgotPassword')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.form}>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder={tr('phonePlaceholder')}
                placeholderTextColor={palette.muted}
                style={[s.input, { backgroundColor: palette.soft, color: palette.ink }]}
              />
              {codeSent ? (
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  placeholder={tr('enterCode')}
                  placeholderTextColor={palette.muted}
                  style={[s.input, { backgroundColor: palette.soft, color: palette.ink }]}
                />
              ) : null}
              <Button
                label={codeSent ? tr('verify') : tr('sendCode')}
                onPress={submitPhone}
                loading={busy}
              />
            </View>
          )}

          <View style={s.form}>
            <Button
              label={tr('continueWithGoogle')}
              variant="light"
              onPress={() =>
                run(() => signInWithGoogle()).catch(() => undefined)
              }
              loading={busy}
            />
            <Text style={[s.note, { color: palette.muted }]}>{tr('paymentVerification')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: 28, paddingTop: 36, alignItems: 'center' },
  logo: { width: 120, height: 120, borderRadius: 28, marginBottom: 12 },
  brand: { fontSize: 22, fontWeight: '900', letterSpacing: 1.4, color: colors.ink },
  tagline: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.purple,
    textAlign: 'center',
  },
  title: { fontWeight: '900', fontSize: 28, textAlign: 'center', marginTop: 28, color: colors.ink },
  sub: { color: colors.muted, textAlign: 'center', fontSize: 16, lineHeight: 24, marginTop: 10 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.soft,
    borderRadius: 14,
    padding: 4,
    marginTop: 28,
    width: '100%',
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: colors.white },
  tabText: { fontWeight: '700', color: colors.muted },
  tabTextActive: { color: colors.purple },
  form: { width: '100%', marginTop: 18, gap: 12 },
  input: { backgroundColor: colors.soft, borderRadius: 14, padding: 16, fontSize: 16, color: colors.ink },
  link: { color: colors.purple, fontWeight: '700', textAlign: 'center' },
  note: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
});
