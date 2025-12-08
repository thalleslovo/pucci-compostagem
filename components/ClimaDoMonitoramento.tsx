import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ===== INTERFACES =====
interface RegistroClima {
  id: string;
  leiraId: string;
  data: string;
  precipitacao: number;
  observacao?: string;
  timestamp: number;
}

interface ClimaDoMonitoramentoProps {
  leiraId: string;
  dataMonitoramento: string;
}

// ===== COMPONENTE PRINCIPAL =====
const ClimaDoMonitoramento: React.FC<ClimaDoMonitoramentoProps> = ({ 
  leiraId, 
  dataMonitoramento 
}) => {
  const [climaDoDia, setClimaDoDia] = useState<RegistroClima | null>(null);
  const [loading, setLoading] = useState(true);

  // ===== CARREGAR DADOS DO DIA =====
  useEffect(() => {
    buscarClimaDoDia();
  }, [leiraId, dataMonitoramento]);

  const buscarClimaDoDia = async () => {
    try {
      console.log(`🌧️ Buscando clima para leira ${leiraId} na data ${dataMonitoramento}`);
      
      const registros = await AsyncStorage.getItem('leirasClimatica');
      if (registros) {
        const todosRegistros: RegistroClima[] = JSON.parse(registros);
        
        // ✅ BUSCAR REGISTRO EXATO: mesma leira + mesma data
        const clima = todosRegistros.find((reg: RegistroClima) => 
          reg.leiraId === leiraId && reg.data === dataMonitoramento
        );
        
        if (clima) {
          console.log(`✅ Clima encontrado: ${clima.precipitacao}mm`);
          setClimaDoDia(clima);
        } else {
          console.log(`ℹ️ Nenhum registro climático para ${dataMonitoramento}`);
          setClimaDoDia(null);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar clima do dia:', error);
      setClimaDoDia(null);
    } finally {
      setLoading(false);
    }
  };

  // ===== FUNÇÕES AUXILIARES =====
  const getPrecipitacaoColor = (precipitacao: number): string => {
    if (precipitacao === 0) return '#EF4444'; // Vermelho - Sem chuva
    if (precipitacao <= 10) return '#F59E0B'; // Amarelo - Leve
    if (precipitacao <= 50) return '#3B82F6'; // Azul - Moderada
    return '#1E40AF'; // Azul escuro - Intensa
  };

  const getPrecipitacaoLabel = (precipitacao: number): string => {
    if (precipitacao === 0) return 'Sem Chuva';
    if (precipitacao <= 10) return 'Leve';
    if (precipitacao <= 50) return 'Moderada';
    return 'Intensa';
  };

  const getPrecipitacaoIcon = (precipitacao: number): string => {
    if (precipitacao === 0) return '☀️';
    if (precipitacao <= 10) return '🌦️';
    if (precipitacao <= 50) return '🌧️';
    return '⛈️';
  };

  // ✅ SE NÃO HÁ DADOS CLIMÁTICOS, NÃO MOSTRA NADA
  if (loading || !climaDoDia) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <Text style={styles.icon}>{getPrecipitacaoIcon(climaDoDia.precipitacao)}</Text>
        <Text style={styles.title}>Precipitação do Dia</Text>
      </View>
      
      {/* ===== CONTEÚDO ===== */}
      <View style={styles.content}>
        {/* PRECIPITAÇÃO */}
        <View style={styles.precipitacaoContainer}>
          <View style={styles.precipitacaoLeft}>
            <Text style={styles.precipitacaoValue}>
              {climaDoDia.precipitacao.toFixed(1)} mm
            </Text>
            <Text style={styles.precipitacaoSubtext}>
              {climaDoDia.precipitacao === 0 ? 'Dia seco' : 'Chuva registrada'}
            </Text>
          </View>
          
          <View style={[
            styles.precipitacaoBadge, 
            { backgroundColor: getPrecipitacaoColor(climaDoDia.precipitacao) }
          ]}>
            <Text style={styles.precipitacaoLabel}>
              {getPrecipitacaoLabel(climaDoDia.precipitacao)}
            </Text>
          </View>
        </View>

        {/* OBSERVAÇÕES */}
        {climaDoDia.observacao && (
          <View style={styles.observacaoContainer}>
            <Text style={styles.observacaoIcon}>💭</Text>
            <Text style={styles.observacaoText}>
              {climaDoDia.observacao}
            </Text>
          </View>
        )}

        {/* IMPACTO NA LEIRA */}
        <View style={styles.impactoContainer}>
          <Text style={styles.impactoText}>
            {climaDoDia.precipitacao === 0 
              ? '☀️ Condições secas - Ideal para aeração'
              : climaDoDia.precipitacao <= 10
                ? '🌦️ Chuva leve - Boa umidade para decomposição'
                : climaDoDia.precipitacao <= 50
                  ? '🌧️ Chuva moderada - Monitorar drenagem'
                  : '⛈️ Chuva intensa - Verificar encharcamento'
            }
          </Text>
        </View>
      </View>
    </View>
  );
};

// ===== ESTILOS =====
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    gap: 8,
  },
  precipitacaoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  precipitacaoLeft: {
    flex: 1,
  },
  precipitacaoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  precipitacaoSubtext: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  precipitacaoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  precipitacaoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  observacaoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
  },
  observacaoIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  observacaoText: {
    fontSize: 11,
    color: '#374151',
    flex: 1,
    lineHeight: 14,
  },
  impactoContainer: {
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 6,
  },
  impactoText: {
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ClimaDoMonitoramento;