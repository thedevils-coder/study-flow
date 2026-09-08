import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import { defaultPricing, money, billing } from '@/services/pricing';
import { trialTiming } from '@/services/trial';

export default function Subscription() {
  const { session, refreshSubscription } = useApp();
  const tr = (key: string) => t(session!.language, key);
  const pricing = defaultPricing;
  const monthly = money(pricing.monthlyPrice);
  const beginSubscription = async () => {
    try { await billing.startCheckout('monthly'); await refreshSubscription(); }
    catch { Alert.alert(tr('subscription'), tr('paymentUnavailable')); }
  };
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.scroll}>
    <Text onPress={() => router.back()} style={styles.back}>{tr('back')}</Text>
    <Text style={styles.title}>{tr('subscription')}</Text>
    <Text style={styles.sub}>{tr('subscriptionIntro')}</Text>
    <Card><Text style={styles.label}>{tr('currentStatus')}</Text><Text style={styles.current}>{session!.plan === 'none' ? tr('noPlan') : tr(session!.plan)}</Text><Text style={styles.sub}>{tr('status')}: {session!.subscriptionStatus}</Text>{session!.plan==='trial'&&trialTiming(session!.trialEndsAt)&&<Text style={styles.sub}>{tr('trialEndsOn')} {trialTiming(session!.trialEndsAt)!.endDate.toLocaleDateString(session!.language)} · {trialTiming(session!.trialEndsAt)!.daysRemaining} {tr('daysRemaining')}</Text>}</Card>
    <Card style={styles.plan}><Text style={styles.badge}>{tr('freeTrial').toUpperCase()}</Text><Text style={styles.price}>{tr('free')}</Text><Text style={styles.sub}>{tr('freeTrialDescription')}</Text><Button label={tr('startFreeTrial')} onPress={beginSubscription}/></Card>
    <Card style={styles.plan}><Text style={styles.badge}>{tr('monthly').toUpperCase()}</Text><Text style={styles.price}>{monthly}<Text style={styles.unit}>/month</Text></Text><Text style={styles.sub}>{tr('monthlyAfterTrial')}</Text><Button label={tr('chooseMonthly')} onPress={beginSubscription}/></Card>
    <Text style={styles.legal}>{tr('paymentVerification')}</Text>
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:'white'},scroll:{padding:20},back:{color:colors.purple,fontWeight:'800',fontSize:16},title:{fontSize:28,fontWeight:'900',color:colors.ink,marginTop:15},sub:{color:colors.muted,lineHeight:20,marginTop:5},label:{fontSize:11,fontWeight:'900',letterSpacing:1,color:colors.purple},current:{fontSize:20,fontWeight:'900',color:colors.ink,marginTop:5},plan:{gap:10},badge:{color:colors.purple,fontWeight:'900',fontSize:12},price:{fontSize:29,fontWeight:'900',color:colors.ink},unit:{fontSize:14,fontWeight:'600',color:colors.muted},legal:{fontSize:12,lineHeight:18,color:colors.muted,textAlign:'center',marginTop:7}});
