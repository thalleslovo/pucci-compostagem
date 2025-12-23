import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/Button';
import { syncService } from '@/services/sync';

const PALETTE = {
  verdePrimario: '#5D7261',
  verdeClaro: '#F0F5F0',
  verdeClaro2: '#E8F0E8',
  branco: '#FFFFFF',
  preto: '#1A1A1A',
  cinza: '#666666',
  cinzaClaro: '#EEEEEE',
  cinzaClaro2: '#F5F5F5', // ✅ Adicionado aqui
  erro: '#D32F2F',
  sucesso: '#4CAF50',
  terracota: '#B16338',
  warning: '#FF9800',
};

export default function EditarLeiraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // States do Formulário
  const [leiraOriginal, setLeiraOriginal] = useState<any>(null);
  const [numeroLeira, setNumeroLeira] = useState('');
  const [lote, setLote] = useState('');
  const [pesoBio, setPesoBio] = useState('');
  const [pesoBagaco, setPesoBagaco] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    carregarLeira();
  }, [id]);

  const carregarLeira = async () => {
    try {
      const json = await AsyncStorage.getItem('leirasFormadas');
      if (json) {
        const leiras = JSON.parse(json);
        const leiraEncontrada = leiras.find((l: any) => l.id === id);

        if (leiraEncontrada) {
          setLeiraOriginal(leiraEncontrada);
          setNumeroLeira(leiraEncontrada.numeroLeira.toString());
          setLote(leiraEncontrada.lote);
          setPesoBio(leiraEncontrada.totalBiossólido.toString().replace('.', ','));
          setPesoBagaco(leiraEncontrada.bagaço.toString().replace('.', ','));
          setStatus(leiraEncontrada.status);
        } else {
          Alert.alert('Erro', 'Leira não encontrada');
          router.back();
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao carregar dados');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    try {
      setSaving(true);

      // Conversão de valores (Virgula -> Ponto)
      const novoPesoBio = parseFloat(pesoBio.replace(',', '.'));
      const novoPesoBagaco = parseFloat(pesoBagaco.replace(',', '.'));

      if (isNaN(novoPesoBio) || isNaN(novoPesoBagaco)) {
        Alert.alert('Erro', 'Verifique os valores numéricos');
        setSaving(false);
        return;
      }

      // Objeto Atualizado
      const leiraAtualizada = {
        ...leiraOriginal,
        numeroLeira: parseInt(numeroLeira),
        lote: lote,
        totalBiossólido: novoPesoBio,
        bagaço: novoPesoBagaco,
        status: status,
        atualizado_em: new Date().toISOString(),
        sincronizado: false // Força sincronização
      };

      // Salvar no AsyncStorage
      const json = await AsyncStorage.getItem('leirasFormadas');
      const leiras = json ? JSON.parse(json) : [];
      
      // Substitui a leira antiga pela nova
      const novasLeiras = leiras.map((l: any) => l.id === id ? leiraAtualizada : l);
      
      await AsyncStorage.setItem('leirasFormadas', JSON.stringify(novasLeiras));

      // Adicionar na Fila de Sync
      await syncService.adicionarFila('leira', leiraAtualizada);

      Alert.alert('Sucesso', 'Leira atualizada com sucesso!');
      router.back();

    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'formada': return PALETTE.terracota;
      case 'secando': return PALETTE.warning;
      case 'compostando': return PALETTE.verdePrimario;
      case 'maturando': return PALETTE.verdeClaro2;
      case 'pronta': return PALETTE.sucesso;
      default: return PALETTE.cinza;
    }
  };

  if (loading) return <ActivityIndicator style={{flex:1}} color={PALETTE.verdePrimario} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* HEADER */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backIcon}></Text>
            </TouchableOpacity>
            <Text style={styles.title}>Editar Leira #{numeroLeira}</Text>
            <View style={{width: 40}} />
        </View>

        <View style={styles.card}>
          
          {/* NÚMERO E LOTE */}
          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.label}>Número da Leira</Text>
                <TextInput 
                    style={styles.input}
                    value={numeroLeira} 
                    onChangeText={setNumeroLeira} 
                    keyboardType="numeric"
                />
            </View>
            <View style={{flex: 1, marginLeft: 8}}>
                <Text style={styles.label}>Lote</Text>
                <TextInput 
                    style={styles.input}
                    value={lote} 
                    onChangeText={setLote} 
                />
            </View>
          </View>

          {/* PESOS */}
          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 8}}>
              <Text style={styles.label}>Peso Bio (ton)</Text>
              <TextInput 
                style={styles.input}
                value={pesoBio} 
                onChangeText={setPesoBio} 
                keyboardType="numeric"
              />
            </View>
            <View style={{flex: 1, marginLeft: 8}}>
              <Text style={styles.label}>Peso Bagaço (ton)</Text>
              <TextInput 
                style={styles.input}
                value={pesoBagaco} 
                onChangeText={setPesoBagaco} 
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* STATUS */}
          <Text style={styles.label}>Status Atual</Text>
          <View style={styles.statusContainer}>
            {['formada', 'secando', 'compostando', 'maturando', 'pronta'].map((s) => (
              <TouchableOpacity 
                key={s}
                style={[
                    styles.statusBadge, 
                    status === s && { backgroundColor: getStatusColor(s), borderColor: getStatusColor(s) }
                ]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.statusText, status === s && {color: '#FFF'}]}>
                  {s.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button 
          title={saving ? "Salvando..." : "Salvar Alterações"} 
          onPress={handleSalvar}
          disabled={saving}
          fullWidth
          variant="primary"
        />
        
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.verdeClaro },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.branco, borderRadius: 20 },
  backIcon: { fontSize: 24, color: PALETTE.verdePrimario, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: PALETTE.verdePrimario },
  
  card: { backgroundColor: PALETTE.branco, padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2 },
  row: { flexDirection: 'row', marginBottom: 15 },
  
  label: { fontSize: 12, fontWeight: 'bold', color: PALETTE.verdePrimario, marginBottom: 8, textTransform: 'uppercase' },
  input: { 
    borderWidth: 1, 
    borderColor: '#DDD', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 16, 
    backgroundColor: PALETTE.cinzaClaro2,
    color: PALETTE.preto
  },

  statusContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  statusBadge: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#EEE', borderWidth: 1, borderColor: '#DDD' },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#666' },
  
  cancelButton: { alignItems: 'center', marginTop: 15, padding: 10 },
  cancelText: { color: PALETTE.erro, fontWeight: 'bold' }
});