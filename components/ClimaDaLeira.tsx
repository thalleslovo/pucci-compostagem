import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
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
};

// ===== INTERFACES =====
interface RegistroClima {
  id: string;
  leiraId: string;
  data: string;
  precipitacao: number;
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

  const calcularTotalPrecipitacao = (): number => {
    return dadosClimaticos.reduce((sum, reg) => sum + reg.precipitacao, 0);
  };

  const calcularMediaPrecipitacao = (): number => {
    if (dadosClimaticos.length === 0) return 0;
    return calcularTotalPrecipitacao() / dadosClimaticos.length;
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌧️ Dados Climáticos</Text>

      {/* ===== RESUMO (IGUAL AOS DADOS DA LEIRA) ===== */}
      <View style={styles.resumoContainer}>
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>Registros</Text>
          <Text style={styles.resumoValue}>{dadosClimaticos.length}</Text>
        </View>
        
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>Total</Text>
          <Text style={styles.resumoValue}>{calcularTotalPrecipitacao().toFixed(1)} mm</Text>
        </View>
       
        
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>Último</Text>
          <Text style={styles.resumoValue}>{dadosClimaticos[0]?.data}</Text>
        </View>
      </View>

      {/* ===== HISTÓRICO (ÚLTIMOS 5) ===== */}
      {dadosClimaticos.length > 0 && (
        <View style={styles.historicoContainer}>
          <Text style={styles.historicoTitle}>Últimos Registros de Precipitação:</Text>
          
          {dadosClimaticos.slice(0, 5).map((registro, index) => (
            <View key={registro.id} style={styles.registroItem}>
              <View style={styles.registroHeader}>
                <Text style={styles.registroNumero}>{index + 1}.</Text>
                <View style={styles.registroInfo}>
                  <Text style={styles.registroData}>{registro.data}</Text>
                  <Text style={styles.registroPrecipitacao}>{registro.precipitacao.toFixed(1)} mm</Text>
                  <View style={styles.registroDetalhes}>
                    <View style={[
                      styles.precipitacaoBadge, 
                      { backgroundColor: getPrecipitacaoColor(registro.precipitacao) }
                    ]}>
                      <Text style={styles.precipitacaoText}>
                        {getPrecipitacaoLabel(registro.precipitacao)}
                      </Text>
                    </View>
                    {registro.observacao && (
                      <Text style={styles.observacao}>
                        💭 {registro.observacao}
                      </Text>
                    )}
                  </View>
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

// ===== ESTILOS PADRONIZADOS (IGUAL AOS DADOS DA LEIRA) =====
const styles = StyleSheet.create({
  container: {
    backgroundColor: PALETTE.branco,        // ← Igual aos dados da leira
    marginHorizontal: 20,                  // ← Igual aos dados da leira
    marginBottom: 16,                      // ← Igual aos dados da leira
    borderRadius: 14,                      // ← Igual aos dados da leira
    padding: 16,                           // ← Igual aos dados da leira
    borderLeftWidth: 4,
    borderLeftColor: PALETTE.azulClima,    // ← Azul para diferenciar (clima)
    shadowColor: '#000',                   // ← Adicionar sombra igual
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 14,                          // ← Igual ao dadosTitle
    fontWeight: '700',
    color: PALETTE.preto,                  // ← Usar PALETTE.preto
    marginBottom: 12,
  },
  loadingText: {
    textAlign: 'center',
    color: PALETTE.cinza,                  // ← Usar PALETTE.cinza
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
    color: PALETTE.cinza,                  // ← Usar PALETTE.cinza
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: PALETTE.cinza,                  // ← Usar PALETTE.cinza
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
    minWidth: '22%',                       // ← Igual ao dadoItem
    backgroundColor: PALETTE.azulClimaClaro, // ← Azul claro para clima
    padding: 10,
    borderRadius: 10,                      // ← Igual ao dadoItem
    alignItems: 'center',
  },
  resumoLabel: {
    fontSize: 10,                          // ← Igual ao dadoLabel
    color: PALETTE.cinza,                  // ← Usar PALETTE.cinza
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  resumoValue: {
    fontSize: 14,                          // ← Igual ao dadoValue
    fontWeight: '700',
    color: PALETTE.azulClima,              // ← Azul para clima
  },
  historicoContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: PALETTE.cinzaClaro2,   // ← Usar PALETTE.cinzaClaro2
  },
  historicoTitle: {
    fontSize: 12,                          // ← Igual ao biossólidosTitle
    fontWeight: '700',
    color: PALETTE.preto,                  // ← Usar PALETTE.preto
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
    fontSize: 12,                          // ← Igual ao biossólidoNumber
    fontWeight: '700',
    color: PALETTE.azulClima,              // ← Azul para clima
    marginRight: 8,
  },
  registroInfo: {
    flex: 1,
  },
  registroData: {
    fontSize: 12,                          // ← Igual ao biossólidoMTR
    fontWeight: '700',
    color: PALETTE.preto,
  },
  registroPrecipitacao: {
    fontSize: 11,                          // ← Igual ao biossólidoPeso
    fontWeight: '600',
    color: PALETTE.azulClima,              // ← Azul para clima
    marginTop: 2,
  },
  registroDetalhes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
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
    fontSize: 9,                           // ← Igual ao biossólidoOrigemData
    color: PALETTE.cinza,                  // ← Usar PALETTE.cinza
    fontStyle: 'italic',
    flex: 1,
  },
  verMais: {
    fontSize: 11,
    color: PALETTE.cinza,                  // ← Usar PALETTE.cinza
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default ClimaDaLeira;