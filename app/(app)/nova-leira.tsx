import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform
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
  azulPiscinao: '#0288D1',
  azulClaro: '#E1F5FE',
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
  destino?: string;
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
  tipoFormacao: 'MTR' | 'MANUAL';
}

const parsePeso = (valor: string | number): number => {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;
  const stringLimpa = valor.toString().replace(',', '.').trim();
  const numero = parseFloat(stringLimpa);
  return isNaN(numero) ? 0 : numero;
};

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
  if (biossólidos.length === 0) {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    return `${mes}/${hoje.getFullYear()}`;
  }
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

  // Estados Modo Manual
  const [modoManual, setModoManual] = useState(false);
  const [pesoManualBio, setPesoManualBio] = useState('');
  const [pesoManualBagaco, setPesoManualBagaco] = useState('12');

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
      
      // 🔥 FILTRO DEFINITIVO
      const biossólidosCarregados = materiais.filter((item: any) => {
        const tipo = item.tipoMaterial ? item.tipoMaterial.toLowerCase() : '';
        const origem = item.origem ? item.origem.toLowerCase() : '';
        const destino = item.destino ? item.destino.toLowerCase() : '';
        const mtr = item.numeroMTR ? item.numeroMTR.toLowerCase() : '';

        const ehBiossolido = tipo.includes('bio') || tipo.includes('lodo');

        const ehPiscinao = 
            destino.includes('piscin') || 
            destino.includes('estoque') ||
            origem.includes('piscin') || 
            origem.includes('manual') || 
            tipo.includes('piscin') ||
            mtr.includes('manual');
        
        return ehBiossolido && !ehPiscinao;
      });
      
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
      if (selectedBiossólidos.length < 4) {
        setSelectedBiossólidos([...selectedBiossólidos, id]);
      } else {
        Alert.alert('Limite', 'Máximo de 4 itens por leira');
      }
    }
  };

  const handleFormarLeira = async () => {
    let novaLeira: Leira;

    if (modoManual) {
      const pesoBio = parsePeso(pesoManualBio);
      const pesoBagaco = parsePeso(pesoManualBagaco);

      if (pesoBio <= 0) {
        Alert.alert('Atenção', 'Informe o peso do Biossólido/Piscinão.');
        return;
      }
      if (pesoBagaco <= 0) {
        Alert.alert('Atenção', 'Informe o peso do Bagaço.');
        return;
      }

      const itemManual: BiossólidoEntry = {
        id: `manual-${Date.now()}`,
        data: new Date().toLocaleDateString('pt-BR'),
        numeroMTR: 'MANUAL',
        peso: pesoBio.toString(),
        origem: 'Piscinão/Manual',
        tipoMaterial: 'Biossólido'
      };

      novaLeira = {
        id: Date.now().toString(),
        numeroLeira: leiras.length + 1,
        lote: calcularLote([]),
        dataFormacao: new Date().toLocaleDateString('pt-BR'),
        biossólidos: [itemManual],
        bagaço: pesoBagaco,
        status: 'formada',
        totalBiossólido: pesoBio,
        tipoFormacao: 'MANUAL'
      };

    } else {
      if (selectedBiossólidos.length < 3 || selectedBiossólidos.length > 4) {
        Alert.alert('Atenção', 'Selecione 3 ou 4 viagens para formar a leira.');
        return;
      }

      const biossólidosSelecionados = biossólidos.filter((item) => selectedBiossólidos.includes(item.id));
      const totalBiossólido = biossólidosSelecionados.reduce((acc, item) => acc + parsePeso(item.peso), 0);
      const lote = calcularLote(biossólidosSelecionados);

      novaLeira = {
        id: Date.now().toString(),
        numeroLeira: leiras.length + 1,
        lote: lote,
        dataFormacao: new Date().toLocaleDateString('pt-BR'),
        biossólidos: biossólidosSelecionados,
        bagaço: 12,
        status: 'formada',
        totalBiossólido: totalBiossólido,
        tipoFormacao: 'MTR'
      };
    }

    try {
      const leirasRegistradas = await AsyncStorage.getItem('leirasFormadas');
      const leirasData = leirasRegistradas ? JSON.parse(leirasRegistradas) : [];
      leirasData.push(novaLeira);
      await AsyncStorage.setItem('leirasFormadas', JSON.stringify(leirasData));
      
      await syncService.adicionarFila('leira', novaLeira);

      if (!modoManual) {
        const materiaisRegistrados = await AsyncStorage.getItem('materiaisRegistrados');
        const materiais = materiaisRegistrados ? JSON.parse(materiaisRegistrados) : [];
        const materiaisRestantes = materiais.filter((item: any) => !selectedBiossólidos.includes(item.id));
        await AsyncStorage.setItem('materiaisRegistrados', JSON.stringify(materiaisRestantes));
        setBiossólidos(biossólidos.filter((item) => !selectedBiossólidos.includes(item.id)));
      }

      setLeiras([...leiras, novaLeira]);
      setSelectedBiossólidos([]);
      setPesoManualBio('');
      setPesoManualBagaco('12');
      setShowForm(false);

      Alert.alert('Sucesso! ✅', `Leira #${novaLeira.numeroLeira} formada com sucesso!`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível formar a leira');
    }
  };

  // 🔥 NOVA LÓGICA DE EXCLUSÃO COM PERGUNTA AO USUÁRIO
  const handleExcluirLeira = (leira: Leira) => {
    Alert.alert(
      'Excluir Leira',
      `O que deseja fazer com os biossólidos da Leira #${leira.numeroLeira}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir Definitivamente', // OPÇÃO 1: Apaga tudo
          style: 'destructive',
          onPress: async () => {
            await executarExclusao(leira, false);
          }
        },
        {
          text: 'Retornar ao Estoque', // OPÇÃO 2: Devolve para a lista
          onPress: async () => {
            await executarExclusao(leira, true);
          }
        }
      ]
    );
  };

  const executarExclusao = async (leira: Leira, devolverAoEstoque: boolean) => {
    try {
      // 1. Remove a Leira da lista
      const novasLeiras = leiras.filter(l => l.id !== leira.id);
      await AsyncStorage.setItem('leirasFormadas', JSON.stringify(novasLeiras));
      setLeiras(novasLeiras);

      // 2. Se for para devolver ao estoque (e não for manual)
      if (devolverAoEstoque && leira.tipoFormacao !== 'MANUAL') {
        const materiaisRegistrados = await AsyncStorage.getItem('materiaisRegistrados');
        const materiais = materiaisRegistrados ? JSON.parse(materiaisRegistrados) : [];
        
        // Adiciona de volta os materiais da leira
        const novosMateriais = [...materiais, ...leira.biossólidos];
        await AsyncStorage.setItem('materiaisRegistrados', JSON.stringify(novosMateriais));
        
        // Recarrega a lista para mostrar os itens devolvidos
        loadData();
        Alert.alert('Sucesso', 'Leira excluída e materiais devolvidos ao estoque.');
      } else {
        // Se for exclusão definitiva
        Alert.alert('Sucesso', 'Leira e materiais excluídos definitivamente.');
      }

      // 3. Sincroniza a deleção da leira
      await syncService.adicionarFila('leira_deletada' as any, { id: leira.id });

    } catch (error) {
      Alert.alert('Erro', 'Falha ao excluir leira.');
    }
  };

  const totalBioSelecionado = modoManual 
    ? parsePeso(pesoManualBio) 
    : biossólidos.filter((item) => selectedBiossólidos.includes(item.id)).reduce((acc, item) => acc + parsePeso(item.peso), 0);

  const totalBagaco = modoManual ? parsePeso(pesoManualBagaco) : 12;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PALETTE.verdePrimario} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}></Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Formação de Leira</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>🌱</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Nova Leira</Text>
            <Text style={styles.infoText}>Use MTRs do estoque ou registre manualmente (Piscinão)</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <StatBox label="Leiras Criadas" value={leiras.length.toString()} color={PALETTE.verdePrimario} />
          <StatBox label="Mat. Disponível" value={biossólidos.length.toString()} color={biossólidos.length >= 3 ? PALETTE.sucesso : PALETTE.warning} />
        </View>

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Nova Leira #{leiras.length + 1}</Text>

            <View style={styles.modeSelector}>
              <TouchableOpacity 
                style={[styles.modeBtn, !modoManual && styles.modeBtnActive]} 
                onPress={() => setModoManual(false)}
              >
                <Text style={[styles.modeBtnText, !modoManual && styles.modeBtnTextActive]}>Selecionar MTRs</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeBtn, modoManual && styles.modeBtnActive]} 
                onPress={() => setModoManual(true)}
              >
                <Text style={[styles.modeBtnText, modoManual && styles.modeBtnTextActive]}>Manual / Piscinão</Text>
              </TouchableOpacity>
            </View>

            {modoManual ? (
              <View style={styles.manualInputContainer}>
                <Text style={styles.inputLabel}>Peso do Material (Piscinão/Bio)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={pesoManualBio}
                    onChangeText={setPesoManualBio}
                    placeholder="0.0"
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitText}>ton</Text>
                </View>

                <Text style={styles.inputLabel}>Peso do Bagaço</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={pesoManualBagaco}
                    onChangeText={setPesoManualBagaco}
                    placeholder="12.0"
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitText}>ton</Text>
                </View>
              </View>
            ) : (
              <View style={styles.biossólidosList}>
                <Text style={styles.subLabel}>Selecione 3 ou 4 itens da lista:</Text>
                {biossólidos.length > 0 ? (
                  biossólidos.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.biossólidoItem, 
                        selectedBiossólidos.includes(item.id) && styles.biossólidoItemSelected
                      ]}
                      onPress={() => handleSelectBiossólido(item.id)}
                    >
                      <View style={styles.biossólidoCheckbox}>
                        {selectedBiossólidos.includes(item.id) && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <View style={styles.biossólidoInfo}>
                        <View style={styles.biossólidoHeader}>
                          <Text style={styles.biossólidoMTR}>{item.numeroMTR || 'S/ MTR'}</Text>
                          <Text style={styles.biossólidoData}>{item.data}</Text>
                        </View>
                        <View style={styles.biossólidoFooter}>
                          <Text style={styles.biossólidoOrigem}>
                            {item.origem?.includes('Piscin') ? '🌊' : '🏭'} {item.origem}
                          </Text>
                          <Text style={styles.biossólidoPeso}>{item.peso} ton</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyBiossólidos}>
                    <Text style={styles.emptyText}>Estoque vazio.</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Resumo da Leira</Text>
              <View style={styles.previewItem}>
                <Text style={styles.previewLabel}>Material Total</Text>
                <Text style={styles.previewValue}>{totalBioSelecionado.toFixed(1)} ton</Text>
              </View>
              <View style={styles.previewItem}>
                <Text style={styles.previewLabel}>Bagaço</Text>
                <Text style={styles.previewValue}>{totalBagaco} ton</Text>
              </View>
              <View style={styles.previewItem}>
                <Text style={styles.previewLabel}>Total Estimado</Text>
                <Text style={styles.previewValue}>{(totalBioSelecionado + Number(totalBagaco)).toFixed(1)} ton</Text>
              </View>
            </View>

            <View style={styles.buttonGroup}>
              <Button title="Cancelar" onPress={() => { setShowForm(false); setSelectedBiossólidos([]); }} fullWidth />
              <View style={styles.buttonSpacer} />
              <Button title="Confirmar Formação" onPress={handleFormarLeira} fullWidth variant="primary" />
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.addBtnIcon}>+</Text>
            <Text style={styles.addBtnText}>Formar Nova Leira</Text>
          </TouchableOpacity>
        )}

        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Leiras Recentes</Text>
          {leiras.map((leira) => (
            <LeiraCard 
              key={leira.id} 
              leira={leira} 
              onDelete={() => handleExcluirLeira(leira)} 
            />
          ))}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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

function LeiraCard({ leira, onDelete }: { leira: Leira, onDelete: () => void }) {
  const router = useRouter();
  const diasPassados = getDiasPassados(leira.dataFormacao);

  return (
    <View style={styles.leiraCard}>
      <View style={styles.leiraHeader}>
        <View>
          <View style={styles.leiraNumberRow}>
            <Text style={styles.leiraNumber}>Leira #{leira.numeroLeira}</Text>
            {leira.tipoFormacao === 'MANUAL' ? (
              <View style={[styles.loteBadge, { backgroundColor: PALETTE.azulPiscinao }]}>
                <Text style={styles.loteBadgeText}>MANUAL</Text>
              </View>
            ) : (
              <View style={[styles.loteBadge, { backgroundColor: PALETTE.terracota }]}>
                <Text style={styles.loteBadgeText}>Lote {leira.lote}</Text>
              </View>
            )}
          </View>
          <Text style={styles.leiraData}>{leira.dataFormacao}</Text>
        </View>
        <View style={{flexDirection: 'row', gap: 10}}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push({ pathname: '/(app)/editar-leira', params: { id: leira.id } })}>
                <Text style={{fontSize: 18}}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, {backgroundColor: '#FFEBEE'}]} onPress={onDelete}>
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
        <DetailItem label="Origem" value={leira.tipoFormacao === 'MANUAL' ? 'Piscinão/Manual' : 'Estoque (MTR)'} />
        <DetailItem label="Peso Bio" value={`${leira.totalBiossólido.toFixed(1)} ton`} />
        <DetailItem label="Bagaço" value={`${leira.bagaço} ton`} />
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
  formCard: { backgroundColor: PALETTE.branco, marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 20, borderTopWidth: 3, borderTopColor: PALETTE.verdePrimario },
  formTitle: { fontSize: 16, fontWeight: '700', color: PALETTE.preto, marginBottom: 16 },
  
  modeSelector: { flexDirection: 'row', backgroundColor: PALETTE.cinzaClaro2, borderRadius: 8, padding: 4, marginBottom: 20 },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  modeBtnActive: { backgroundColor: PALETTE.branco, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: PALETTE.cinza },
  modeBtnTextActive: { color: PALETTE.verdePrimario, fontWeight: '700' },

  manualInputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: PALETTE.cinza, marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.cinzaClaro2, borderRadius: 8, paddingHorizontal: 12, marginBottom: 14 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, fontWeight: '700', color: PALETTE.preto },
  unitText: { fontSize: 14, fontWeight: '600', color: PALETTE.cinza },

  biossólidosList: { gap: 10, marginBottom: 16 },
  subLabel: { fontSize: 12, color: PALETTE.cinza, marginBottom: 8 },
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
  loteBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  loteBadgeText: { fontSize: 10, fontWeight: '700', color: PALETTE.branco },
  leiraData: { fontSize: 11, color: PALETTE.cinza, marginTop: 4 },
  leiraStatusBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  leiraStatusText: { fontSize: 11, fontWeight: '700', color: PALETTE.branco },
  leiraDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: PALETTE.cinzaClaro2 },
  detailItem: { flex: 1, minWidth: '45%' },
  detailLabel: { fontSize: 10, color: PALETTE.cinza, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  detailValue: { fontSize: 13, fontWeight: '700', color: PALETTE.preto },
  iconButton: { padding: 8, borderRadius: 8, backgroundColor: PALETTE.cinzaClaro2, alignItems: 'center', justifyContent: 'center', minWidth: 40, minHeight: 40 },
  
  timeline: { marginBottom: 14, paddingVertical: 10, borderLeftWidth: 2, borderLeftColor: PALETTE.cinzaClaro2, paddingLeft: 12 },
  timelineStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  timelineIcon: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: -17 },
  timelineIconText: { fontSize: 10, fontWeight: '700', color: PALETTE.branco },
  timelineContent: { marginLeft: 12 },
  timelineLabel: { fontSize: 12, fontWeight: '600', color: PALETTE.preto },
  timelineDias: { fontSize: 10, color: PALETTE.cinza, marginTop: 2 },
});