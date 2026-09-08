import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Row } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { defaultPricing, money } from '@/services/pricing';
import { t } from '@/i18n';

export default function Admin() {
  const { session } = useApp();
  if (session?.role !== 'admin') { router.replace('/(tabs)'); return null; }
  const p = defaultPricing; const tr=(key:string)=>t(session.language,key);
  return <SafeAreaView style={s.page}><ScrollView contentContainerStyle={s.scroll}>
    <Text style={s.title}>{tr('admin')}</Text><Text style={s.sub}>{tr('adminDataNotice')}</Text>
    <View style={s.grid}>{[[tr('users'),'-'],[tr('trialUsers'),'-'],[tr('monthly'),'-']].map(([label,value])=><Card key={label} style={s.metric}><Text style={s.sub}>{label}</Text><Text style={s.num}>{value}</Text></Card>)}</View>
    <Card><Text style={s.heading}>{tr('revenue')}</Text><Text style={s.sub}>{tr('revenueNotice')}</Text><Row icon="card-outline" label={tr('merchantConnection')} value={tr('notConnected')} onPress={()=>Alert.alert(tr('secureSetup'),tr('merchantNotice'))}/><Row icon="receipt-outline" label={tr('transactions')} value={tr('noProvider')} onPress={()=>Alert.alert(tr('transactions'),tr('noProvider'))}/></Card>
    <Card><Text style={s.heading}>{tr('pricing')}</Text><Text style={s.sub}>{tr('pricingNotice')}</Text><TextInput editable={false} value={`${tr('freeTrial')}: ${tr('free')} · ${p.trialDays} ${tr('days')}`} style={s.input}/><TextInput editable={false} value={`${tr('monthly')}: ${money(p.monthlyPrice)}/month`} style={s.input}/><TextInput editable={false} value={`${tr('currency')}: ${p.currency}`} style={s.input}/><Button label={tr('saveBackend')} variant="light" onPress={()=>Alert.alert(tr('pricing'),tr('pricingApiRequired'))}/></Card>
  </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'white'},scroll:{padding:20},title:{fontSize:27,fontWeight:'900',color:colors.ink},sub:{color:colors.muted,lineHeight:19},grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:15},metric:{width:'47%',marginBottom:0},num:{fontSize:26,fontWeight:'900',color:colors.ink,marginTop:5},heading:{fontSize:18,fontWeight:'900',color:colors.ink,marginBottom:5},input:{backgroundColor:colors.soft,borderRadius:12,padding:13,marginTop:10,color:colors.muted}});
