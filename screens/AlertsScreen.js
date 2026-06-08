import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { getFirestore, collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const db = getFirestore();

function calcDaysLeft(expiry) {
  if (!expiry) return null;
  return Math.round((new Date(expiry) - new Date()) / 86400000);
}

function daysColor(d) {
  if (d === null) return '#7A8499';
  if (d < 0) return '#EF4444';
  if (d <= 30) return '#F59E0B';
  return '#22C55E';
}

export default function AlertsScreen({ navigation }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'vehicles'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async snap => {
      const allAlerts = [];
      await Promise.all(snap.docs.map(async vDoc => {
        const v = { id: vDoc.id, ...vDoc.data() };
        const docsSnap = await new Promise(res => {
          const u = onSnapshot(collection(db, 'vehicles', vDoc.id, 'docs'), s => { u(); res(s); });
        });
        docsSnap.docs.forEach(d => {
          const data = d.data();
          const daysLeft = calcDaysLeft(data.expiry);
          if (daysLeft === null) return;
          if (daysLeft > 60) return;
          let level = 'ok';
          if (daysLeft < 0) level = 'critical';
          else if (daysLeft <= 30) level = 'warning';
          const icon = data.type?.includes('VTV') ? '🔍' : data.type?.includes('Seguro') ? '🛡️' : data.type?.includes('GNC') ? '⚡' : '📋';
          const msg = daysLeft < 0
            ? `${data.type} VENCIDA hace ${Math.abs(daysLeft)} días`
            : `${data.type} vence en ${daysLeft} días`;
          allAlerts.push({ id: `${v.id}-${d.id}`, vehicleId: v.id, vehicle: `${v.brand} ${v.model}`, plate: v.plate, type: data.type, level, icon, msg, daysLeft });
        });
      }));
      setAlerts(allAlerts.sort((a, b) => a.daysLeft - b.daysLeft));
      setLoading(false);
    });
    return unsub;
  }, []);

  const critical = alerts.filter(a => a.level === 'critical');
  const warning = alerts.filter(a => a.level === 'warning');
  const ok = alerts.filter(a => a.level === 'ok');

  function AlertRow({ a }) {
    return (
      <View style={[s.row, a.level === 'critical' ? s.rowCritical : a.level === 'warning' ? s.rowWarning : s.rowOk]}>
        <Text style={s.rowIcon}>{a.icon}</Text>
        <View style={s.rowInfo}>
          <Text style={s.rowTitle}>{a.msg}</Text>
          <Text style={s.rowSub}>{a.plate} · {a.vehicle}</Text>
        </View>
        <View style={s.rowDays}>
          <Text style={[s.rowDaysNum, {color: daysColor(a.daysLeft)}]}>{Math.abs(a.daysLeft)}</Text>
          <Text style={s.rowDaysLbl}>{a.daysLeft < 0 ? 'exp.' : 'días'}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={s.container}>
      <View style={s.summary}>
        <View style={s.sumItem}><Text style={[s.sumNum, {color:'#EF4444'}]}>{critical.length}</Text><Text style={s.sumLbl}>Críticas</Text></View>
        <View style={s.divider}/>
        <View style={s.sumItem}><Text style={[s.sumNum, {color:'#F59E0B'}]}>{warning.length}</Text><Text style={s.sumLbl}>Advertencias</Text></View>
        <View style={s.divider}/>
        <View style={s.sumItem}><Text style={[s.sumNum, {color:'#22C55E'}]}>{ok.length}</Text><Text style={s.sumLbl}>Al día</Text></View>
      </View>

      {loading && <Text style={s.muted}>Cargando...</Text>}

      {alerts.length === 0 && !loading && (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🔔</Text>
          <Text style={s.emptyMsg}>Sin alertas por ahora</Text>
          <Text style={s.muted}>Cargá documentos con vencimiento para que aparezcan acá</Text>
        </View>
      )}

      {critical.length > 0 && <>
        <Text style={[s.sectionTitle, {color:'#EF4444'}]}>🚨 Requieren acción inmediata</Text>
        {critical.map(a => <AlertRow key={a.id} a={a}/>)}
      </>}
      {warning.length > 0 && <>
        <Text style={[s.sectionTitle, {color:'#F59E0B'}]}>⚠️ Próximos a vencer</Text>
        {warning.map(a => <AlertRow key={a.id} a={a}/>)}
      </>}
      {ok.length > 0 && <>
        <Text style={[s.sectionTitle, {color:'#22C55E'}]}>✅ En orden</Text>
        {ok.map(a => <AlertRow key={a.id} a={a}/>)}
      </>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#0D0F14', padding:12 },
  summary: { flexDirection:'row', backgroundColor:'#161A22', borderRadius:14, padding:16, marginBottom:20, borderWidth:1, borderColor:'#2A3040', alignItems:'center' },
  sumItem: { flex:1, alignItems:'center' },
  sumNum: { fontSize:28, fontWeight:'800' },
  sumLbl: { fontSize:10, color:'#7A8499', textTransform:'uppercase', letterSpacing:0.5 },
  divider: { width:1, height:40, backgroundColor:'#2A3040' },
  sectionTitle: { fontSize:12, fontWeight:'700', textTransform:'uppercase', letterSpacing:1, marginBottom:8, marginTop:16 },
  row: { backgroundColor:'#161A22', borderRadius:12, padding:14, marginBottom:8, flexDirection:'row', alignItems:'center', gap:12, borderWidth:1, borderColor:'#2A3040' },
  rowCritical: { borderLeftWidth:3, borderLeftColor:'#EF4444' },
  rowWarning: { borderLeftWidth:3, borderLeftColor:'#F59E0B' },
  rowOk: { borderLeftWidth:3, borderLeftColor:'#22C55E' },
  rowIcon: { fontSize:20, width:30, textAlign:'center' },
  rowInfo: { flex:1 },
  rowTitle: { fontSize:13, fontWeight:'600', color:'#F0F2F5', marginBottom:2 },
  rowSub: { fontSize:11, color:'#7A8499' },
  rowDays: { alignItems:'center' },
  rowDaysNum: { fontSize:20, fontWeight:'800', lineHeight:22 },
  rowDaysLbl: { fontSize:9, color:'#7A8499', textTransform:'uppercase' },
  empty: { alignItems:'center', paddingVertical:60 },
  emptyIcon: { fontSize:40, marginBottom:10 },
  emptyMsg: { fontSize:15, fontWeight:'600', color:'#F0F2F5', marginBottom:4 },
  muted: { fontSize:13, color:'#7A8499', textAlign:'center', padding:20 },
});
