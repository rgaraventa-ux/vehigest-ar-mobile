import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { getFirestore, collection, onSnapshot, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';

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

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ brand:'', model:'', year:'2024', plate:'', fuel:'Diesel', km:'0', color:'' });

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

  async function saveVehicle() {
    if (!form.brand || !form.model || !form.plate) return;
    setSaving(true);
    await addDoc(collection(db, 'vehicles'), {
      brand: form.brand, model: form.model, year: parseInt(form.year),
      plate: form.plate.toUpperCase(), fuel: form.fuel,
      km: parseInt(form.km) || 0, color: form.color,
      icon: '🚗', createdAt: serverTimestamp()
    });
    setSaving(false);
    setModal(false);
    setForm({ brand:'', model:'', year:'2024', plate:'', fuel:'Diesel', km:'0', color:'' });
  }

  return (
    <View style={s.container}>
      <ScrollView>
        {loading && <Text style={s.muted}>Cargando...</Text>}
        {vehicles.map(v => (
          <View key={v.id} style={s.card}>
            <View style={s.cardTop}>
              <Text style={s.icon}>{v.icon || '🚗'}</Text>
              <View style={[s.pill, v.status==='ok'?s.pillOk:v.status==='warn'?s.pillWarn:s.pillBad]}>
                <Text style={[s.pillTxt, {color:v.status==='ok'?'#22C55E':v.status==='warn'?'#F59E0B':'#EF4444'}]}>
                  {v.status==='ok'?'Al día':v.status==='warn'?'Atención':'Crítico'}
                </Text>
              </View>
            </View>
            <Text style={s.brand}>{v.brand} {v.year}</Text>
            <Text style={s.model}>{v.model}</Text>
            <Text style={s.plate}>{v.plate}</Text>
            <View style={s.divider}/>
            <View style={s.stats}>
              <View><Text style={s.statVal}>{v.km?.toLocaleString('es-AR')} km</Text><Text style={s.statLbl}>Kilometraje</Text></View>
              <View><Text style={s.statVal}>{v.fuel}</Text><Text style={s.statLbl}>Combustible</Text></View>
            </View>
          </View>
        ))}
        {vehicles.length === 0 && !loading && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🚗</Text>
            <Text style={s.emptyMsg}>No hay vehículos</Text>
            <Text style={s.muted}>Tocá + para agregar el primero</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Text style={s.fabTxt}>＋</Text>
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>🚗 Agregar vehículo</Text>
            {[['Marca *','brand','Toyota'],['Modelo *','model','Hilux'],['Año','year','2024'],['Patente *','plate','AB999CD'],['Combustible','fuel','Diesel'],['Kilometraje','km','0'],['Color','color','Blanco']].map(([lbl,key,ph]) => (
              <View key={key} style={s.field}>
                <Text style={s.label}>{lbl}</Text>
                <TextInput
                  style={s.input} placeholder={ph} placeholderTextColor="#7A8499"
                  value={form[key]} onChangeText={t => setForm(f => ({...f,[key]:key==='plate'?t.toUpperCase():t}))}
                  keyboardType={['year','km'].includes(key)?'numeric':'default'}
                />
              </View>
            ))}
            <View style={s.modalFooter}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setModal(false)}>
                <Text style={s.btnCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={saveVehicle} disabled={saving}>
                <Text style={s.btnSaveTxt}>{saving ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#0D0F14' },
  muted: { fontSize:13, color:'#7A8499', textAlign:'center', padding:20 },
  card: { backgroundColor:'#161A22', borderRadius:16, padding:16, margin:12, marginBottom:0, borderWidth:1, borderColor:'#2A3040' },
  cardTop: { flexDirection:'row', justifyContent:'space-between', marginBottom:10 },
  icon: { fontSize:26 },
  pill: { paddingHorizontal:10, paddingVertical:4, borderRadius:99 },
  pillOk: { backgroundColor:'rgba(34,197,94,.12)' },
  pillWarn: { backgroundColor:'rgba(245,158,11,.12)' },
  pillBad: { backgroundColor:'rgba(239,68,68,.12)' },
  pillTxt: { fontSize:11, fontWeight:'700' },
  brand: { fontSize:11, color:'#7A8499', marginBottom:2 },
  model: { fontSize:18, fontWeight:'700', color:'#F0F2F5', marginBottom:8 },
  plate: { fontSize:13, fontWeight:'700', color:'#F0F2F5', fontFamily:'monospace', letterSpacing:2, backgroundColor:'#1E2430', paddingHorizontal:10, paddingVertical:4, borderRadius:6, alignSelf:'flex-start', marginBottom:12 },
  divider: { height:1, backgroundColor:'#2A3040', marginBottom:12 },
  stats: { flexDirection:'row', gap:20 },
  statVal: { fontSize:14, fontWeight:'700', color:'#F0F2F5' },
  statLbl: { fontSize:10, color:'#7A8499', textTransform:'uppercase', letterSpacing:0.5 },
  empty: { alignItems:'center', paddingVertical:60 },
  emptyIcon: { fontSize:40, marginBottom:10 },
  emptyMsg: { fontSize:15, fontWeight:'600', color:'#F0F2F5', marginBottom:4 },
  fab: { position:'absolute', bottom:24, right:24, width:56, height:56, borderRadius:28, backgroundColor:'#E8A020', alignItems:'center', justifyContent:'center', elevation:5 },
  fabTxt: { fontSize:28, color:'#000', fontWeight:'700', marginTop:-2 },
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,.7)', justifyContent:'flex-end' },
  modalBox: { backgroundColor:'#161A22', borderTopLeftRadius:20, borderTopRightRadius:20, padding:24, borderWidth:1, borderColor:'#2A3040' },
  modalTitle: { fontSize:18, fontWeight:'800', color:'#F0F2F5', marginBottom:20 },
  field: { marginBottom:12 },
  label: { fontSize:11, fontWeight:'600', color:'#7A8499', textTransform:'uppercase', letterSpacing:0.8, marginBottom:5 },
  input: { backgroundColor:'#1E2430', borderWidth:1, borderColor:'#2A3040', borderRadius:10, padding:12, color:'#F0F2F5', fontSize:15 },
  modalFooter: { flexDirection:'row', gap:10, marginTop:20 },
  btnCancel: { flex:1, padding:12, backgroundColor:'#1E2430', borderRadius:10, borderWidth:1, borderColor:'#2A3040', alignItems:'center' },
  btnCancelTxt: { color:'#F0F2F5', fontWeight:'600' },
  btnSave: { flex:2, padding:12, backgroundColor:'#E8A020', borderRadius:10, alignItems:'center' },
  btnSaveTxt: { color:'#000', fontWeight:'700', fontSize:15 },
});
