import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { getFirestore, collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const db = getFirestore();

function calcDaysLeft(expiry) {
  if (!expiry) return null;
  return Math.round((new Date(expiry) - new Date()) / 86400000);
}

function calcStatus(docs) {
  const days = docs.map(d => d.daysLeft).filter(d => d !== null);
  if (days.some(d => d < 0)) return 'bad';
  if (days.some(d => d <= 30)) return 'warn';
  return 'ok';
}

export default function DashboardScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'vehicles'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async snap => {
      const list = await Promise.all(snap.docs.map(async vDoc => {
        const v = { id: vDoc.id, ...vDoc.data() };
        const docsSnap = await new Promise(res => {
          const u = onSnapshot(collection(db, 'vehicles', vDoc.id, 'docs'), s => { u(); res(s); });
        });
        const docs = docsSnap.docs.map(d => ({ id: d.id, ...d.data(), daysLeft: calcDaysLeft(d.data().expiry) }));
        return { ...v, docs, status: calcStatus(docs) };
      }));
      setVehicles(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const ok = vehicles.filter(v => v.status === 'ok').length;
  const warn = vehicles.filter(v => v.status === 'warn').length;
  const bad = vehicles.filter(v => v.status === 'bad').length;

  return (
    <ScrollView style={s.container}>
      <View style={s.kpiRow}>
        <View style={s.kpi}><Text style={s.kpiVal}>{vehicles.length}</Text><Text style={s.kpiLbl}>Total</Text></View>
        <View style={s.kpi}><Text style={[s.kpiVal, {color:'#22C55E'}]}>{ok}</Text><Text style={s.kpiLbl}>Al día</Text></View>
        <View style={s.kpi}><Text style={[s.kpiVal, {color:'#F59E0B'}]}>{warn}</Text><Text style={s.kpiLbl}>Atención</Text></View>
        <View style={s.kpi}><Text style={[s.kpiVal, {color:'#EF4444'}]}>{bad}</Text><Text style={s.kpiLbl}>Crítico</Text></View>
      </View>

      <Text style={s.sectionTitle}>Flota</Text>
      {loading && <Text style={s.muted}>Cargando...</Text>}
      {vehicles.slice(0, 5).map(v => (
        <TouchableOpacity key={v.id} style={s.card} onPress={() => navigation.navigate('Vehicles')}>
          <Text style={s.cardIcon}>{v.icon || '🚗'}</Text>
          <View style={{flex:1}}>
            <Text style={s.cardBrand}>{v.brand} {v.year}</Text>
            <Text style={s.cardModel}>{v.model}</Text>
            <Text style={s.cardPlate}>{v.plate}</Text>
          </View>
          <View style={[s.pill, v.status==='ok'?s.pillOk:v.status==='warn'?s.pillWarn:s.pillBad]}>
            <Text style={[s.pillTxt, {color:v.status==='ok'?'#22C55E':v.status==='warn'?'#F59E0B':'#EF4444'}]}>
              {v.status==='ok'?'Al día':v.status==='warn'?'Atención':'Crítico'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
      {vehicles.length === 0 && !loading && (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🚗</Text>
          <Text style={s.emptyMsg}>No hay vehículos cargados</Text>
          <Text style={s.muted}>Agregá el primero desde Vehículos</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#0D0F14', padding:16 },
  kpiRow: { flexDirection:'row', gap:10, marginBottom:24 },
  kpi: { flex:1, backgroundColor:'#161A22', borderRadius:12, padding:14, alignItems:'center', borderWidth:1, borderColor:'#2A3040' },
  kpiVal: { fontSize:26, fontWeight:'800', color:'#F0F2F5' },
  kpiLbl: { fontSize:11, color:'#7A8499', marginTop:2 },
  sectionTitle: { fontSize:15, fontWeight:'700', color:'#F0F2F5', marginBottom:12 },
  card: { backgroundColor:'#161A22', borderRadius:12, padding:14, marginBottom:10, flexDirection:'row', alignItems:'center', gap:12, borderWidth:1, borderColor:'#2A3040' },
  cardIcon: { fontSize:26 },
  cardBrand: { fontSize:11, color:'#7A8499' },
  cardModel: { fontSize:15, fontWeight:'700', color:'#F0F2F5' },
  cardPlate: { fontSize:12, color:'#7A8499', fontFamily:'monospace', letterSpacing:2 },
  pill: { paddingHorizontal:10, paddingVertical:4, borderRadius:99 },
  pillOk: { backgroundColor:'rgba(34,197,94,.12)' },
  pillWarn: { backgroundColor:'rgba(245,158,11,.12)' },
  pillBad: { backgroundColor:'rgba(239,68,68,.12)' },
  pillTxt: { fontSize:11, fontWeight:'700' },
  empty: { alignItems:'center', paddingVertical:40 },
  emptyIcon: { fontSize:40, marginBottom:10 },
  emptyMsg: { fontSize:15, fontWeight:'600', color:'#F0F2F5', marginBottom:4 },
  muted: { fontSize:13, color:'#7A8499', textAlign:'center' },
});
