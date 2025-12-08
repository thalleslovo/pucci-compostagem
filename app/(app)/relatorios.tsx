// app/(app)/relatorios.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  TextInput

} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  temperature?: number;
  enriquecimentos?: EnriquecimentoLeira[];  // ← ADICIONAR
}

interface MonitoramentoLeira {
  id: string;
  leiraId: string;
  data: string;
  hora?: string;
  temperaturas: PontoTemperatura[];
  revolveu: boolean;
  observacoes?: string;
  statusNovo?: string;
  timestamp: number;
}

interface PontoTemperatura {
  ponto: 'topo' | 'meio' | 'fundo';
  temperatura: number;
}
interface EnriquecimentoLeira {
  id: string;
  leiraId: string;
  dataEnriquecimento: string;      // DD/MM/AAAA
  horaEnriquecimento?: string;     // HH:MM
  pesoAdicionado: number;          // Toneladas
  numeroMTR?: string;              // Opcional
  origem?: string;                 // Sabesp, Ambient, etc
  observacoes?: string;
  pesoAnterior: number;            // Total ANTES
  pesoNovo: number;                // Total DEPOIS
  timestamp: number;
}
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
    case 'formada':
      return PALETTE.terracota;
    case 'secando':
      return PALETTE.warning;
    case 'compostando':
      return PALETTE.verdePrimario;
    case 'maturando':
      return PALETTE.verdeClaro2;
    case 'pronta':
      return PALETTE.sucesso;
    default:
      return PALETTE.cinza;
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'formada':
      return '📦 Formada';
    case 'secando':
      return '💨 Secando';
    case 'compostando':
      return '🔄 Compostando';
    case 'maturando':
      return '🌱 Maturando';
    case 'pronta':
      return '✅ Pronta para Venda';
    default:
      return 'Indefinido';
  }
};

const getTemperaturaMedia = (monitoramentos: MonitoramentoLeira[]): number => {
  if (monitoramentos.length === 0) return 0;

  const todasAsTemperaturas = monitoramentos.flatMap((m) =>
    m.temperaturas.map((t) => t.temperatura)
  );

  const soma = todasAsTemperaturas.reduce((acc, temp) => acc + temp, 0);
  return soma / todasAsTemperaturas.length;
};

const getTemperaturaMaxima = (monitoramentos: MonitoramentoLeira[]): number => {
  if (monitoramentos.length === 0) return 0;

  const todasAsTemperaturas = monitoramentos.flatMap((m) =>
    m.temperaturas.map((t) => t.temperatura)
  );

  return Math.max(...todasAsTemperaturas);
};

const verificarNecessidadeRevolvimento = (
  monitoramentos: MonitoramentoLeira[]
): boolean => {
  if (monitoramentos.length < 2) return false;

  const ultimos2Dias = monitoramentos
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 2);

  if (ultimos2Dias.length < 2) return false;

  const temAlta = ultimos2Dias.every((m) => {
    const maxTemp = Math.max(...m.temperaturas.map((t) => t.temperatura));
    return maxTemp > 65;
  });

  if (temAlta && !ultimos2Dias[0].revolveu) {
    return true;
  }

  return false;
};

export default function RelatoriosScreen() {
  const router = useRouter();
  const [leiras, setLeiras] = useState<Leira[]>([]);
  const [monitoramentos, setMonitoramentos] = useState<MonitoramentoLeira[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroBusca, setFiltroBusca] = useState<string>('');
  const [mostrarBusca, setMostrarBusca] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);

      console.log('🔍 ===== CARREGANDO DADOS PARA RELATÓRIO =====');

      const leirasRegistradas = await AsyncStorage.getItem('leirasFormadas');
      console.log('🌾 Leiras brutas:', leirasRegistradas);

      const leirasData = leirasRegistradas ? JSON.parse(leirasRegistradas) : [];
      console.log('🌾 Total de leiras:', leirasData.length);

      setLeiras(leirasData);

      const monitoramentosRegistrados = await AsyncStorage.getItem(
        'leirasMonitoramento'
      );
      console.log('🌡️ Monitoramentos brutos:', monitoramentosRegistrados);

      const monitoramentosData = monitoramentosRegistrados
        ? JSON.parse(monitoramentosRegistrados)
        : [];

      console.log('🌡️ Total de monitoramentos:', monitoramentosData.length);

      setMonitoramentos(monitoramentosData);

      console.log('✅ ===== DADOS CARREGADOS COM SUCESSO =====');
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  // ===== SISTEMA INTEGRADO DE FILTROS =====
  const leirasFiltradasCompletas = React.useMemo(() => {
    let resultado = [...leiras];

    // Filtro por Status (mantém funcionalidade existente)
    if (filtroStatus !== 'todas') {
      resultado = resultado.filter((leira) => leira.status === filtroStatus);
    }

    // Filtro por Busca Textual (NOVO)
    if (filtroBusca.trim()) {
      const textoBusca = filtroBusca.toLowerCase().trim();
      resultado = resultado.filter((leira) => {
        // Busca em múltiplos campos
        return (

          `leira ${leira.numeroLeira}`.toLowerCase().includes(textoBusca) ||
          `leira#${leira.numeroLeira}`.toLowerCase().includes(textoBusca) ||
          `#${leira.numeroLeira}`.toLowerCase().includes(textoBusca) ||

          // Número da Leira
          leira.numeroLeira.toString().includes(textoBusca) ||
          // Lote
          leira.lote.toLowerCase().includes(textoBusca) ||
          // Data de Formação
          leira.dataFormacao.includes(textoBusca) ||
          // Status
          leira.status.toLowerCase().includes(textoBusca) ||
          getStatusLabel(leira.status).toLowerCase().includes(textoBusca) ||
          // Total Biossólido
          leira.totalBiossólido.toString().includes(textoBusca) ||
          // Buscar nos Biossólidos (MTR, Origem, Data)
          leira.biossólidos.some(bio =>
            bio.numeroMTR.toLowerCase().includes(textoBusca) ||
            bio.origem.toLowerCase().includes(textoBusca) ||
            bio.data.includes(textoBusca) ||
            bio.peso.includes(textoBusca)
          )
        );
      });
    }

    return resultado;
  }, [leiras, filtroStatus, filtroBusca]);

  const leirasOrdenadas = [...leirasFiltradasCompletas].sort((a, b) => {
    const dataA = new Date(a.dataFormacao.split('/').reverse().join('-'));
    const dataB = new Date(b.dataFormacao.split('/').reverse().join('-'));
    return dataB.getTime() - dataA.getTime();
  });


  // ===== CALCULAR ESTATÍSTICAS =====
  const totalLeiras = leiras.length;
  const leirasFormadas = leiras.filter((l) => l.status === 'formada').length;
  const leirasSecando = leiras.filter((l) => l.status === 'secando').length;
  const leirasCompostando = leiras.filter((l) => l.status === 'compostando').length;
  const leirasMaturando = leiras.filter((l) => l.status === 'maturando').length;
  const leirasProtas = leiras.filter((l) => l.status === 'pronta').length;

  // ===== ADICIONAR ESTA FUNÇÃO =====
  const limparTodosFiltros = () => {
    setFiltroBusca('');
    setFiltroStatus('todas');
    setMostrarBusca(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PALETTE.verdePrimario} />
          <Text style={styles.loadingText}>Carregando relatório...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Relatório de Leiras</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              console.log('🔄 Recarregando dados...');
              loadData();
            }}
          >
            <Text style={styles.refreshIcon}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* ===== INFO BOX ===== */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>📊</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Acompanhe suas leiras</Text>
            <Text style={styles.infoText}>
              Visualize, filtre e encontre leiras específicas
            </Text>
          </View>
        </View>

        {/* ===== STATS GERAIS ===== */}
        <View style={styles.statsGeraisBox}>
          <Text style={styles.statsGeraisTitle}>📊 Estatísticas Gerais</Text>
          <View style={styles.statsGeraisContent}>
            <Text style={styles.statsGeraisValue}>{totalLeiras}</Text>
            <Text style={styles.statsGeraisLabel}>Total de Leiras</Text>
          </View>
        </View>

        {/* ===== STATS POR STATUS ===== */}
        <View style={styles.statsStatusContainer}>
          <Text style={styles.statsStatusTitle}>📈 Por Status</Text>

          <View style={styles.statsStatusGrid}>
            <StatBoxStatus
              label="Formadas"
              value={leirasFormadas.toString()}
              icon="📦"
              color={PALETTE.terracota}
              status="formada"
              onPress={() => setFiltroStatus('formada')}
            />
            <StatBoxStatus
              label="Secagem"
              value={leirasSecando.toString()}
              icon="💨"
              color={PALETTE.warning}
              status="secando"
              onPress={() => setFiltroStatus('secando')}
            />
            <StatBoxStatus
              label="Compostagem"
              value={leirasCompostando.toString()}
              icon="🔄"
              color={PALETTE.verdePrimario}
              status="compostando"
              onPress={() => setFiltroStatus('compostando')}
            />
            <StatBoxStatus
              label="Maturação"
              value={leirasMaturando.toString()}
              icon="🌱"
              color={PALETTE.verdeClaro2}
              status="maturando"
              onPress={() => setFiltroStatus('maturando')}
            />
            <StatBoxStatus
              label="Venda"
              value={leirasProtas.toString()}
              icon="✅"
              color={PALETTE.sucesso}
              status="pronta"
              onPress={() => setFiltroStatus('pronta')}
            />
          </View>
        </View>

        {/* ===== FILTROS AVANÇADOS ===== */}
        <View style={styles.filtrosContainer}>
          {/* Header dos Filtros */}
          <View style={styles.filtrosHeaderContainer}>
            <Text style={styles.filtrosTitle}>Filtros e Busca</Text>
            <TouchableOpacity
              style={styles.botaoToggleBusca}
              onPress={() => setMostrarBusca(!mostrarBusca)}
            >
              <Text style={styles.textoToggleBusca}>
                {mostrarBusca ? '🔼 Ocultar' : '🔍 Buscar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Barra de Busca */}
          {mostrarBusca && (
            <View style={styles.containerBusca}>
              {/* Input de Busca */}
              <View style={styles.wrapperInputBusca}>
                <TextInput
                  style={styles.inputBuscaTexto}
                  placeholder="Buscar por número, lote, MTR, origem..."
                  value={filtroBusca}
                  onChangeText={setFiltroBusca}
                  placeholderTextColor={PALETTE.cinza}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {filtroBusca.length > 0 && (
                  <TouchableOpacity
                    style={styles.botaoLimparBusca}
                    onPress={() => setFiltroBusca('')}
                  >
                    <Text style={styles.textoLimparBusca}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Exemplos */}
              <View style={styles.containerExemplos}>
                <Text style={styles.tituloExemplos}>💡 Exemplos:</Text>
                <Text style={styles.textoExemplos}>
                  "Sabesp", "MTR-2025", "25", "compostando"
                </Text>
              </View>

              {/* Contador */}
              <View style={styles.containerResultados}>
                <Text style={styles.textoResultados}>
                  {leirasOrdenadas.length} de {leiras.length} leiras
                  {(filtroBusca || filtroStatus !== 'todas') && ' (filtradas)'}
                </Text>

                {(filtroBusca || filtroStatus !== 'todas') && (
                  <TouchableOpacity
                    style={styles.botaoLimparTudo}
                    onPress={limparTodosFiltros}
                  >
                    <Text style={styles.textoLimparTudo}>Limpar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Filtros por Status */}
          <Text style={styles.subtituloFiltros}>Por Status:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtrosScroll}
          >
            {['todas', 'formada', 'secando', 'compostando', 'maturando', 'pronta'].map(
              (status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filtroBtn,
                    filtroStatus === status && styles.filtroBtnActive,
                  ]}
                  onPress={() => setFiltroStatus(status)}
                >
                  <Text
                    style={[
                      styles.filtroBtnText,
                      filtroStatus === status && styles.filtroBtnTextActive,
                    ]}
                  >
                    {status === 'todas'
                      ? '📋 Todas'
                      : status === 'formada'
                        ? '📦 Formadas'
                        : status === 'secando'
                          ? '💨 Secagem'
                          : status === 'compostando'
                            ? '🔄 Compostagem'
                            : status === 'maturando'
                              ? '🌱 Maturação'
                              : '✅ Venda'}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>
        </View>
        {/* ===== LISTA DE LEIRAS ===== */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              Leiras ({leirasOrdenadas.length})
            </Text>
            <Text style={styles.listSubtitle}>
              {filtroStatus === 'todas'
                ? 'Todas as leiras'
                : `Status: ${getStatusLabel(filtroStatus)}`}
            </Text>
          </View>

          {leirasOrdenadas.length > 0 ? (
            <FlatList
              data={leirasOrdenadas}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <LeiraCard
                  leira={item}
                  monitoramentos={monitoramentos.filter(
                    (m) => m.leiraId === item.id
                  )}
                  onPress={() => {
                    console.log('📍 Navegando para detalhes da leira:', item.id);
                    router.push({
                      pathname: '/detalhes-leira',
                      params: { leiraId: item.id },
                    });
                  }}
                />
              )}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🚜</Text>
              <Text style={styles.emptyText}>Nenhuma leira encontrada</Text>
              <Text style={styles.emptySubtext}>
                Crie uma leira em "Nova Leira" para começar
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ===== COMPONENTE: STAT BOX STATUS =====
function StatBoxStatus({
  label,
  value,
  icon,
  color,
  status,
  onPress,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  status: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.statBoxStatus, { borderTopColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.statBoxStatusIcon}>{icon}</Text>
      <Text style={styles.statBoxStatusLabel}>{label}</Text>
      <Text style={[styles.statBoxStatusValue, { color }]}>{value}</Text>
      <Text style={styles.statBoxStatusHint}>Toque para filtrar</Text>
    </TouchableOpacity>
  );
}

// ===== COMPONENTE: LEIRA CARD =====
function LeiraCard({
  leira,
  monitoramentos,
  onPress,
}: {
  leira: Leira;
  monitoramentos: MonitoramentoLeira[];
  onPress: () => void;
}) {
  const diasPassados = getDiasPassados(leira.dataFormacao);
  const tempMedia = getTemperaturaMedia(monitoramentos);
  const tempMaxima = getTemperaturaMaxima(monitoramentos);
  const precisaRevolver = verificarNecessidadeRevolvimento(monitoramentos);
  const ultimoMonitoramento = monitoramentos.length > 0 ? monitoramentos[0] : null;

  return (
    <TouchableOpacity style={styles.leiraCard} onPress={onPress}>
      <View style={styles.leiraCardHeader}>
        <View style={styles.leiraCardLeft}>
          <Text style={styles.leiraCardIcon}>🌾</Text>
          <View style={styles.leiraCardInfo}>
            <View style={styles.leiraNumberRow}>
              <Text style={styles.leiraNumber}>Leira #{leira.numeroLeira}</Text>
              <View style={styles.loteBadge}>
                <Text style={styles.loteBadgeText}>Lote {leira.lote}</Text>
              </View>
            </View>
            <Text style={styles.leiraData}>{leira.dataFormacao}</Text>
            <Text style={styles.leiraSubtitle}>
              {diasPassados} dia{diasPassados !== 1 ? 's' : ''} atrás
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.leiraStatusBadge,
            { backgroundColor: getStatusColor(leira.status) },
          ]}
        >
          <Text style={styles.leiraStatusText}>
            {getStatusLabel(leira.status)}
          </Text>
        </View>
      </View>

      {precisaRevolver && (
        <View style={styles.alertaRevolvimento}>
          <Text style={styles.alertaIcon}>⚠️</Text>
          <View style={styles.alertaContent}>
            <Text style={styles.alertaTitle}>Revolvimento Necessário</Text>
            <Text style={styles.alertaText}>
              Temperatura {'>'} 65°C por 2+ dias
            </Text>
          </View>
        </View>
      )}

      <View style={styles.leiraCardDetails}>
        <DetailItem label="Biossólido" value={`${leira.totalBiossólido.toFixed(1)} ton`} />
        <DetailItem label="Bagaço" value="12 ton" />
        <DetailItem
          label="Total"
          value={`${(leira.totalBiossólido + 12).toFixed(1)} ton`}
        />
        <DetailItem label="Monitoramentos" value={monitoramentos.length.toString()} />
      </View>

      {monitoramentos.length > 0 && (
        <View style={styles.temperaturaBox}>
          <View style={styles.temperaturaItem}>
            <Text style={styles.temperaturaLabel}>Média</Text>
            <Text style={styles.temperaturaValue}>{tempMedia.toFixed(1)}°C</Text>
          </View>
          <View style={styles.temperaturaItem}>
            <Text style={styles.temperaturaLabel}>Máxima</Text>
            <Text
              style={[
                styles.temperaturaValue,
                tempMaxima > 65 && styles.temperaturaAlta,
              ]}
            >
              {tempMaxima.toFixed(1)}°C
            </Text>
          </View>
          <View style={styles.temperaturaItem}>
            <Text style={styles.temperaturaLabel}>Última Medição</Text>
            <Text style={styles.temperaturaValue}>
              {ultimoMonitoramento?.data}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.leiraCardFooter}>
        <Text style={styles.leiraCardFooterText}>
          Toque para ver detalhes →
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ===== COMPONENTE: DETAIL ITEM =====
function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.verdeClaro,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: PALETTE.cinza,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: PALETTE.branco,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.cinzaClaro2,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: PALETTE.verdePrimario,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE.preto,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: PALETTE.branco,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: PALETTE.terracota,
  },
  infoIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.preto,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: PALETTE.cinza,
  },
  statsGeraisBox: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: PALETTE.branco,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: PALETTE.verdePrimario,
    alignItems: 'center',
  },
  statsGeraisTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.preto,
    marginBottom: 12,
  },
  statsGeraisContent: {
    alignItems: 'center',
  },
  statsGeraisValue: {
    fontSize: 32,
    fontWeight: '800',
    color: PALETTE.verdePrimario,
  },
  statsGeraisLabel: {
    fontSize: 12,
    color: PALETTE.cinza,
    fontWeight: '600',
    marginTop: 4,
  },
  statsStatusContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.preto,
    marginBottom: 12,
  },
  statsStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBoxStatus: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: PALETTE.branco,
    borderRadius: 12,
    padding: 12,
    borderTopWidth: 3,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.cinzaClaro2,
  },
  statBoxStatusIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  statBoxStatusLabel: {
    fontSize: 11,
    color: PALETTE.cinza,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statBoxStatusValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statBoxStatusHint: {
    fontSize: 9,
    color: PALETTE.cinza,
    fontStyle: 'italic',
  },
  filtrosContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filtrosTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.verdePrimario,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  filtrosScroll: {
    gap: 8,
  },
  filtroBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: PALETTE.cinzaClaro2,
    borderWidth: 1.5,
    borderColor: PALETTE.cinzaClaro2,
    marginRight: 8,
  },
  filtroBtnActive: {
    backgroundColor: PALETTE.verdeClaro2,
    borderColor: PALETTE.verdePrimario,
  },
  filtroBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE.cinza,
  },
  filtroBtnTextActive: {
    color: PALETTE.verdePrimario,
  },
  listSection: {
    paddingHorizontal: 20,
  },
  listHeader: {
    marginBottom: 14,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.preto,
  },
  listSubtitle: {
    fontSize: 12,
    color: PALETTE.cinza,
    marginTop: 4,
  },
  leiraCard: {
    backgroundColor: PALETTE.branco,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: PALETTE.verdePrimario,
  },
  leiraCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leiraCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  leiraCardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  leiraCardInfo: {
    flex: 1,
  },
  leiraNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  leiraNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: PALETTE.preto,
  },
  loteBadge: {
    backgroundColor: PALETTE.terracota,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  loteBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.branco,
  },
  leiraData: {
    fontSize: 11,
    color: PALETTE.cinza,
  },
  leiraSubtitle: {
    fontSize: 10,
    color: PALETTE.cinza,
    fontStyle: 'italic',
    marginTop: 2,
  },
  leiraStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  leiraStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.branco,
  },
  alertaRevolvimento: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: PALETTE.warning,
  },
  alertaIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  alertaContent: {
    flex: 1,
  },
  alertaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.preto,
  },
  alertaText: {
    fontSize: 11,
    color: PALETTE.cinza,
    marginTop: 2,
  },
  leiraCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.cinzaClaro2,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 10,
    color: PALETTE.cinza,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.preto,
  },
  temperaturaBox: {
    flexDirection: 'row',
    backgroundColor: PALETTE.verdeClaro2,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  temperaturaItem: {
    flex: 1,
    alignItems: 'center',
  },
  temperaturaLabel: {
    fontSize: 10,
    color: PALETTE.cinza,
    fontWeight: '600',
    marginBottom: 4,
  },
  temperaturaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.verdePrimario,
  },
  temperaturaAlta: {
    color: PALETTE.erro,
  },
  leiraCardFooter: {
    alignItems: 'center',
    paddingTop: 8,
  },
  leiraCardFooterText: {
    fontSize: 11,
    color: PALETTE.verdePrimario,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.preto,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 12,
    color: PALETTE.cinza,
  },
  // ===== ADICIONAR ESTES ESTILOS NO FINAL DO StyleSheet =====

  // Filtros Header
  filtrosHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  botaoToggleBusca: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: PALETTE.verdeClaro2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE.verdePrimario,
  },

  textoToggleBusca: {
    fontSize: 10,
    fontWeight: '600',
    color: PALETTE.verdePrimario,
  },

  subtituloFiltros: {
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE.cinza,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  // Container da Busca
  containerBusca: {
    backgroundColor: PALETTE.branco,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PALETTE.cinzaClaro2,
  },

  wrapperInputBusca: {
    position: 'relative',
    marginBottom: 8,
  },

  inputBuscaTexto: {
    height: 44,
    borderWidth: 1,
    borderColor: PALETTE.cinzaClaro,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    backgroundColor: PALETTE.cinzaClaro2,
    paddingRight: 40,
  },

  botaoLimparBusca: {
    position: 'absolute',
    right: 12,
    top: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PALETTE.cinzaClaro,
    borderRadius: 12,
  },

  textoLimparBusca: {
    fontSize: 14,
    color: PALETTE.cinza,
    fontWeight: '600',
  },

  // Exemplos
  containerExemplos: {
    marginBottom: 8,
  },

  tituloExemplos: {
    fontSize: 10,
    fontWeight: '600',
    color: PALETTE.verdePrimario,
    marginBottom: 4,
  },

  textoExemplos: {
    fontSize: 10,
    color: PALETTE.cinza,
    fontStyle: 'italic',
  },

  // Resultados
  containerResultados: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: PALETTE.cinzaClaro2,
  },

  textoResultados: {
    fontSize: 11,
    color: PALETTE.cinza,
    fontWeight: '600',
  },

  botaoLimparTudo: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: PALETTE.terracota,
    borderRadius: 6,
  },

  textoLimparTudo: {
    fontSize: 10,
    color: PALETTE.branco,
    fontWeight: '700',
  },
});