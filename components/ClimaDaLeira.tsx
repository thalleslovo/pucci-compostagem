import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ===== PALETTE DE CORES (IGUAL AO SISTEMA) =====
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
  azulClima: '#3B82F6',        // Cor específica para clima
  azulClimaClaro: '#F0F9FF',   // Azul claro para backgrounds
  laranjaAlerta: '#F97316',    // Para umidade Seca
  verdeSucesso: '#22C55E',     // Para umidade Ideal
};

// ===== INTERFACES =====
interface RegistroClima {
  id: string;
  leiraId: string;
  data: string;
  precipitacao: number;
  umidade?: string; // 'Seca' | 'Ideal' | 'Encharcada'
  observacao?: string;
  timestamp: number;
}

interface ClimaDaLeiraProps {
  leiraId: string;
  onDataLoaded?: (registros: RegistroClima[]) => void;
}

// ===== COMPONENT =====
const ClimaDaLeira: React.FC<ClimaDaLeiraProps> = ({ leiraId, onDataLoaded }) => {
  const [dadosClimaticos, setDadosClimaticos] = useState<RegistroClima[]>([]);
  const [loading, setLoading] = useState(true);

  // ===== CARREGAR DADOS =====
  useEffect(() => {
    carregarDadosClimaticos();
  }, [leiraId]);

  const carregarDadosClimaticos = async () => {
    try {
      console.log('🌧️ Carregando dados climáticos da leira:', leiraId);
      
      const registrosClimaticos = await AsyncStorage.getItem('leirasClimatica');
      if (registrosClimaticos) {
        const todosRegistros: RegistroClima[] = JSON.parse(registrosClimaticos);
        
        // ✅ FILTRAR REGISTROS DESTA LEIRA
        const registrosDaLeira = todosRegistros.filter(registro => 
          registro.leiraId === leiraId
        );
        
        // ✅ ORDENAR POR DATA (mais recente primeiro)
        const registrosOrdenados = registrosDaLeira.sort((a, b) => 
          b.timestamp - a.timestamp
        );
        
        setDadosClimaticos(registrosOrdenados);
        
        // ✅ CALLBACK OPCIONAL
        if (onDataLoaded) {
          onDataLoaded(registrosOrdenados);
        }
        
        console.log(`✅ ${registrosOrdenados.length} registros climáticos carregados`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados climáticos:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===== FUNÇÕES AUXILIARES =====
  const getPrecipitacaoColor = (precipitacao: number): string => {
    if (precipitacao === 0) return '#EF4444';      // Vermelho - Sem chuva
    if (precipitacao <= 10) return '#F59E0B';      // Amarelo - Leve
    if (precipitacao <= 50) return PALETTE.azulClima; // Azul - Moderada
    return '#1E40AF';                               // Azul escuro - Intensa
  };

  const getPrecipitacaoLabel = (precipitacao: number): string => {
    if (precipitacao === 0) return 'Sem Chuva';
    if (precipitacao <= 10) return 'Leve';
    if (precipitacao <= 50) return 'Moderada';
    return 'Intensa';
  };

  const getUmidadeColor = (status?: string): string => {
    switch (status) {
      case 'Seca': return PALETTE.laranjaAlerta;
      case 'Ideal': return PALETTE.verdeSucesso;
      case 'Encharcada': return PALETTE.azulClima;
      default: return PALETTE.cinza;
    }
  };

  const calcularTotalPrecipitacao = (): number => {
    return dadosClimaticos.reduce((sum, reg) => sum + reg.precipitacao, 0);
  };

  // ===== RENDER =====
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🌧️ Dados Climáticos</Text>
        <Text style={styles.loadingText}>Carregando dados climáticos...</Text>
      </View>
    );
  }

  if (dadosClimaticos.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🌧️ Dados Climáticos</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🌤️</Text>
          <Text style={styles.emptyText}>
            Nenhum dado climático registrado
          </Text>
          <Text style={styles.emptySubtext}>
            Use o Monitoramento Climático para registrar
          </Text>
        </View>
      </View>
    );
  }

  const ultimoRegistro = dadosClimaticos[0];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌧️ Dados Climáticos</Text>

      {/* ===== RESUMO ===== */}
      <View style={styles.resumoContainer}>
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>Registros</Text>
          <Text style={styles.resumoValue}>{dadosClimaticos.length}</Text>
        </View>
        
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>Total Chuva</Text>
          <Text style={styles.resumoValue}>{calcularTotalPrecipitacao().toFixed(1)} mm</Text>
        </View>
       
        {/* NOVO: CARD DE UMIDADE ATUAL */}
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>Umidade Atual</Text>
          <Text style={[
            styles.resumoValue, 
            { color: getUmidadeColor(ultimoRegistro?.umidade) }
          ]}>
            {ultimoRegistro?.umidade || '-'}
          </Text>
        </View>
      </View>

      {/* ===== HISTÓRICO (ÚLTIMOS 5) ===== */}
      {dadosClimaticos.length > 0 && (
        <View style={styles.historicoContainer}>
          <Text style={styles.historicoTitle}>Últimos Registros:</Text>
          
          {dadosClimaticos.slice(0, 5).map((registro, index) => (
            <View key={registro.id} style={styles.registroItem}>
              <View style={styles.registroHeader}>
                <Text style={styles.registroNumero}>{index + 1}.</Text>
                <View style={styles.registroInfo}>
                  <Text style={styles.registroData}>{registro.data}</Text>
                  
                  {/* LINHA DE PRECIPITAÇÃO */}
                  <View style={styles.registroLinha}>
                    <Text style={styles.registroPrecipitacao}>{registro.precipitacao.toFixed(1)} mm</Text>
                    <View style={[
                      styles.precipitacaoBadge, 
                      { backgroundColor: getPrecipitacaoColor(registro.precipitacao) }
                    ]}>
                      <Text style={styles.precipitacaoText}>
                        {getPrecipitacaoLabel(registro.precipitacao)}
                      </Text>
                    </View>
                  </View>

                  {/* LINHA DE UMIDADE (NOVO) */}
                  {registro.umidade && (
                    <View style={styles.registroLinha}>
                      <Text style={styles.registroLabelPequeno}>Umidade:</Text>
                      <View style={[
                        styles.precipitacaoBadge, 
                        { backgroundColor: getUmidadeColor(registro.umidade) }
                      ]}>
                        <Text style={styles.precipitacaoText}>
                          {registro.umidade}
                        </Text>
                      </View>
                    </View>
                  )}

                  {registro.observacao && (
                    <Text style={styles.observacao}>
                      💭 {registro.observacao}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ))}

          {dadosClimaticos.length > 5 && (
            <Text style={styles.verMais}>
              ... e mais {dadosClimaticos.length - 5} registros
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

// ===== ESTILOS =====
const styles = StyleSheet.create({
  container: {
    backgroundColor: PALETTE.branco,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: PALETTE.azulClima,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.preto,
    marginBottom: 12,
  },
  loadingText: {
    textAlign: 'center',
    color: PALETTE.cinza,
    fontStyle: 'italic',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: PALETTE.cinza,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: PALETTE.cinza,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  resumoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  resumoItem: {
    flex: 1,
    minWidth: '28%', // Ajustado para caber 3 itens
    backgroundColor: PALETTE.azulClimaClaro,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  resumoLabel: {
    fontSize: 10,
    color: PALETTE.cinza,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  resumoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.azulClima,
  },
  historicoContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: PALETTE.cinzaClaro2,
  },
  historicoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.preto,
    marginBottom: 10,
  },
  registroItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.cinzaClaro2,
  },
  registroHeader: {
    flexDirection: 'row',
    flex: 1,
  },
  registroNumero: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.azulClima,
    marginRight: 8,
  },
  registroInfo: {
    flex: 1,
  },
  registroData: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.preto,
    marginBottom: 4,
  },
  registroLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  registroPrecipitacao: {
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE.azulClima,
  },
  registroLabelPequeno: {
    fontSize: 11,
    color: PALETTE.cinza,
  },
  precipitacaoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  precipitacaoText: {
    fontSize: 9,
    fontWeight: '700',
    color: PALETTE.branco,
  },
  observacao: {
    fontSize: 9,
    color: PALETTE.cinza,
    fontStyle: 'italic',
    marginTop: 2,
  },
  verMais: {
    fontSize: 11,
    color: PALETTE.cinza,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default ClimaDaLeira;