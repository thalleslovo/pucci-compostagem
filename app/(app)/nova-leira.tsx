import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/Button';
import { syncService } from '@/services/sync';

const PALETTE = {
  verdePrimario: '#5D7261',
  verdeClaro: '#F0F5F0',
  verdeClaro2: '#E8F0E8',
  terracota: '#B16338',
  branco: '#FFFFFF',
  preto: '#1A1A1A',
  cinza: '#666666',
  cinzaClaro: '#EEEEEE',
  cinzaClaro2: '#F5F5F5',
  sucesso: '#4CAF50',
  warning: '#FF9800',
  erro: '#D32F2F',
};

interface BiossólidoEntry {
  id: string;
  data: string;
  numeroMTR: string;
  peso: string;
  origem: string;
  tipoMaterial: string;
}

interface Leira {
  id: string;
  numeroLeira: number;
  lote: string;
  dataFormacao: string;
  biossólidos: BiossólidoEntry[];
  bagaço: number;
  status: string;
  totalBiossólido: number;
}

// ===== FUNÇÃO DE CORREÇÃO DE PESO =====
const parsePeso = (valor: string | number): number => {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;
  const stringLimpa = valor.toString().replace(',', '.').trim();
  const numero = parseFloat(stringLimpa);
  return isNaN(numero) ? 0 : numero;
};

// ===== FUNÇÕES UTILITÁRIAS =====
const getDiasPassados = (data: string): number => {
  try {
    const [dia, mês, ano] = data.split('/').map(Number);
    const dataObj = new Date(ano, mês - 1, dia);
    const agora = new Date();
    const diferença = agora.getTime() - dataObj.getTime();
    return Math.floor(diferença / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 0;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'formada': return PALETTE.terracota;
    case 'secando': return PALETTE.warning;
    case 'compostando': return PALETTE.verdePrimario;
    case 'maturando': return PALETTE.verdeClaro2;
    case 'pronta': return PALETTE.sucesso;
    default: return PALETTE.cinza;
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'formada': return '📦 Formada';
    case 'secando': return '💨 Secando';
    case 'compostando': return '🔄 Compostando';
    case 'maturando': return '🌱 Maturando';
    case 'pronta': return '✅ Pronta para Venda';
    default: return 'Indefinido';
  }
};

const calcularLote = (biossólidos: BiossólidoEntry[]): string => {
  if (biossólidos.length === 0) return 'N/A';
  const datasEmMs = biossólidos.map((item) => {
    const [dia, mês, ano] = item.data.split('/').map(Number);
    return new Date(ano, mês - 1, dia).getTime();
  });
  const dataMaisRecente = new Date(Math.max(...datasEmMs));
  const mês = String(dataMaisRecente.getMonth() + 1).padStart(2, '0');
  const ano = dataMaisRecente.getFullYear();
  return `${mês}/${ano}`;
};

export default function NovaLeiraScreen() {
  const router = useRouter();
  const [leiras, setLeiras] = useState<Leira[]>([]);
  const [biossólidos, setBiossólidos] = useState<BiossólidoEntry[]>([]);
  const [selectedBiossólidos, setSelectedBiossólidos] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const materiaisRegistrados = await AsyncStorage.getItem('materiaisRegistrados');
      const materiais = materiaisRegistrados ? JSON.parse(materiaisRegistrados) : [];
      const biossólidosCarregados = materiais.filter((item: any) => item.tipoMaterial === 'Biossólido');
      setBiossólidos(biossólidosCarregados);

      const leirasRegistradas = await AsyncStorage.getItem('leirasFormadas');
      const leirasData = leirasRegistradas ? JSON.parse(leirasRegistradas) : [];
      setLeiras(leirasData);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBiossólido = (id: string) => {
    if (selectedBiossólidos.includes(id)) {
      setSelectedBiossólidos(selectedBiossólidos.filter((item) => item !== id));
    } else {
      if (selectedBiossólidos.length < 3) {
        setSelectedBiossólidos([...selectedBiossólidos, id]);
      } else {
        Alert.alert('Limite', 'Máximo de 3 biossólidos por leira');
      }
    }
  };

  const handleFormarLeira = async () => {
    if (selectedBiossólidos.length !== 3) {
      Alert.alert('Erro', 'Você precisa selecionar exatamente 3 biossólidos');
      return;
    }

    const biossólidosSelecionados = biossólidos.filter((item) => selectedBiossólidos.includes(item.id));
    const totalBiossólido = biossólidosSelecionados.reduce((acc, item) => acc + parsePeso(item.peso), 0);
    const lote = calcularLote(biossólidosSelecionados);

    const novaLeira: Leira = {
      id: Date.now().toString(),
      numeroLeira: leiras.length + 1,
      lote: lote,
      dataFormacao: new Date().toLocaleDateString('pt-BR'),
      biossólidos: biossólidosSelecionados,
      bagaço: 12,
      status: 'formada',
      totalBiossólido: totalBiossólido,
    };

    try {
      const leirasRegistradas = await AsyncStorage.getItem('leirasFormadas');
      const leirasData = leirasRegistradas ? JSON.parse(leirasRegistradas) : [];
      leirasData.push(novaLeira);
      await AsyncStorage.setItem('leirasFormadas', JSON.stringify(leirasData));
      
      await syncService.adicionarFila('leira', novaLeira);

      const materiaisRegistrados = await AsyncStorage.getItem('materiaisRegistrados');
      const materiais = materiaisRegistrados ? JSON.parse(materiaisRegistrados) : [];
      const materiaisRestantes = materiais.filter((item: any) => !selectedBiossólidos.includes(item.id));
      await AsyncStorage.setItem('materiaisRegistrados', JSON.stringify(materiaisRestantes));

      setLeiras([...leiras, novaLeira]);
      setBiossólidos(biossólidos.filter((item) => !selectedBiossólidos.includes(item.id)));
      setSelectedBiossólidos([]);
      setShowForm(false);

      Alert.alert('Sucesso! ✅', `Leira #${novaLeira.numeroLeira} formada com sucesso!`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível formar a leira');
    }
  };

  // ===== EXCLUIR LEIRA (COM LOGS DE DEBUG) =====
  const handleExcluirLeira = (leira: Leira) => {
    console.log('🗑️ Função handleExcluirLeira chamada para:', leira.numeroLeira);
    
    Alert.alert(
      'Excluir Leira',
      `Tem certeza que deseja excluir a Leira #${leira.numeroLeira}? Os biossólidos voltarão para o estoque.`,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => console.log('❌ Cancelou exclusão') },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            console.log('✅ Confirmou exclusão');
            try {
              // 1. Remover da lista local
              const novasLeiras = leiras.filter(l => l.id !== leira.id);
              await AsyncStorage.setItem('leirasFormadas', JSON.stringify(novasLeiras));
              setLeiras(novasLeiras);

              // 2. Devolver biossólidos para o estoque local
              const materiaisRegistrados = await AsyncStorage.getItem('materiaisRegistrados');
              const materiais = materiaisRegistrados ? JSON.parse(materiaisRegistrados) : [];
              const novosMateriais = [...materiais, ...leira.biossólidos];
              await AsyncStorage.setItem('materiaisRegistrados', JSON.stringify(novosMateriais));
              
              const biosAtualizados = novosMateriais.filter((m: any) => m.tipoMaterial === 'Biossólido');
              setBiossólidos(biosAtualizados);

              // 3. Sync
              await syncService.adicionarFila('leira_deletada' as any, { id: leira.id });

              Alert.alert('Excluída', 'Leira removida e materiais devolvidos ao estoque.');
            } catch (error) {
              console.error('Erro ao excluir:', error);
              Alert.alert('Erro', 'Falha ao excluir leira.');
            }
          }
        }
      ]
    );
  };

  const totalBioSelecionado = biossólidos
    .filter((item) => selectedBiossólidos.includes(item.id))
    .reduce((acc, item) => acc + parsePeso(item.peso), 0);

  const lotePreview = calcularLote(
    biossólidos.filter((item) => selectedBiossólidos.includes(item.id))
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PALETTE.verdePrimario} />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Formação de Leira</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>🌱</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Crie uma nova leira</Text>
            <Text style={styles.infoText}>Selecione 3 biossólidos + 12 ton de bagaço</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <StatBox label="Leiras Criadas" value={leiras.length.toString()} color={PALETTE.verdePrimario} />
          <StatBox label="Biossólidos Disponíveis" value={biossólidos.length.toString()} color={biossólidos.length >= 3 ? PALETTE.sucesso : PALETTE.warning} />
        </View>

        {biossólidos.length === 0 && !showForm && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Nenhum biossólido disponível</Text>
              <Text style={styles.warningText}>Vá para "Entrada de Material" e registre pelo menos 3 biossólidos</Text>
            </View>
          </View>
        )}

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Selecione 3 Biossólidos (Disponíveis: {biossólidos.length})</Text>
            <View style={styles.biossólidosList}>
              {biossólidos.length > 0 ? (
                biossólidos.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.biossólidoItem, selectedBiossólidos.includes(item.id) && styles.biossólidoItemSelected]}
                    onPress={() => handleSelectBiossólido(item.id)}
                  >
                    <View style={styles.biossólidoCheckbox}>
                      {selectedBiossólidos.includes(item.id) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={styles.biossólidoInfo}>
                      <View style={styles.biossólidoHeader}>
                        <Text style={styles.biossólidoMTR}>{item.numeroMTR}</Text>
                        <Text style={styles.biossólidoData}>{item.data}</Text>
                      </View>
                      <View style={styles.biossólidoFooter}>
                        <Text style={styles.biossólidoOrigem}>{item.origem === 'Sabesp' ? '💧' : '🏭'} {item.origem}</Text>
                        <Text style={styles.biossólidoPeso}>{item.peso} ton</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyBiossólidos}>
                  <Text style={styles.emptyIcon}>📭</Text>
                  <Text style={styles.emptyText}>Nenhum biossólido registrado</Text>
                </View>
              )}
            </View>

            {selectedBiossólidos.length > 0 && (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Preview da Leira</Text>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Lote</Text>
                  <Text style={styles.previewValue}>{lotePreview}</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Biossólido Total</Text>
                  <Text style={styles.previewValue}>{totalBioSelecionado.toFixed(1)} ton</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Bagaço de Cana</Text>
                  <Text style={styles.previewValue}>12 ton</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Total da Leira</Text>
                  <Text style={styles.previewValue}>{(totalBioSelecionado + 12).toFixed(1)} ton</Text>
                </View>
              </View>
            )}

            <View style={styles.buttonGroup}>
              <Button title="Cancelar" onPress={() => { setShowForm(false); setSelectedBiossólidos([]); }} fullWidth />
              <View style={styles.buttonSpacer} />
              <Button title={`Formar Leira #${leiras.length + 1}`} onPress={handleFormarLeira} fullWidth variant="primary" />
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addBtn, biossólidos.length < 3 && styles.addBtnDisabled]}
            onPress={() => setShowForm(true)}
            disabled={biossólidos.length < 3}
          >
            <Text style={styles.addBtnIcon}>+</Text>
            <Text style={styles.addBtnText}>Formar Nova Leira</Text>
          </TouchableOpacity>
        )}

        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Leiras em Processo</Text>
          {leiras.length > 0 ? (
            leiras.map((leira) => (
              <LeiraCard 
                key={leira.id} 
                leira={leira} 
                onDelete={() => handleExcluirLeira(leira)} 
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🚜</Text>
              <Text style={styles.emptyText}>Nenhuma leira formada ainda</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statBox, { borderTopColor: color }]}>
      <Text style={styles.statBoxLabel}>{label}</Text>
      <Text style={[styles.statBoxValue, { color }]}>{value}</Text>
    </View>
  );
}

// ===== LEIRA CARD (CORRIGIDO) =====
function LeiraCard({ leira, onDelete }: { leira: Leira, onDelete: () => void }) {
  const router = useRouter();
  const diasPassados = getDiasPassados(leira.dataFormacao);

  return (
    <View style={styles.leiraCard}>
      <View style={styles.leiraHeader}>
        <View>
          <View style={styles.leiraNumberRow}>
            <Text style={styles.leiraNumber}>Leira #{leira.numeroLeira}</Text>
            <View style={styles.loteBadge}>
              <Text style={styles.loteBadgeText}>Lote {leira.lote}</Text>
            </View>
          </View>
          <Text style={styles.leiraData}>{leira.dataFormacao}</Text>
        </View>
        
        {/* BOTÕES DE AÇÃO */}
        <View style={{flexDirection: 'row', gap: 10}}>
            <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => router.push({ pathname: '/(app)/editar-leira', params: { id: leira.id } })}
            >
                <Text style={{fontSize: 18}}>✏️</Text>
            </TouchableOpacity>
            
            {/* BOTÃO EXCLUIR COM ÁREA DE TOQUE GARANTIDA */}
            <TouchableOpacity 
                style={[styles.iconButton, {backgroundColor: '#FFEBEE'}]}
                onPress={onDelete}
                activeOpacity={0.7}
            >
                <Text style={{fontSize: 18}}>🗑️</Text>
            </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.leiraStatusBadge, { backgroundColor: getStatusColor(leira.status), alignSelf: 'flex-start', marginBottom: 10 }]}>
          <Text style={styles.leiraStatusText}>{getStatusLabel(leira.status)}</Text>
      </View>

      <View style={styles.timeline}>
        <TimelineStep label="Formação" status="completed" dias={diasPassados} />
        <TimelineStep label="Secagem" status={diasPassados > 2 ? 'completed' : 'pending'} dias={3} />
        <TimelineStep label="Compostagem" status={leira.status === 'compostando' ? 'active' : 'pending'} dias={21} />
        <TimelineStep label="Maturação" status={leira.status === 'maturando' ? 'active' : 'pending'} dias={21} />
        <TimelineStep label="Venda" status={leira.status === 'pronta' ? 'completed' : 'pending'} />
      </View>

      <View style={styles.leiraDetails}>
        <DetailItem label="Biossólidos" value={`${leira.biossólidos.length}x`} />
        <DetailItem label="Bio Total" value={`${leira.totalBiossólido.toFixed(1)} ton`} />
        <DetailItem label="Bagaço" value="12 ton" />
        <DetailItem label="Total" value={`${(leira.totalBiossólido + 12).toFixed(1)} ton`} />
      </View>
    </View>
  );
}

function TimelineStep({ label, status, dias }: { label: string; status: 'pending' | 'active' | 'completed'; dias?: number }) {
  const getColor = () => {
    switch (status) {
      case 'completed': return PALETTE.sucesso;
      case 'active': return PALETTE.verdePrimario;
      default: return PALETTE.cinzaClaro;
    }
  };
  const getIcon = () => {
    switch (status) {
      case 'completed': return '✓';
      case 'active': return '●';
      default: return '○';
    }
  };
  return (
    <View style={styles.timelineStep}>
      <View style={[styles.timelineIcon, { backgroundColor: getColor() }]}>
        <Text style={styles.timelineIconText}>{getIcon()}</Text>
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineLabel}>{label}</Text>
        {dias !== undefined && <Text style={styles.timelineDias}>~{dias} dias</Text>}
      </View>
    </View>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.verdeClaro },
  scrollContent: { flexGrow: 1, paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: PALETTE.cinza, fontWeight: '600' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: PALETTE.branco, borderBottomWidth: 1, borderBottomColor: PALETTE.cinzaClaro2 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, fontWeight: '700', color: PALETTE.verdePrimario },
  headerTitle: { fontSize: 18, fontWeight: '700', color: PALETTE.preto },
  infoBox: { flexDirection: 'row', backgroundColor: PALETTE.branco, marginHorizontal: 20, marginTop: 16, marginBottom: 16, borderRadius: 12, padding: 14, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: PALETTE.terracota },
  infoIcon: { fontSize: 32, marginRight: 12 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: PALETTE.preto, marginBottom: 4 },
  infoText: { fontSize: 12, color: PALETTE.cinza },
  statsContainer: { paddingHorizontal: 20, marginBottom: 20, flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: PALETTE.branco, borderRadius: 12, padding: 14, borderTopWidth: 3 },
  statBoxLabel: { fontSize: 11, color: PALETTE.cinza, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  statBoxValue: { fontSize: 20, fontWeight: '800' },
  warningBox: { flexDirection: 'row', backgroundColor: PALETTE.branco, marginHorizontal: 20, marginBottom: 16, borderRadius: 12, padding: 14, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: PALETTE.warning },
  warningIcon: { fontSize: 32, marginRight: 12 },
  warningContent: { flex: 1 },
  warningTitle: { fontSize: 13, fontWeight: '700', color: PALETTE.preto, marginBottom: 4 },
  warningText: { fontSize: 12, color: PALETTE.cinza },
  formCard: { backgroundColor: PALETTE.branco, marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 20, borderTopWidth: 3, borderTopColor: PALETTE.verdePrimario },
  formTitle: { fontSize: 16, fontWeight: '700', color: PALETTE.preto, marginBottom: 16 },
  biossólidosList: { gap: 10, marginBottom: 16 },
  biossólidoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.cinzaClaro2, borderRadius: 12, padding: 12, borderWidth: 2, borderColor: PALETTE.cinzaClaro2 },
  biossólidoItemSelected: { backgroundColor: PALETTE.verdeClaro2, borderColor: PALETTE.verdePrimario },
  biossólidoCheckbox: { width: 24, height: 24, borderRadius: 12, backgroundColor: PALETTE.branco, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 2, borderColor: PALETTE.cinzaClaro },
  checkmark: { fontSize: 14, fontWeight: '700', color: PALETTE.verdePrimario },
  biossólidoInfo: { flex: 1 },
  biossólidoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  biossólidoMTR: { fontSize: 12, fontWeight: '700', color: PALETTE.preto },
  biossólidoData: { fontSize: 11, color: PALETTE.cinza },
  biossólidoFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  biossólidoOrigem: { fontSize: 11, fontWeight: '600', color: PALETTE.cinza },
  biossólidoPeso: { fontSize: 11, fontWeight: '700', color: PALETTE.verdePrimario },
  previewCard: { backgroundColor: PALETTE.verdeClaro2, borderRadius: 12, padding: 14, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: PALETTE.verdePrimario },
  previewTitle: { fontSize: 13, fontWeight: '700', color: PALETTE.preto, marginBottom: 12 },
  previewItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: PALETTE.verdeClaro },
  previewLabel: { fontSize: 12, color: PALETTE.cinza, fontWeight: '600' },
  previewValue: { fontSize: 14, fontWeight: '700', color: PALETTE.verdePrimario },
  buttonGroup: { marginTop: 16 },
  buttonSpacer: { height: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginBottom: 20, backgroundColor: PALETTE.verdePrimario, borderRadius: 12, paddingVertical: 14, gap: 8 },
  addBtnDisabled: { backgroundColor: PALETTE.cinzaClaro, opacity: 0.6 },
  addBtnIcon: { fontSize: 24, fontWeight: '700', color: PALETTE.branco },
  addBtnText: { fontSize: 14, fontWeight: '700', color: PALETTE.branco },
  listSection: { paddingHorizontal: 20 },
  listTitle: { fontSize: 16, fontWeight: '700', color: PALETTE.preto, marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, fontWeight: '700', color: PALETTE.preto },
  emptyBiossólidos: { alignItems: 'center', paddingVertical: 30 },
  leiraCard: { backgroundColor: PALETTE.branco, borderRadius: 14, padding: 16, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: PALETTE.verdePrimario },
  leiraHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  leiraNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leiraNumber: { fontSize: 16, fontWeight: '800', color: PALETTE.preto },
  loteBadge: { backgroundColor: PALETTE.terracota, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  loteBadgeText: { fontSize: 10, fontWeight: '700', color: PALETTE.branco },
  leiraData: { fontSize: 11, color: PALETTE.cinza, marginTop: 4 },
  leiraStatusBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  leiraStatusText: { fontSize: 11, fontWeight: '700', color: PALETTE.branco },
  timeline: { marginBottom: 14, paddingVertical: 10, borderLeftWidth: 2, borderLeftColor: PALETTE.cinzaClaro2, paddingLeft: 12 },
  timelineStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  timelineIcon: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: -17 },
  timelineIconText: { fontSize: 10, fontWeight: '700', color: PALETTE.branco },
  timelineContent: { marginLeft: 12 },
  timelineLabel: { fontSize: 12, fontWeight: '600', color: PALETTE.preto },
  timelineDias: { fontSize: 10, color: PALETTE.cinza, marginTop: 2 },
  leiraDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: PALETTE.cinzaClaro2 },
  detailItem: { flex: 1, minWidth: '45%' },
  detailLabel: { fontSize: 10, color: PALETTE.cinza, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  detailValue: { fontSize: 13, fontWeight: '700', color: PALETTE.preto },
  
  // ESTILOS PARA OS BOTÕES
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: PALETTE.cinzaClaro2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40, // Garante tamanho mínimo para toque
    minHeight: 40
  }
});