import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PALETTE = {
  verdePrimario: '#5D7261',
  verdeClaro: '#F0F5F0',
  verdeClaro2: '#E8F0E8',
  branco: '#FFFFFF',
  preto: '#1A1A1A',
  cinza: '#666666',
  cinzaClaro: '#EEEEEE',
  cinzaClaro2: '#F5F5F5',
  sucesso: '#4CAF50',
  warning: '#FF9800',
  terracota: '#B16338',
};

interface Leira {
  id: string;
  numeroLeira: number;
  lote: string;
  dataFormacao: string;
  status: string;
  totalBiossólido: number;
  biossólidos: any[];
  bagaço: number;
  monitoramentosCount?: number;
}

export default function SelecionarLeiraScreen() {
  const router = useRouter();
  const [leiras, setLeiras] = useState<Leira[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ===== FILTROS =====
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedLote, setSelectedLote] = useState<string | null>(null);
  const [selectedNumero, setSelectedNumero] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      carregarLeiras();
    }, [])
  );

  const carregarLeiras = async () => {
    try {
      setLoading(true);
      console.log('📍 Carregando leiras para seleção...');

      const leirasData = await AsyncStorage.getItem('leirasFormadas');
      const leirasArray = leirasData ? JSON.parse(leirasData) : [];

      console.log(`📊 Total de leiras encontradas: ${leirasArray.length}`);

      // ← CARREGAR MONITORAMENTOS PARA CONTAR
      const monitoramentosData = await AsyncStorage.getItem('leirasMonitoramento');
      const monitoramentosArray = monitoramentosData ? JSON.parse(monitoramentosData) : [];

      // ← ADICIONAR CONTAGEM A CADA LEIRA
      const leirasComContagem = leirasArray.map((leira: Leira) => ({
        ...leira,
        monitoramentosCount: monitoramentosArray.filter(
          (m: any) => m.leiraId === leira.id
        ).length,
      }));

      setLeiras(leirasComContagem);
      console.log('✅ Leiras carregadas com sucesso');
    } catch (error) {
      console.error('❌ Erro ao carregar leiras:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    carregarLeiras();
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  // ===== EXTRAIR LOTES ÚNICOS =====
  const lotesUnicos = useMemo(() => {
    const lotes = [...new Set(leiras.map((l) => l.lote))].sort();
    return lotes;
  }, [leiras]);

  // ===== EXTRAIR NÚMEROS ÚNICOS DO LOTE SELECIONADO =====
  const numerosUnicos = useMemo(() => {
    if (!selectedLote) return [];
    const numeros = leiras
      .filter((l) => l.lote === selectedLote)
      .map((l) => l.numeroLeira)
      .sort((a, b) => a - b);
    return numeros;
  }, [leiras, selectedLote]);

  // ===== EXTRAIR STATUS ÚNICOS =====
  const statusUnicos = useMemo(() => {
    const status = [...new Set(leiras.map((l) => l.status))];
    return status;
  }, [leiras]);

  // ===== FILTRAR LEIRAS =====
  const leirasFiltradas = useMemo(() => {
    return leiras.filter((leira) => {
      // Filtro por busca (lote + número)
      if (searchText.trim()) {
        const search = searchText.toLowerCase();
        const matchLote = leira.lote.toLowerCase().includes(search);
        const matchNumero = leira.numeroLeira.toString().includes(search);
        if (!matchLote && !matchNumero) return false;
      }

      // Filtro por lote
      if (selectedLote && leira.lote !== selectedLote) return false;

      // Filtro por número
      if (selectedNumero && leira.numeroLeira !== selectedNumero) return false;

      // Filtro por status
      if (selectedStatus && leira.status !== selectedStatus) return false;

      return true;
    });
  }, [leiras, searchText, selectedLote, selectedNumero, selectedStatus]);

  // ===== LIMPAR FILTROS =====
  const limparFiltros = () => {
    setSearchText('');
    setSelectedLote(null);
    setSelectedNumero(null);
    setSelectedStatus(null);
  };

  const temFiltrosAtivos = searchText || selectedLote || selectedNumero || selectedStatus;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'formada':
        return PALETTE.terracota;
      case 'secando':
        return PALETTE.warning;
      case 'compostando':
        return PALETTE.verdePrimario;
      case 'maturando':
        return '#8BC34A';
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
        return '✅ Pronta';
      default:
        return 'Indefinido';
    }
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PALETTE.verdePrimario} />
          <Text style={styles.loadingText}>Carregando leiras...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (leiras.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}></Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Monitorar Leira</Text>
          <View />
        </View>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>Nenhuma leira cadastrada</Text>
          <Text style={styles.emptySubtext}>Crie uma leira em "Nova Leira"</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monitorar Leira</Text>
        <View />
      </View>

      {/* ===== SEARCH BAR ===== */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por lote ou número (ex: 2024 ou 38)"
            placeholderTextColor={PALETTE.cinza}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterButtonIcon}>⚙️</Text>
          {temFiltrosAtivos && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PALETTE.verdePrimario}
          />
        }
      >
        {/* ===== FILTROS ATIVOS ===== */}
        {temFiltrosAtivos && (
          <View style={styles.filtrosAtivosBox}>
            <View style={styles.filtrosAtivosContent}>
              <Text style={styles.filtrosAtivosText}>
                {leirasFiltradas.length} resultado(s)
              </Text>
              <TouchableOpacity onPress={limparFiltros}>
                <Text style={styles.limparFiltrosBtn}>Limpar filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ===== LEIRAS FILTRADAS ===== */}
        {leirasFiltradas.length === 0 ? (
          <View style={styles.emptyFilterContainer}>
            <Text style={styles.emptyFilterIcon}>🔍</Text>
            <Text style={styles.emptyFilterText}>Nenhuma leira encontrada</Text>
            <Text style={styles.emptyFilterSubtext}>
              {searchText
                ? 'Tente ajustar sua busca'
                : 'Tente ajustar os filtros'}
            </Text>
          </View>
        ) : (
          <View style={styles.leirasContainer}>
            {leirasFiltradas.map((leira) => (
              <TouchableOpacity
                key={leira.id}
                style={styles.leiraCard}
                onPress={() => {
                  console.log('🔗 Navegando para detalhes da leira:', leira.id);
                  router.push({
                    pathname: '/(app)/detalhes-leira',
                    params: { leiraId: leira.id },
                  });
                }}
              >
                {/* ===== PARTE ESQUERDA ===== */}
                <View style={styles.leiraCardLeft}>
                  <View style={styles.leiraCardHeader}>
                    <Text style={styles.leiraNumber}>Leira #{leira.numeroLeira}</Text>
                    <Text style={styles.leireLote}>Lote {leira.lote}</Text>
                  </View>

                  <View style={styles.leiraCardMetrics}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Formação</Text>
                      <Text style={styles.metricValue}>{leira.dataFormacao}</Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Dias</Text>
                      <Text style={styles.metricValue}>{getDiasPassados(leira.dataFormacao)}</Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Total</Text>
                      <Text style={styles.metricValue}>
                        {(leira.totalBiossólido + 12).toFixed(0)} ton
                      </Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Mon.</Text>
                      <Text style={styles.metricValue}>{leira.monitoramentosCount || 0}</Text>
                    </View>
                  </View>
                </View>

                {/* ===== PARTE DIREITA (STATUS) ===== */}
                <View
                  style={[
                    styles.leiraCardStatus,
                    { backgroundColor: getStatusColor(leira.status) },
                  ]}
                >
                  <Text style={styles.leiraCardStatusEmoji}>
                    {leira.status === 'formada'
                      ? '📦'
                      : leira.status === 'secando'
                        ? '💨'
                        : leira.status === 'compostando'
                          ? '🔄'
                          : leira.status === 'maturando'
                            ? '🌱'
                            : '✅'}
                  </Text>
                  <Text style={styles.leiraCardStatusText}>{leira.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ===== MODAL DE FILTROS ===== */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtros Avançados</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text style={styles.modalCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* FILTRO: LOTE */}
            <View style={styles.modalFilterGroup}>
              <Text style={styles.modalFilterLabel}>📅 Lote</Text>
              <View style={styles.modalFilterOptions}>
                <TouchableOpacity
                  style={[
                    styles.modalFilterBtn,
                    !selectedLote && styles.modalFilterBtnActive,
                  ]}
                  onPress={() => {
                    setSelectedLote(null);
                    setSelectedNumero(null);
                  }}
                >
                  <Text
                    style={[
                      styles.modalFilterBtnText,
                      !selectedLote && styles.modalFilterBtnTextActive,
                    ]}
                  >
                    Todos ({leiras.length})
                  </Text>
                </TouchableOpacity>

                {lotesUnicos.map((lote) => {
                  const count = leiras.filter((l) => l.lote === lote).length;
                  return (
                    <TouchableOpacity
                      key={lote}
                      style={[
                        styles.modalFilterBtn,
                        selectedLote === lote && styles.modalFilterBtnActive,
                      ]}
                      onPress={() => {
                        setSelectedLote(lote);
                        setSelectedNumero(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalFilterBtnText,
                          selectedLote === lote && styles.modalFilterBtnTextActive,
                        ]}
                      >
                        {lote} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* FILTRO: NÚMERO DA LEIRA */}
            {selectedLote && numerosUnicos.length > 0 && (
              <View style={styles.modalFilterGroup}>
                <Text style={styles.modalFilterLabel}>🏔️ Número da Leira</Text>
                <View style={styles.modalFilterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.modalFilterBtn,
                      !selectedNumero && styles.modalFilterBtnActive,
                    ]}
                    onPress={() => setSelectedNumero(null)}
                  >
                    <Text
                      style={[
                        styles.modalFilterBtnText,
                        !selectedNumero && styles.modalFilterBtnTextActive,
                      ]}
                    >
                      Todas ({numerosUnicos.length})
                    </Text>
                  </TouchableOpacity>

                  {numerosUnicos.map((numero) => (
                    <TouchableOpacity
                      key={numero}
                      style={[
                        styles.modalFilterBtn,
                        selectedNumero === numero && styles.modalFilterBtnActive,
                      ]}
                      onPress={() => setSelectedNumero(numero)}
                    >
                      <Text
                        style={[
                          styles.modalFilterBtnText,
                          selectedNumero === numero && styles.modalFilterBtnTextActive,
                        ]}
                      >
                        #{numero}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* FILTRO: STATUS */}
            <View style={styles.modalFilterGroup}>
              <Text style={styles.modalFilterLabel}>📊 Status</Text>
              <View style={styles.modalFilterOptions}>
                <TouchableOpacity
                  style={[
                    styles.modalFilterBtn,
                    !selectedStatus && styles.modalFilterBtnActive,
                  ]}
                  onPress={() => setSelectedStatus(null)}
                >
                  <Text
                    style={[
                      styles.modalFilterBtnText,
                      !selectedStatus && styles.modalFilterBtnTextActive,
                    ]}
                  >
                    Todos ({leiras.length})
                  </Text>
                </TouchableOpacity>

                {statusUnicos.map((status) => {
                  const count = leiras.filter((l) => l.status === status).length;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.modalFilterBtn,
                        selectedStatus === status && styles.modalFilterBtnActive,
                      ]}
                      onPress={() => setSelectedStatus(status)}
                    >
                      <Text
                        style={[
                          styles.modalFilterBtnText,
                          selectedStatus === status && styles.modalFilterBtnTextActive,
                        ]}
                      >
                        {getStatusLabel(status)} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalLimparBtn}
              onPress={limparFiltros}
            >
              <Text style={styles.modalLimparBtnText}>Limpar Tudo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalAplicarBtn}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.modalAplicarBtnText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.verdeClaro,
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

  // ===== SEARCH =====
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: PALETTE.branco,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.cinzaClaro2,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.cinzaClaro2,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: PALETTE.preto,
  },
  searchClear: {
    fontSize: 18,
    color: PALETTE.cinza,
    fontWeight: '700',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: PALETTE.verdePrimario,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonIcon: {
    fontSize: 20,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PALETTE.warning,
  },

  // ===== SCROLL =====
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },

  // ===== FILTROS ATIVOS =====
  filtrosAtivosBox: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: PALETTE.verdeClaro2,
    marginBottom: 12,
  },
  filtrosAtivosContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filtrosAtivosText: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.verdePrimario,
  },
  limparFiltrosBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.warning,
  },

  // ===== LEIRAS =====
  leirasContainer: {
    paddingHorizontal: 20,
  },
  leiraCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PALETTE.branco,
    borderRadius: 13,
    padding: 15,
    marginBottom: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  leiraCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  leiraCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  leiraNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.preto,
  },
  leireLote: {
    fontSize: 12,
    color: PALETTE.cinza,
    fontWeight: '600',
  },
  leiraCardMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: PALETTE.cinzaClaro2,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 7,
    color: PALETTE.cinza,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.verdePrimario,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 18,
    backgroundColor: PALETTE.cinzaClaro,
  },
  leiraCardStatus: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leiraCardStatusEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  leiraCardStatusText: {
    color: PALETTE.branco,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ===== EMPTY STATES =====
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: PALETTE.cinza,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE.preto,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: PALETTE.cinza,
    textAlign: 'center',
  },
  emptyFilterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyFilterIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyFilterText: {
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.preto,
    marginBottom: 6,
  },
  emptyFilterSubtext: {
    fontSize: 13,
    color: PALETTE.cinza,
  },

  // ===== MODAL =====
  modalContainer: {
    flex: 1,
    backgroundColor: PALETTE.branco,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.cinzaClaro2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE.preto,
  },
  modalCloseIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: PALETTE.cinza,
  },
  modalContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalFilterGroup: {
    marginBottom: 24,
  },
  modalFilterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.preto,
    marginBottom: 12,
  },
  modalFilterOptions: {
    gap: 8,
  },
  modalFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PALETTE.cinzaClaro2,
    borderWidth: 1,
    borderColor: PALETTE.cinzaClaro,
  },
  modalFilterBtnActive: {
    backgroundColor: PALETTE.verdePrimario,
    borderColor: PALETTE.verdePrimario,
  },
  modalFilterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE.cinza,
  },
  modalFilterBtnTextActive: {
    color: PALETTE.branco,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: PALETTE.cinzaClaro2,
  },
  modalLimparBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PALETTE.cinzaClaro2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLimparBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.cinza,
  },
  modalAplicarBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PALETTE.verdePrimario,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAplicarBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.branco,
  },
});