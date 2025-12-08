// app/(app)/detalhes-leira.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput as RNTextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ClimaDaLeira from 'components/ClimaDaLeira';
import ClimaDoMonitoramento from 'components/ClimaDoMonitoramento';
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

// ===== INTERFACES =====
interface BiossólidoEntry {
  id: string;
  data: string;
  numeroMTR: string;
  peso: string;
  origem: string;
  tipoMaterial: string;
}

interface PontoTemperatura {
  ponto: 'topo' | 'meio' | 'fundo';
  temperatura: number;
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
  enriquecimentos?: EnriquecimentoLeira[];
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
  volumeOriginal?: number;
  volumeFinal?: number;
  quebraVolume?: number;
  percentualQuebra?: number;
  diasDesdeFormacao?: number;
  timestamp: number;
}

interface EnriquecimentoLeira {
  id: string;
  leiraId: string;
  dataEnriquecimento: string;
  horaEnriquecimento?: string;
  pesoAdicionado: number;
  numeroMTR?: string;
  origem?: string;
  observacoes?: string;
  pesoAnterior: number;
  pesoNovo: number;
  timestamp: number;
}

interface AlertaTemperatura {
  ativo: boolean;
  dias: number;
  temperatura: number;
  mensagem: string;
  tempMedia1: number;
  tempMedia2: number;
  data1: string;
  data2: string;
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

const formatarData = (text: string): string => {
  let numeros = text.replace(/\D/g, '');
  numeros = numeros.slice(0, 8);

  if (numeros.length <= 2) {
    return numeros;
  } else if (numeros.length <= 4) {
    return numeros.slice(0, 2) + '/' + numeros.slice(2);
  } else {
    return numeros.slice(0, 2) + '/' + numeros.slice(2, 4) + '/' + numeros.slice(4, 8);
  }
};

const verificarAlertaTemperatura = (
  monitoramentosAtualizados: MonitoramentoLeira[]
): AlertaTemperatura => {
  console.log('🔔 ===== VERIFICANDO ALERTA DE TEMPERATURA =====');

  const monitoramentosComTemp = monitoramentosAtualizados.filter(
    (m) => m.temperaturas.length > 0
  );

  const ultimos2Dias = monitoramentosComTemp
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 2);

  console.log('🔔 Últimas 2 medições com temperatura:', ultimos2Dias.length);

  if (ultimos2Dias.length < 2) {
    console.log('ℹ️ Menos de 2 medições com temperatura. Sem alerta.');
    return {
      ativo: false,
      dias: 0,
      temperatura: 0,
      mensagem: '',
      tempMedia1: 0,
      tempMedia2: 0,
      data1: '',
      data2: '',
    };
  }

  const temAlta = ultimos2Dias.every((m) => {
    const maxTemp = Math.max(...m.temperaturas.map((t) => t.temperatura));
    console.log(`🌡️ Medição ${m.data}: máxima ${maxTemp}°C`);
    return maxTemp > 65;
  });

  if (temAlta) {
    console.log('⚠️ ALERTA: Temperatura > 65°C por 2+ dias!');

    const tempMedia1 =
      (ultimos2Dias[0].temperaturas[0].temperatura +
        ultimos2Dias[0].temperaturas[1].temperatura +
        ultimos2Dias[0].temperaturas[2].temperatura) /
      3;

    const tempMedia2 =
      (ultimos2Dias[1].temperaturas[0].temperatura +
        ultimos2Dias[1].temperaturas[1].temperatura +
        ultimos2Dias[1].temperaturas[2].temperatura) /
      3;

    return {
      ativo: true,
      dias: 2,
      temperatura: 65,
      mensagem: 'Temperatura > 65°C por 2+ dias',
      tempMedia1,
      tempMedia2,
      data1: ultimos2Dias[0].data,
      data2: ultimos2Dias[1].data,
    };
  } else {
    console.log('ℹ️ Temperatura dentro dos limites');
    return {
      ativo: false,
      dias: 0,
      temperatura: 0,
      mensagem: '',
      tempMedia1: 0,
      tempMedia2: 0,
      data1: '',
      data2: '',
    };
  }
};

// ← CALCULAR TOTAL COM ENRIQUECIMENTOS
const calcularTotalComEnriquecimentos = (leira: Leira): number => {
  let total = leira.totalBiossólido;

  if (leira.enriquecimentos && leira.enriquecimentos.length > 0) {
    total += leira.enriquecimentos.reduce(
      (sum, enr) => sum + enr.pesoAdicionado,
      0
    );
  }

  return total;
};

// ← ORDENAR ENRIQUECIMENTOS
const getEnriquecimentosOrdenados = (
  enriquecimentos?: EnriquecimentoLeira[]
): EnriquecimentoLeira[] => {
  if (!enriquecimentos) return [];
  return [...enriquecimentos].sort((a, b) => b.timestamp - a.timestamp);
};

export default function DetalhesLeiraScreen() {
  const router = useRouter();
  const { leiraId } = useLocalSearchParams();
  const [leira, setLeira] = useState<Leira | null>(null);
  const [monitoramentos, setMonitoramentos] = useState<MonitoramentoLeira[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // ← ESTADOS DE ENRIQUECIMENTO
  const [showEnriquecimentoForm, setShowEnriquecimentoForm] = useState(false);
  const [enriquecimentos, setEnriquecimentos] = useState<EnriquecimentoLeira[]>([]);

  const [alerta, setAlerta] = useState<AlertaTemperatura>({
    ativo: false,
    dias: 0,
    temperatura: 0,
    mensagem: '',
    tempMedia1: 0,
    tempMedia2: 0,
    data1: '',
    data2: '',
  });

  // ===== FORM STATE =====
  const [formData, setFormData] = useState({
    data: new Date().toLocaleDateString('pt-BR'),
    topoTemp: '',
    meioTemp: '',
    fundoTemp: '',
    revolveu: false,
    statusNovo: '',
    observacoes: '',
    volumeOriginal: '',
    volumeFinal: '',
  });

  // ← FORM STATE ENRIQUECIMENTO
  const [enriquecimentoData, setEnriquecimentoData] = useState({
    data: new Date().toLocaleDateString('pt-BR'),
    pesoAdicionado: '',
    numeroMTR: '',
    origem: '',
    observacoes: '',
  });

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [leiraId])
  );

  // ===== CARREGAR DADOS =====
  const loadData = async () => {
    try {
      setLoading(true);

      console.log('📍 ===== CARREGANDO DETALHES DA LEIRA =====');
      console.log('📍 Leira ID:', leiraId);

      const leirasRegistradas = await AsyncStorage.getItem('leirasFormadas');
      const leirasData = leirasRegistradas ? JSON.parse(leirasRegistradas) : [];

      const leiraEncontrada = leirasData.find((l: Leira) => l.id === leiraId);

      if (!leiraEncontrada) {
        console.error('❌ Leira não encontrada');
        Alert.alert('Erro', 'Leira não encontrada');
        router.back();
        return;
      }

      console.log('✅ Leira encontrada:', leiraEncontrada.numeroLeira);

      setLeira(leiraEncontrada);

      const volumeTotal = leiraEncontrada.totalBiossólido + 12;

      setFormData((prev) => ({
        ...prev,
        statusNovo: leiraEncontrada.status,
        volumeOriginal: volumeTotal.toFixed(2),
      }));

      const monitoramentosRegistrados = await AsyncStorage.getItem('leirasMonitoramento');
      const monitoramentosData = monitoramentosRegistrados
        ? JSON.parse(monitoramentosRegistrados)
        : [];

      const monitoramentosFiltrados = monitoramentosData.filter(
        (m: MonitoramentoLeira) => m.leiraId === leiraId
      );

      monitoramentosFiltrados.sort((a: MonitoramentoLeira, b: MonitoramentoLeira) =>
        b.timestamp - a.timestamp
      );

      console.log('🌡️ Monitoramentos encontrados:', monitoramentosFiltrados.length);

      setMonitoramentos(monitoramentosFiltrados);

      // ← CARREGAR ENRIQUECIMENTOS
      const enriquecimentosRegistrados = await AsyncStorage.getItem('leirasEnriquecimentos');
      const enriquecimentosData = enriquecimentosRegistrados
        ? JSON.parse(enriquecimentosRegistrados)
        : [];

      const enriquecimentosFiltrados = enriquecimentosData.filter(
        (e: EnriquecimentoLeira) => e.leiraId === leiraId
      );

      console.log('💪 Enriquecimentos encontrados:', enriquecimentosFiltrados.length);

      setEnriquecimentos(enriquecimentosFiltrados);

      const alertaAtual = verificarAlertaTemperatura(monitoramentosFiltrados);
      setAlerta(alertaAtual);

      console.log('✅ ===== DADOS CARREGADOS COM SUCESSO =====');
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  // ← REGISTRAR ENRIQUECIMENTO
const handleRegistrarEnriquecimento = async () => {
  console.log('💪 ===== REGISTRANDO ENRIQUECIMENTO =====');

  if (!enriquecimentoData.data.trim()) {
    Alert.alert('Erro', 'Digite a data');
    return;
  }

  if (!enriquecimentoData.pesoAdicionado.trim()) {
    Alert.alert('Erro', 'Digite o peso adicionado');
    return;
  }

  const pesoAdicionado = parseFloat(enriquecimentoData.pesoAdicionado);

  if (isNaN(pesoAdicionado) || pesoAdicionado <= 0) {
    Alert.alert('Erro', 'Peso deve ser um número maior que 0');
    return;
  }

  if (!leira) {
    Alert.alert('Erro', 'Leira não carregada');
    return;
  }

  try {
    const pesoAnterior = calcularTotalComEnriquecimentos(leira);
    const pesoNovo = pesoAnterior + pesoAdicionado;

    const novoEnriquecimento: EnriquecimentoLeira = {
      id: Date.now().toString(),
      leiraId: leiraId as string,
      dataEnriquecimento: enriquecimentoData.data,
      horaEnriquecimento: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      pesoAdicionado,
      numeroMTR: enriquecimentoData.numeroMTR || undefined,
      origem: enriquecimentoData.origem || undefined,
      observacoes: enriquecimentoData.observacoes || undefined,
      pesoAnterior,
      pesoNovo,
      timestamp: Date.now(),
    };

    console.log('💪 Novo enriquecimento:', novoEnriquecimento);

    const enriquecimentosRegistrados = await AsyncStorage.getItem('leirasEnriquecimentos');
    const enriquecimentosDataArray = enriquecimentosRegistrados
      ? JSON.parse(enriquecimentosRegistrados)
      : [];

    enriquecimentosDataArray.push(novoEnriquecimento);
    await AsyncStorage.setItem(
      'leirasEnriquecimentos',
      JSON.stringify(enriquecimentosDataArray)
    );

    console.log('✅ Enriquecimento salvo');

    const leirasRegistradas = await AsyncStorage.getItem('leirasFormadas');
    const leirasData = leirasRegistradas ? JSON.parse(leirasRegistradas) : [];

    const leiraIndex = leirasData.findIndex((l: Leira) => l.id === leiraId);

    if (leiraIndex !== -1) {
      const leiraAtualizada = leirasData[leiraIndex];

      if (!leiraAtualizada.enriquecimentos) {
        leiraAtualizada.enriquecimentos = [];
      }
      leiraAtualizada.enriquecimentos.push(novoEnriquecimento);

      leirasData[leiraIndex] = leiraAtualizada;
      await AsyncStorage.setItem('leirasFormadas', JSON.stringify(leirasData));

      setLeira(leiraAtualizada);
    }

    setEnriquecimentos([novoEnriquecimento, ...enriquecimentos]);

    // ✅ ADICIONAR À FILA DE SINCRONIZAÇÃO
    await syncService.adicionarFila('enriquecimento', novoEnriquecimento);
    console.log('📝 Enriquecimento adicionado à fila de sincronização');

    setEnriquecimentoData({
      data: new Date().toLocaleDateString('pt-BR'),
      pesoAdicionado: '',
      numeroMTR: '',
      origem: '',
      observacoes: '',
    });

    setShowEnriquecimentoForm(false);

    Alert.alert('Sucesso', `${pesoAdicionado} ton adicionadas!`);

    console.log('✅ ===== ENRIQUECIMENTO REGISTRADO =====');
  } catch (error) {
    console.error('❌ Erro:', error);
    Alert.alert('Erro', 'Não foi possível salvar');
  }
};
  
  
    // ===== REGISTRAR MONITORAMENTO =====
  const handleRegistrarMonitoramento = async () => {
    console.log('💾 ===== REGISTRANDO MONITORAMENTO =====');

    if (!formData.data.trim()) {
      Alert.alert('Erro', 'Digite a data');
      return;
    }

    let temperaturas: PontoTemperatura[] = [];

    const temTopoTemp = formData.topoTemp.trim() !== '';
    const temMeioTemp = formData.meioTemp.trim() !== '';
    const temFundoTemp = formData.fundoTemp.trim() !== '';

    if (temTopoTemp || temMeioTemp || temFundoTemp) {
      if (!temTopoTemp || !temMeioTemp || !temFundoTemp) {
        Alert.alert('Erro', 'Se informar temperatura, preencha os 3 pontos');
        return;
      }

      const topoTempNum = parseFloat(formData.topoTemp);
      const meioTempNum = parseFloat(formData.meioTemp);
      const fundoTempNum = parseFloat(formData.fundoTemp);

      if (isNaN(topoTempNum) || isNaN(meioTempNum) || isNaN(fundoTempNum)) {
        Alert.alert('Erro', 'Temperaturas devem ser números válidos');
        return;
      }

      if (topoTempNum < 0 || meioTempNum < 0 || fundoTempNum < 0) {
        Alert.alert('Erro', 'Temperaturas não podem ser negativas');
        return;
      }

      if (topoTempNum > 100 || meioTempNum > 100 || fundoTempNum > 100) {
        Alert.alert('Erro', 'Temperaturas não podem ultrapassar 100°C');
        return;
      }

      temperaturas = [
        { ponto: 'topo', temperatura: topoTempNum },
        { ponto: 'meio', temperatura: meioTempNum },
        { ponto: 'fundo', temperatura: fundoTempNum },
      ];
    }

    if (!formData.statusNovo) {
      Alert.alert('Erro', 'Selecione um status');
      return;
    }

    let quebraVolume = 0;
    let percentualQuebra = 0;

    if (formData.statusNovo === 'pronta' && formData.volumeFinal) {
      const volOriginal = parseFloat(formData.volumeOriginal);
      const volFinal = parseFloat(formData.volumeFinal);

      if (!isNaN(volOriginal) && !isNaN(volFinal)) {
        quebraVolume = volOriginal - volFinal;
        percentualQuebra = (quebraVolume / volOriginal) * 100;

        if (quebraVolume < 0) {
          Alert.alert('Erro', 'Volume final não pode ser maior que volume original');
          return;
        }

        if (percentualQuebra > 50) {
          Alert.alert(
            'Aviso',
            `Quebra muito alta: ${percentualQuebra.toFixed(1)}%\n\nDeseja continuar?`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Continuar',
                onPress: () => {
                  salvarMonitoramento();
                },
              },
            ]
          );
          return;
        }
      }
    }

    salvarMonitoramento();

    async function salvarMonitoramento() {
      let diasDesdeFormacao = 0;

      if (formData.statusNovo === 'pronta' && leira) {
        try {
          const [diaForm, mêsForm, anoForm] = leira.dataFormacao.split('/').map(Number);
          const dataFormacao = new Date(anoForm, mêsForm - 1, diaForm);

          const [diaAtual, mêsAtual, anoAtual] = formData.data.split('/').map(Number);
          const dataAtual = new Date(anoAtual, mêsAtual - 1, diaAtual);

          const diferença = dataAtual.getTime() - dataFormacao.getTime();
          diasDesdeFormacao = Math.floor(diferença / (1000 * 60 * 60 * 24));

          console.log(`📅 Dias desde formação: ${diasDesdeFormacao}`);
        } catch (error) {
          console.error('❌ Erro ao calcular dias:', error);
        }
      }

      const novoMonitoramento: MonitoramentoLeira = {
        id: Date.now().toString(),
        leiraId: leiraId as string,
        data: formData.data,
        hora: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        temperaturas: temperaturas,
        revolveu: formData.revolveu,
        observacoes: formData.observacoes,
        statusNovo: formData.statusNovo,
        volumeOriginal: formData.volumeOriginal ? parseFloat(formData.volumeOriginal) : undefined,
        volumeFinal: formData.volumeFinal ? parseFloat(formData.volumeFinal) : undefined,
        quebraVolume: quebraVolume > 0 ? quebraVolume : undefined,
        percentualQuebra: percentualQuebra > 0 ? percentualQuebra : undefined,
        diasDesdeFormacao: diasDesdeFormacao > 0 ? diasDesdeFormacao : undefined,
        timestamp: Date.now(),
      };

      console.log('🌡️ Novo monitoramento criado:', novoMonitoramento);

      try {
        const monitoramentosRegistrados = await AsyncStorage.getItem('leirasMonitoramento');
        const monitoramentosData = monitoramentosRegistrados
          ? JSON.parse(monitoramentosRegistrados)
          : [];

        monitoramentosData.push(novoMonitoramento);

        await AsyncStorage.setItem('leirasMonitoramento', JSON.stringify(monitoramentosData));

        console.log('✅ Monitoramento salvo em AsyncStorage');

        // ===== ADICIONAR À FILA DE SINCRONIZAÇÃO =====
        await syncService.adicionarFila('monitoramento', novoMonitoramento);
        console.log('📤 Monitoramento adicionado à fila de sincronização');

        let leiraAtualizada = leira;

        if (leira && formData.statusNovo !== leira.status) {
          console.log('🔄 Atualizando status da leira...');

          const leirasRegistradas = await AsyncStorage.getItem('leirasFormadas');
          const leirasData = leirasRegistradas ? JSON.parse(leirasRegistradas) : [];

          const leiraIndex = leirasData.findIndex((l: Leira) => l.id === leiraId);

          if (leiraIndex !== -1) {
            leirasData[leiraIndex].status = formData.statusNovo;

            await AsyncStorage.setItem('leirasFormadas', JSON.stringify(leirasData));

            console.log('✅ Status da leira atualizado para:', formData.statusNovo);

            leiraAtualizada = { ...leirasData[leiraIndex] };
            setLeira(leiraAtualizada);

            // ===== SINCRONIZAR LEIRA ATUALIZADA =====
            await syncService.adicionarFila('leira', leiraAtualizada);
            console.log('📤 Leira atualizada adicionada à fila de sincronização');
          }
        }

        const monitoramentosAtualizados = [novoMonitoramento, ...monitoramentos];
        setMonitoramentos(monitoramentosAtualizados);

        if (temperaturas.length > 0) {
          const alertaAtual = verificarAlertaTemperatura(monitoramentosAtualizados);
          setAlerta(alertaAtual);
        } else {
          setAlerta({
            ativo: false,
            dias: 0,
            temperatura: 0,
            mensagem: '',
            tempMedia1: 0,
            tempMedia2: 0,
            data1: '',
            data2: '',
          });
        }

        setFormData({
          data: new Date().toLocaleDateString('pt-BR'),
          topoTemp: '',
          meioTemp: '',
          fundoTemp: '',
          revolveu: false,
          statusNovo: formData.statusNovo,
          observacoes: '',
          volumeOriginal: formData.volumeOriginal,
          volumeFinal: '',
        });

        setShowForm(false);

        Alert.alert(
          'Sucesso! ✅',
          'Monitoramento registrado!\n\nOs dados serão sincronizados com o servidor quando você conectar à internet.'
        );

        console.log('✅ ===== MONITORAMENTO REGISTRADO COM SUCESSO =====');
      } catch (error) {
        console.error('❌ Erro ao salvar monitoramento:', error);
        Alert.alert('Erro', 'Não foi possível registrar o monitoramento');
      }
    }
  };
    

    if (loading) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PALETTE.verdePrimario} />
            <Text style={styles.loadingText}>Carregando detalhes...</Text>
          </View>
        </SafeAreaView>
      );
    }

    if (!leira) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Leira não encontrada</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => router.back()}
            >
              <Text style={styles.errorButtonText}>Voltar</Text>
            </TouchableOpacity>
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
            <Text style={styles.headerTitle}>Detalhes da Leira</Text>
            <View style={styles.backButton} />
          </View>

          {/* ===== ALERTA DE TEMPERATURA ===== */}
          {alerta.ativo && (
            <View style={styles.alertaCard}>
              <View style={styles.alertaHeader}>
                <Text style={styles.alertaIcon}>🔴</Text>
                <View style={styles.alertaHeaderContent}>
                  <Text style={styles.alertaTitle}>ALERTA DE TEMPERATURA ELEVADA</Text>
                  <Text style={styles.alertaSubtitle}>Ação necessária: Realizar revolvimento</Text>
                </View>
              </View>

              <View style={styles.alertaContent}>
                <View style={styles.alertaRow}>
                  <Text style={styles.alertaLabel}>📍 Leira:</Text>
                  <Text style={styles.alertaValue}>#{leira.numeroLeira}</Text>
                </View>

                <View style={styles.alertaRow}>
                  <Text style={styles.alertaLabel}>📦 Lote:</Text>
                  <Text style={styles.alertaValue}>{leira.lote}</Text>
                </View>

                <View style={styles.alertaRow}>
                  <Text style={styles.alertaLabel}>🔄 Status:</Text>
                  <Text style={styles.alertaValue}>{getStatusLabel(leira.status)}</Text>
                </View>

                <View style={styles.alertaDivider} />

                <View style={styles.alertaTemperaturas}>
                  <View style={styles.alertaTempItem}>
                    <Text style={styles.alertaTempLabel}>Dia 1</Text>
                    <Text style={styles.alertaTempData}>{alerta.data2}</Text>
                    <Text style={styles.alertaTempValue}>{alerta.tempMedia2.toFixed(1)}°C</Text>
                  </View>

                  <View style={styles.alertaTempSeparador}>
                    <Text style={styles.alertaTempSeparadorText}>vs</Text>
                  </View>

                  <View style={styles.alertaTempItem}>
                    <Text style={styles.alertaTempLabel}>Dia 2</Text>
                    <Text style={styles.alertaTempData}>{alerta.data1}</Text>
                    <Text style={styles.alertaTempValue}>{alerta.tempMedia1.toFixed(1)}°C</Text>
                  </View>
                </View>

                <Text style={styles.alertaFooter}>
                  ⚠️ Ambas as medições ultrapassaram 65°C
                </Text>
              </View>
            </View>
          )}

          {/* ===== INFO DA LEIRA ===== */}
          <View style={styles.leiraInfoBox}>
            <View style={styles.leiraInfoLeft}>
              <Text style={styles.leiraInfoNumber}>Leira #{leira.numeroLeira}</Text>
              <Text style={styles.leiraInfoLote}>Lote {leira.lote}</Text>
              <Text style={styles.leiraInfoData}>{leira.dataFormacao}</Text>
              <Text style={styles.leiraInfoDias}>
                {getDiasPassados(leira.dataFormacao)} dia(s) atrás
              </Text>
            </View>

            <View
              style={[
                styles.leiraInfoStatus,
                { backgroundColor: getStatusColor(leira.status) },
              ]}
            >
              <Text style={styles.leiraInfoStatusText}>
                {getStatusLabel(leira.status)}
              </Text>
            </View>
          </View>

          {/* ===== DADOS DA LEIRA ===== */}
          <View style={styles.dadosBox}>
            <Text style={styles.dadosTitle}>📦 Dados da Leira</Text>

            <View style={styles.dadosGrid}>
              <DadoItem label="Biossólido" value={`${leira.totalBiossólido.toFixed(1)} ton`} />
              <DadoItem label="Bagaço" value="12 ton" />
              <DadoItem
                label="Total"
                value={`${(leira.totalBiossólido + 12).toFixed(1)} ton`}
              />
              <DadoItem label="Monitoramentos" value={monitoramentos.length.toString()} />
            </View>

            {leira.biossólidos && leira.biossólidos.length > 0 && (
              <View style={styles.biossólidosList}>
                <Text style={styles.biossólidosTitle}>Biossólidos Utilizados:</Text>
                {leira.biossólidos.map((bio, index) => (
                  <View key={bio.id} style={styles.biossólidoItem}>
                    <Text style={styles.biossólidoNumber}>{index + 1}.</Text>
                    <View style={styles.biossólidoInfo}>
                      <Text style={styles.biossólidoMTR}>{bio.numeroMTR}</Text>
                      <Text style={styles.biossólidoOrigemData}>
                        {bio.origem} • {bio.data}
                      </Text>
                      <Text style={styles.biossólidoPeso}>{bio.peso} ton</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <ClimaDaLeira
            leiraId={leiraId as string}
            onDataLoaded={(registros) =>
              console.log(`📊 ${registros.length} registros climáticos carregados`)
            }
          />

          {/* ===== FORM DE MONITORAMENTO ===== */}
          {showForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>📝 Registrar Monitoramento</Text>

              {/* DATA */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Data</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>📅</Text>
                  <RNTextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY"
                    value={formData.data}
                    onChangeText={(text) => {
                      const formatted = formatarData(text);
                      setFormData({ ...formData, data: formatted });
                    }}
                    maxLength={10}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* TEMPERATURAS - OPCIONAL */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>🌡️ Temperaturas (°C) - Opcional</Text>

                <View style={styles.temperaturasGrid}>
                  <View style={styles.tempItem}>
                    <Text style={styles.tempLabel}>Topo</Text>
                    <View style={styles.inputBox}>
                      <RNTextInput
                        style={styles.input}
                        placeholder="Ex: 65"
                        value={formData.topoTemp}
                        onChangeText={(text) =>
                          setFormData({ ...formData, topoTemp: text })
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.tempItem}>
                    <Text style={styles.tempLabel}>Meio</Text>
                    <View style={styles.inputBox}>
                      <RNTextInput
                        style={styles.input}
                        placeholder="Ex: 70"
                        value={formData.meioTemp}
                        onChangeText={(text) =>
                          setFormData({ ...formData, meioTemp: text })
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.tempItem}>
                    <Text style={styles.tempLabel}>Fundo</Text>
                    <View style={styles.inputBox}>
                      <RNTextInput
                        style={styles.input}
                        placeholder="Ex: 60"
                        value={formData.fundoTemp}
                        onChangeText={(text) =>
                          setFormData({ ...formData, fundoTemp: text })
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>

                <Text style={styles.tempHint}>
                  💡 Se informar temperatura, todos os 3 pontos devem ser preenchidos
                </Text>
              </View>

              {/* REVOLVIMENTO */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>♻️ Revolvimento</Text>
                <View style={styles.revolvimentoOptions}>
                  {[true, false].map((value) => (
                    <TouchableOpacity
                      key={value ? 'sim' : 'não'}
                      style={[
                        styles.revolvimentoBtn,
                        formData.revolveu === value && styles.revolvimentoBtnActive,
                      ]}
                      onPress={() => setFormData({ ...formData, revolveu: value })}
                    >
                      <Text
                        style={[
                          styles.revolvimentoBtnText,
                          formData.revolveu === value && styles.revolvimentoBtnTextActive,
                        ]}
                      >
                        {value ? '✅ Sim' : '❌ Não'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* STATUS */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>📊 Status</Text>
                <View style={styles.statusOptions}>
                  {['formada', 'secando', 'compostando', 'maturando', 'pronta'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusBtn,
                        formData.statusNovo === status && styles.statusBtnActive,
                        { borderTopColor: getStatusColor(status) },
                      ]}
                      onPress={() => setFormData({ ...formData, statusNovo: status })}
                    >
                      <Text
                        style={[
                          styles.statusBtnText,
                          formData.statusNovo === status && styles.statusBtnTextActive,
                        ]}
                      >
                        {status === 'formada'
                          ? '📦 Formada'
                          : status === 'secando'
                            ? '💨 Secagem'
                            : status === 'compostando'
                              ? '🔄 Compostagem'
                              : status === 'maturando'
                                ? '🌱 Maturação'
                                : '✅ Venda'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* QUEBRA DE VOLUME */}
              {formData.statusNovo === 'pronta' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>📉 Quebra de Volume (Opcional)</Text>
                  <Text style={styles.quebrasSubtitle}>
                    Registre a perda de volume durante o processo
                  </Text>

                  <View style={styles.quebraOptions}>
                    <View style={styles.quebraItem}>
                      <Text style={styles.quebraItemLabel}>Volume Original</Text>
                      <View style={styles.inputBox}>
                        <RNTextInput
                          style={styles.input}
                          placeholder="Ex: 24"
                          value={formData.volumeOriginal}
                          onChangeText={(text) =>
                            setFormData({ ...formData, volumeOriginal: text })
                          }
                          keyboardType="decimal-pad"
                          editable={false}
                        />
                        <Text style={styles.inputSuffix}>ton</Text>
                      </View>
                    </View>

                    <View style={styles.quebraItem}>
                      <Text style={styles.quebraItemLabel}>Volume Final</Text>
                      <View style={styles.inputBox}>
                        <RNTextInput
                          style={styles.input}
                          placeholder="Ex: 18"
                          value={formData.volumeFinal}
                          onChangeText={(text) =>
                            setFormData({ ...formData, volumeFinal: text })
                          }
                          keyboardType="decimal-pad"
                        />
                        <Text style={styles.inputSuffix}>ton</Text>
                      </View>
                    </View>
                  </View>

                  {formData.volumeOriginal && formData.volumeFinal && (
                    <View style={styles.quebraResultado}>
                      <Text style={styles.quebraResultadoLabel}>Quebra Calculada:</Text>
                      <Text style={styles.quebraResultadoValue}>
                        {(
                          parseFloat(formData.volumeOriginal) - parseFloat(formData.volumeFinal)
                        ).toFixed(2)}{' '}
                        ton
                      </Text>
                      <Text style={styles.quebraResultadoPercentual}>
                        (
                        {(
                          ((parseFloat(formData.volumeOriginal) -
                            parseFloat(formData.volumeFinal)) /
                            parseFloat(formData.volumeOriginal)) *
                          100
                        ).toFixed(1)}
                        % de perda)
                      </Text>
                    </View>
                  )}

                  <Text style={styles.quebraHint}>
                    💡 A quebra é calculada automaticamente
                  </Text>
                </View>
              )}

              {/* OBSERVAÇÕES */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>📝 Observações (Opcional)</Text>
                <View style={styles.textareaBox}>
                  <RNTextInput
                    style={styles.textarea}
                    placeholder="Digite suas observações aqui..."
                    value={formData.observacoes}
                    onChangeText={(text) =>
                      setFormData({ ...formData, observacoes: text })
                    }
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>

              {/* BOTÕES */}
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowForm(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleRegistrarMonitoramento}
                >
                  <Text style={styles.submitBtnText}>Registrar Monitoramento</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowForm(true)}
            >
              <Text style={styles.addBtnIcon}>+</Text>
              <Text style={styles.addBtnText}>Registrar Monitoramento</Text>
            </TouchableOpacity>
          )}

          {/* ===== FORM DE ENRIQUECIMENTO ===== */}
          {showEnriquecimentoForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>💪 Enriquecer Leira</Text>

              {/* INFO ATUAL */}
              <View style={styles.enriquecimentoInfo}>
                <View>
                  <Text style={styles.enriquecimentoInfoLabel}>Total Atual</Text>
                  <Text style={styles.enriquecimentoInfoValue}>
                    {calcularTotalComEnriquecimentos(leira).toFixed(2)} ton
                  </Text>
                </View>
              </View>

              {/* DATA */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>📅 Data</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>📅</Text>
                  <RNTextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY"
                    value={enriquecimentoData.data}
                    onChangeText={(text) => {
                      const formatted = formatarData(text);
                      setEnriquecimentoData({ ...enriquecimentoData, data: formatted });
                    }}
                    maxLength={10}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* PESO ADICIONADO */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>⚖️ Peso Adicionado (toneladas)</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>⚖️</Text>
                  <RNTextInput
                    style={styles.input}
                    placeholder="Ex: 15"
                    value={enriquecimentoData.pesoAdicionado}
                    onChangeText={(text) =>
                      setEnriquecimentoData({ ...enriquecimentoData, pesoAdicionado: text })
                    }
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.inputSuffix}>ton</Text>
                </View>
              </View>

              {/* MTR */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>🔢 Número MTR (Opcional)</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>🔢</Text>
                  <RNTextInput
                    style={styles.input}
                    placeholder="Ex: MTR-2025-0001"
                    value={enriquecimentoData.numeroMTR}
                    onChangeText={(text) =>
                      setEnriquecimentoData({ ...enriquecimentoData, numeroMTR: text })
                    }
                  />
                </View>
              </View>

              {/* ORIGEM */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>📍 Origem (Opcional)</Text>
                <View style={styles.origemOptions}>
                  {['Sabesp', 'Ambient', 'Outro'].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.origemBtn,
                        enriquecimentoData.origem === opt && styles.origemBtnActive,
                      ]}
                      onPress={() =>
                        setEnriquecimentoData({ ...enriquecimentoData, origem: opt })
                      }
                    >
                      <Text
                        style={[
                          styles.origemBtnText,
                          enriquecimentoData.origem === opt && styles.origemBtnTextActive,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* OBSERVAÇÕES */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>📝 Observações (Opcional)</Text>
                <View style={styles.textareaBox}>
                  <RNTextInput
                    style={styles.textarea}
                    placeholder="Motivo do enriquecimento..."
                    value={enriquecimentoData.observacoes}
                    onChangeText={(text) =>
                      setEnriquecimentoData({ ...enriquecimentoData, observacoes: text })
                    }
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              {/* PREVIEW */}
              {enriquecimentoData.pesoAdicionado && (
                <View style={styles.enriquecimentoPreview}>
                  <View style={styles.enriquecimentoPreviewItem}>
                    <Text style={styles.enriquecimentoPreviewLabel}>Atual</Text>
                    <Text style={styles.enriquecimentoPreviewValue}>
                      {calcularTotalComEnriquecimentos(leira).toFixed(2)} ton
                    </Text>
                  </View>

                  <Text style={styles.enriquecimentoPreviewSeta}>+</Text>

                  <View style={styles.enriquecimentoPreviewItem}>
                    <Text style={styles.enriquecimentoPreviewLabel}>Adicionado</Text>
                    <Text style={styles.enriquecimentoPreviewValue}>
                      {parseFloat(enriquecimentoData.pesoAdicionado || '0').toFixed(2)} ton
                    </Text>
                  </View>

                  <Text style={styles.enriquecimentoPreviewSeta}>=</Text>

                  <View style={styles.enriquecimentoPreviewItem}>
                    <Text style={styles.enriquecimentoPreviewLabel}>Novo</Text>
                    <Text style={styles.enriquecimentoPreviewValueNew}>
                      {(
                        calcularTotalComEnriquecimentos(leira) +
                        parseFloat(enriquecimentoData.pesoAdicionado || '0')
                      ).toFixed(2)}{' '}
                      ton
                    </Text>
                  </View>
                </View>
              )}

              {/* BOTÕES */}
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowEnriquecimentoForm(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleRegistrarEnriquecimento}
                >
                  <Text style={styles.submitBtnText}>Registrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.enriquecimentoBtn}
              onPress={() => setShowEnriquecimentoForm(true)}
            >
              <Text style={styles.addBtnIcon}>💪</Text>
              <Text style={styles.addBtnText}>Enriquecer Leira</Text>
            </TouchableOpacity>
          )}

          {/* ===== HISTÓRICO DE ENRIQUECIMENTOS ===== */}
          {enriquecimentos.length > 0 && (
            <View style={styles.historicoSection}>
              <Text style={styles.historicoTitle}>💪 Histórico de Enriquecimentos</Text>

              <FlatList
                data={getEnriquecimentosOrdenados(enriquecimentos)}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <EnriquecimentoCard enriquecimento={item} />
                )}
              />
            </View>
          )}

          {/* ===== HISTÓRICO DE MONITORAMENTOS ===== */}
          <View style={styles.historicoSection}>
            <Text style={styles.historicoTitle}>📋 Histórico de Monitoramentos</Text>

            {monitoramentos.length > 0 ? (
              <FlatList
                data={monitoramentos}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <MonitoramentoCard monitoramento={item} leira={leira} />
                )}
              />
            ) : (
              <View style={styles.emptyHistorico}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>Nenhum monitoramento registrado</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===== COMPONENTE: ENRIQUECIMENTO CARD =====
  function EnriquecimentoCard({
    enriquecimento,
  }: {
    enriquecimento: EnriquecimentoLeira;
  }) {
    return (
      <View style={styles.enriquecimentoCard}>
        <View style={styles.enriquecimentoCardHeader}>
          <View>
            <Text style={styles.enriquecimentoCardData}>
              {enriquecimento.dataEnriquecimento}
            </Text>
            {enriquecimento.horaEnriquecimento && (
              <Text style={styles.enriquecimentoCardHora}>
                {enriquecimento.horaEnriquecimento}
              </Text>
            )}
          </View>

          <View style={styles.enriquecimentoCardBadge}>
            <Text style={styles.enriquecimentoCardBadgeIcon}>💪</Text>
            <Text style={styles.enriquecimentoCardBadgeText}>
              +{enriquecimento.pesoAdicionado.toFixed(2)} ton
            </Text>
          </View>
        </View>

        <View style={styles.enriquecimentoCardContent}>
          <View style={styles.enriquecimentoCardRow}>
            <Text style={styles.enriquecimentoCardLabel}>Antes:</Text>
            <Text style={styles.enriquecimentoCardValue}>
              {enriquecimento.pesoAnterior.toFixed(2)} ton
            </Text>
          </View>

          <View style={styles.enriquecimentoCardArrow}>
            <Text style={styles.enriquecimentoCardArrowText}>↓</Text>
          </View>

          <View style={styles.enriquecimentoCardRow}>
            <Text style={styles.enriquecimentoCardLabel}>Depois:</Text>
            <Text style={styles.enriquecimentoCardValueNovo}>
              {enriquecimento.pesoNovo.toFixed(2)} ton
            </Text>
          </View>
        </View>

        {(enriquecimento.numeroMTR || enriquecimento.origem) && (
          <View style={styles.enriquecimentoCardInfo}>
            {enriquecimento.numeroMTR && (
              <Text style={styles.enriquecimentoCardInfoText}>
                🔢 MTR: {enriquecimento.numeroMTR}
              </Text>
            )}
            {enriquecimento.origem && (
              <Text style={styles.enriquecimentoCardInfoText}>
                📍 Origem: {enriquecimento.origem}
              </Text>
            )}
          </View>
        )}

        {enriquecimento.observacoes && (
          <View style={styles.enriquecimentoCardObservacoes}>
            <Text style={styles.enriquecimentoCardObservacoesLabel}>
              Observações:
            </Text>
            <Text style={styles.enriquecimentoCardObservacoesText}>
              {enriquecimento.observacoes}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // ===== COMPONENTE: DADO ITEM =====
  function DadoItem({ label, value }: { label: string; value: string }) {
    return (
      <View style={styles.dadoItem}>
        <Text style={styles.dadoLabel}>{label}</Text>
        <Text style={styles.dadoValue}>{value}</Text>
      </View>
    );
  }

  // ===== COMPONENTE: MONITORAMENTO CARD =====
  function MonitoramentoCard({
    monitoramento,
    leira,
  }: {
    monitoramento: MonitoramentoLeira;
    leira: Leira;
  }) {
    let tempMedia = 0;
    if (monitoramento.temperaturas.length > 0) {
      tempMedia =
        (monitoramento.temperaturas[0].temperatura +
          monitoramento.temperaturas[1].temperatura +
          monitoramento.temperaturas[2].temperatura) /
        3;
    }

    return (
      <View style={styles.monitoramentoCard}>
        <View style={styles.monitoramentoHeader}>
          <View>
            <Text style={styles.monitoramentoData}>{monitoramento.data}</Text>
            {monitoramento.hora && (
              <Text style={styles.monitoramentoHora}>{monitoramento.hora}</Text>
            )}
          </View>

          {monitoramento.statusNovo && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{monitoramento.statusNovo}</Text>
            </View>
          )}
        </View>

        {monitoramento.temperaturas.length > 0 && (
          <View style={styles.monitoramentoTemperaturas}>
            <TempItem
              label="Topo"
              temp={monitoramento.temperaturas[0].temperatura}
            />
            <TempItem
              label="Meio"
              temp={monitoramento.temperaturas[1].temperatura}
            />
            <TempItem
              label="Fundo"
              temp={monitoramento.temperaturas[2].temperatura}
            />
            <View style={styles.tempMedia}>
              <Text style={styles.tempMediaLabel}>Média</Text>
              <Text style={styles.tempMediaValue}>{tempMedia.toFixed(1)}°C</Text>
            </View>
          </View>
        )}

        <ClimaDoMonitoramento
          leiraId={leira.id}
          dataMonitoramento={monitoramento.data}
        />

        {monitoramento.temperaturas.length === 0 && (
          <View style={styles.semTempBadge}>
            <Text style={styles.semTempText}>ℹ️ Sem registro de temperatura</Text>
          </View>
        )}

        {monitoramento.revolveu && (
          <View style={styles.revolvimentoBadge}>
            <Text style={styles.revolvimentoBadgeIcon}>♻️</Text>
            <Text style={styles.revolvimentoBadgeText}>Revolvimento realizado</Text>
          </View>
        )}

        {monitoramento.quebraVolume !== undefined && (
          <View style={styles.quebraCard}>
            <Text style={styles.quebraCardTitle}>📉 Quebra de Volume</Text>

            <View style={styles.quebraCardContent}>
              <View style={styles.quebraCardItem}>
                <Text style={styles.quebraCardLabel}>Original</Text>
                <Text style={styles.quebraCardValue}>
                  {monitoramento.volumeOriginal?.toFixed(2)} ton
                </Text>
              </View>

              <Text style={styles.quebraCardSeta}>→</Text>

              <View style={styles.quebraCardItem}>
                <Text style={styles.quebraCardLabel}>Final</Text>
                <Text style={styles.quebraCardValue}>
                  {monitoramento.volumeFinal?.toFixed(2)} ton
                </Text>
              </View>
            </View>

            <View style={styles.quebraCardResult}>
              <Text style={styles.quebraCardResultLabel}>Perda:</Text>
              <Text style={styles.quebraCardResultValue}>
                {monitoramento.quebraVolume?.toFixed(2)} ton
              </Text>
              <Text style={styles.quebraCardResultPercentual}>
                ({monitoramento.percentualQuebra?.toFixed(1)}%)
              </Text>
            </View>
          </View>
        )}

        {monitoramento.statusNovo === 'pronta' && monitoramento.diasDesdeFormacao !== undefined && (
          <View style={styles.diasCard}>
            <View style={styles.diasCardHeader}>
              <Text style={styles.diasCardIcon}>📅</Text>
              <View style={styles.diasCardContent}>
                <Text style={styles.diasCardLabel}>Tempo de Compostagem</Text>
                <Text style={styles.diasCardValue}>{monitoramento.diasDesdeFormacao} dias</Text>
              </View>
            </View>

            <View style={styles.diasCardTimeline}>
              <View style={styles.diasCardTimelineItem}>
                <Text style={styles.diasCardTimelineIcon}>📦</Text>
                <Text style={styles.diasCardTimelineText}>Formação</Text>
              </View>

              <View style={styles.diasCardTimelineArrow}>
                <Text style={styles.diasCardTimelineArrowText}>→</Text>
              </View>

              <View style={styles.diasCardTimelineItem}>
                <Text style={styles.diasCardTimelineIcon}>✅</Text>
                <Text style={styles.diasCardTimelineText}>Venda</Text>
              </View>
            </View>

            <View style={styles.diasCardStats}>
              <View style={styles.diasCardStat}>
                <Text style={styles.diasCardStatLabel}>Semanas</Text>
                <Text style={styles.diasCardStatValue}>
                  {(monitoramento.diasDesdeFormacao / 7).toFixed(1)}
                </Text>
              </View>

              <View style={styles.diasCardStatDivider} />

              <View style={styles.diasCardStat}>
                <Text style={styles.diasCardStatLabel}>Meses</Text>
                <Text style={styles.diasCardStatValue}>
                  {(monitoramento.diasDesdeFormacao / 30).toFixed(1)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {monitoramento.observacoes && (
          <View style={styles.observacoesBox}>
            <Text style={styles.observacoesLabel}>Observações:</Text>
            <Text style={styles.observacoesText}>{monitoramento.observacoes}</Text>
          </View>
        )}
      </View>
    );
  }

  // ===== COMPONENTE: TEMP ITEM =====
  function TempItem({ label, temp }: { label: string; temp: number }) {
    return (
      <View style={styles.tempItemBox}>
        <Text style={styles.tempItemLabel}>{label}</Text>
        <Text
          style={[
            styles.tempItemValue,
            temp > 65 && styles.tempItemValueAlta,
          ]}
        >
          {temp}°C
        </Text>
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
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    errorText: {
      fontSize: 16,
      fontWeight: '700',
      color: PALETTE.preto,
      marginBottom: 16,
    },
    errorButton: {
      backgroundColor: PALETTE.verdePrimario,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    errorButtonText: {
      color: PALETTE.branco,
      fontWeight: '700',
      fontSize: 14,
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
    alertaCard: {
      backgroundColor: '#FFEBEE',
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 16,
      borderRadius: 14,
      borderLeftWidth: 4,
      borderLeftColor: PALETTE.erro,
      overflow: 'hidden',
    },
    alertaHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#FFCDD2',
    },
    alertaIcon: {
      fontSize: 28,
      marginRight: 12,
    },
    alertaHeaderContent: {
      flex: 1,
    },
    alertaTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: PALETTE.erro,
    },
    alertaSubtitle: {
      fontSize: 11,
      color: PALETTE.erro,
      marginTop: 2,
      fontWeight: '600',
    },
    alertaContent: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    alertaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    alertaLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: PALETTE.preto,
    },
    alertaValue: {
      fontSize: 12,
      fontWeight: '700',
      color: PALETTE.erro,
    },
    alertaDivider: {
      height: 1,
      backgroundColor: '#EF9A9A',
      marginVertical: 12,
    },
    alertaTemperaturas: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    alertaTempItem: {
      flex: 1,
      backgroundColor: PALETTE.branco,
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: PALETTE.erro,
    },
    alertaTempLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: PALETTE.cinza,
      marginBottom: 4,
    },
    alertaTempData: {
      fontSize: 10,
      color: PALETTE.cinza,
      marginBottom: 4,
    },
    alertaTempValue: {
      fontSize: 16,
      fontWeight: '800',
      color: PALETTE.erro,
    },
    alertaTempSeparador: {
      marginHorizontal: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    alertaTempSeparadorText: {
      fontSize: 14,
      fontWeight: '700',
      color: PALETTE.erro,
    },
    alertaFooter: {
      fontSize: 11,
      fontWeight: '600',
      color: PALETTE.erro,
      textAlign: 'center',
    },
    leiraInfoBox: {
      flexDirection: 'row',
      backgroundColor: PALETTE.branco,
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'space-between',
      borderLeftWidth: 4,
      borderLeftColor: PALETTE.verdePrimario,
    },
    leiraInfoLeft: {
      flex: 1,
    },
    leiraInfoNumber: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.preto,
    },
    leiraInfoLote: {
      fontSize: 12,
      color: PALETTE.cinza,
      fontWeight: '600',
      marginTop: 4,
    },
    leiraInfoData: {
      fontSize: 12,
      color: PALETTE.cinza,
      marginTop: 2,
    },
    leiraInfoDias: {
      fontSize: 11,
      color: PALETTE.cinza,
      fontStyle: 'italic',
      marginTop: 2,
    },
    leiraInfoStatus: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    leiraInfoStatusText: {
      fontSize: 11,
      fontWeight: '700',
      color: PALETTE.branco,
    },
    dadosBox: {
      backgroundColor: PALETTE.branco,
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 14,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: PALETTE.terracota,
    },
    dadosTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: PALETTE.preto,
      marginBottom: 12,
    },
    dadosGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    dadoItem: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: PALETTE.verdeClaro2,
      padding: 10,
      borderRadius: 10,
    },
    dadoLabel: {
      fontSize: 10,
      color: PALETTE.cinza,
      fontWeight: '600',
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    dadoValue: {
      fontSize: 14,
      fontWeight: '700',
      color: PALETTE.verdePrimario,
    },
    biossólidosList: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: PALETTE.cinzaClaro2,
    },
    biossólidosTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: PALETTE.preto,
      marginBottom: 10,
    },
    biossólidoItem: {
      flexDirection: 'row',
      marginBottom: 10,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: PALETTE.cinzaClaro2,
    },
    biossólidoNumber: {
      fontSize: 12,
      fontWeight: '700',
      color: PALETTE.verdePrimario,
      marginRight: 8,
    },
    biossólidoInfo: {
      flex: 1,
    },
    biossólidoMTR: {
      fontSize: 12,
      fontWeight: '700',
      color: PALETTE.preto,
    },
    biossólidoOrigemData: {
      fontSize: 11,
      color: PALETTE.cinza,
      marginTop: 2,
    },
    biossólidoPeso: {
      fontSize: 11,
      fontWeight: '600',
      color: PALETTE.verdePrimario,
      marginTop: 2,
    },
    formCard: {
      backgroundColor: PALETTE.branco,
      marginHorizontal: 20,
      marginBottom: 20,
      borderRadius: 16,
      padding: 20,
      borderTopWidth: 3,
      borderTopColor: PALETTE.verdePrimario,
    },
    formTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: PALETTE.preto,
      marginBottom: 16,
    },
    formGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: PALETTE.verdePrimario,
      marginBottom: 10,
      textTransform: 'uppercase',
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: PALETTE.cinzaClaro2,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: PALETTE.verdePrimario,
    },
    inputIcon: {
      fontSize: 16,
      marginRight: 8,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: PALETTE.preto,
      fontWeight: '600',
    },
    inputSuffix: {
      fontSize: 12,
      fontWeight: '600',
      color: PALETTE.verdePrimario,
      marginLeft: 4,
    },
    temperaturasGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 8,
    },
    tempItem: {
      flex: 1,
    },
    tempLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: PALETTE.cinza,
      marginBottom: 8,
    },
    tempHint: {
      fontSize: 10,
      color: PALETTE.cinza,
      fontStyle: 'italic',
      marginTop: 8,
      paddingHorizontal: 4,
    },
    revolvimentoOptions: {
      flexDirection: 'row',
      gap: 10,
    },
    revolvimentoBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: PALETTE.cinzaClaro2,
      borderWidth: 1.5,
      borderColor: PALETTE.cinzaClaro2,
      alignItems: 'center',
    },
    revolvimentoBtnActive: {
      backgroundColor: PALETTE.verdeClaro2,
      borderColor: PALETTE.verdePrimario,
    },
    revolvimentoBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: PALETTE.cinza,
    },
    revolvimentoBtnTextActive: {
      color: PALETTE.verdePrimario,
    },
    statusOptions: {
      gap: 8,
    },
    statusBtn: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: PALETTE.cinzaClaro2,
      borderTopWidth: 3,
      borderTopColor: PALETTE.cinza,
      alignItems: 'center',
    },
    statusBtnActive: {
      backgroundColor: PALETTE.verdeClaro2,
    },
    statusBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: PALETTE.cinza,
    },
    statusBtnTextActive: {
      color: PALETTE.verdePrimario,
    },
    quebrasSubtitle: {
      fontSize: 11,
      color: PALETTE.cinza,
      marginBottom: 10,
      fontStyle: 'italic',
    },
    quebraOptions: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    quebraItem: {
      flex: 1,
    },
    quebraItemLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: PALETTE.cinza,
      marginBottom: 8,
    },
    quebraResultado: {
      backgroundColor: PALETTE.verdeClaro2,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
      borderLeftWidth: 3,
      borderLeftColor: PALETTE.verdePrimario,
    },
    quebraResultadoLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: PALETTE.cinza,
      marginBottom: 4,
    },
    quebraResultadoValue: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.verdePrimario,
      marginBottom: 2,
    },
    quebraResultadoPercentual: {
      fontSize: 11,
      fontWeight: '600',
      color: PALETTE.cinza,
      fontStyle: 'italic',
    },
    quebraHint: {
      fontSize: 10,
      color: PALETTE.cinza,
      fontStyle: 'italic',
      marginTop: 8,
      paddingHorizontal: 4,
    },
    textareaBox: {
      backgroundColor: PALETTE.cinzaClaro2,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: PALETTE.verdePrimario,
    },
    textarea: {
      fontSize: 14,
      color: PALETTE.preto,
      fontWeight: '500',
      textAlignVertical: 'top',
    },
    buttonGroup: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: PALETTE.cinzaClaro2,
      alignItems: 'center',
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: PALETTE.cinza,
    },
    submitBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: PALETTE.verdePrimario,
      alignItems: 'center',
    },
    submitBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: PALETTE.branco,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 20,
      marginBottom: 20,
      backgroundColor: PALETTE.verdePrimario,
      borderRadius: 12,
      paddingVertical: 14,
      gap: 8,
    },
    addBtnIcon: {
      fontSize: 24,
      fontWeight: '700',
      color: PALETTE.branco,
    },
    addBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: PALETTE.branco,
    },
    enriquecimentoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 20,
      marginBottom: 20,
      backgroundColor: '#D4AF37',
      borderRadius: 12,
      paddingVertical: 14,
      gap: 8,
    },
    enriquecimentoInfo: {
      backgroundColor: PALETTE.verdeClaro2,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    enriquecimentoInfoLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: PALETTE.cinza,
      textTransform: 'uppercase',
    },
    enriquecimentoInfoValue: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.verdePrimario,
      marginTop: 4,
    },
    origemOptions: {
      flexDirection: 'row',
      gap: 8,
    },
    origemBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: PALETTE.cinzaClaro2,
      borderWidth: 1.5,
      borderColor: PALETTE.cinzaClaro2,
      alignItems: 'center',
    },
    origemBtnActive: {
      backgroundColor: PALETTE.verdeClaro2,
      borderColor: PALETTE.verdePrimario,
    },
    origemBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: PALETTE.cinza,
    },
    origemBtnTextActive: {
      color: PALETTE.verdePrimario,
      fontWeight: '700',
    },
    enriquecimentoPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FFF3E0',
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: '#FF9800',
    },
    enriquecimentoPreviewItem: {
      flex: 1,
      alignItems: 'center',
    },
    enriquecimentoPreviewLabel: {
      fontSize: 10,
      color: PALETTE.cinza,
      fontWeight: '600',
      marginBottom: 4,
    },
    enriquecimentoPreviewValue: {
      fontSize: 12,
      fontWeight: '700',
      color: PALETTE.preto,
    },
    enriquecimentoPreviewValueNew: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FF9800',
    },
    enriquecimentoPreviewSeta: {
      fontSize: 16,
      fontWeight: '700',
      color: PALETTE.preto,
      marginHorizontal: 4,
    },
    historicoSection: {
      paddingHorizontal: 20,
    },
    historicoTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: PALETTE.preto,
      marginBottom: 12,
    },
    emptyHistorico: {
      alignItems: 'center',
      paddingVertical: 30,
    },
    emptyIcon: {
      fontSize: 40,
      marginBottom: 10,
    },
    emptyText: {
      fontSize: 14,
      fontWeight: '700',
      color: PALETTE.preto,
    },
    enriquecimentoCard: {
      backgroundColor: PALETTE.branco,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#D4AF37',
    },
    enriquecimentoCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: PALETTE.cinzaClaro2,
    },
    enriquecimentoCardData: {
      fontSize: 13,
      fontWeight: '700',
      color: PALETTE.preto,
    },
    enriquecimentoCardHora: {
      fontSize: 11,
      color: PALETTE.cinza,
      marginTop: 2,
    },
    enriquecimentoCardBadge: {
      backgroundColor: '#FFF9E6',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    enriquecimentoCardBadgeIcon: {
      fontSize: 14,
    },
    enriquecimentoCardBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#D4AF37',
    },
    enriquecimentoCardContent: {
      backgroundColor: PALETTE.verdeClaro2,
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
    },
    enriquecimentoCardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    enriquecimentoCardLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: PALETTE.cinza,
    },
    enriquecimentoCardValue: {
      fontSize: 12,
      fontWeight: '700',
      color: PALETTE.verdePrimario,
    },
    enriquecimentoCardValueNovo: {
      fontSize: 14,
      fontWeight: '800',
      color: PALETTE.verdePrimario,
    },
    enriquecimentoCardArrow: {
      alignItems: 'center',
      marginVertical: 6,
    },
    enriquecimentoCardArrowText: {
      fontSize: 14,
      fontWeight: '700',
      color: PALETTE.verdePrimario,
    },
    enriquecimentoCardInfo: {
      backgroundColor: '#E3F2FD',
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
    },
    enriquecimentoCardInfoText: {
      fontSize: 11,
      color: '#1976D2',
      fontWeight: '600',
      marginBottom: 4,
    },
    enriquecimentoCardObservacoes: {
      backgroundColor: PALETTE.verdeClaro2,
      borderRadius: 8,
      padding: 10,
    },
    enriquecimentoCardObservacoesLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: PALETTE.verdePrimario,
      marginBottom: 6,
    },
    enriquecimentoCardObservacoesText: {
      fontSize: 12,
      color: PALETTE.preto,
      fontWeight: '500',
      lineHeight: 18,
    },
    monitoramentoCard: {
      backgroundColor: PALETTE.branco,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: PALETTE.verdePrimario,
    },
    monitoramentoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: PALETTE.cinzaClaro2,
    },
    monitoramentoData: {
      fontSize: 13,
      fontWeight: '700',
      color: PALETTE.preto,
    },
    monitoramentoHora: {
      fontSize: 11,
      color: PALETTE.cinza,
      marginTop: 2,
    },
    statusBadge: {
      backgroundColor: PALETTE.verdeClaro2,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: PALETTE.verdePrimario,
      textTransform: 'capitalize',
    },
    monitoramentoTemperaturas: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    tempItemBox: {
      flex: 1,
      backgroundColor: PALETTE.verdeClaro2,
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    tempItemLabel: {
      fontSize: 10,
      color: PALETTE.cinza,
      fontWeight: '600',
      marginBottom: 4,
    },
    tempItemValue: {
      fontSize: 14,
      fontWeight: '700',
      color: PALETTE.verdePrimario,
    },
    tempItemValueAlta: {
      color: PALETTE.erro,
    },
    tempMedia: {
      flex: 1,
      backgroundColor: PALETTE.terracota,
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    tempMediaLabel: {
      fontSize: 10,
      color: PALETTE.branco,
      fontWeight: '600',
      marginBottom: 4,
    },
    tempMediaValue: {
      fontSize: 14,
      fontWeight: '700',
      color: PALETTE.branco,
    },
    semTempBadge: {
      backgroundColor: '#E3F2FD',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12,
      alignItems: 'center',
    },
    semTempText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#1976D2',
    },
    revolvimentoBadge: {
      flexDirection: 'row',
      backgroundColor: '#E8F5E9',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: 'center',
      marginBottom: 12,
    },
    revolvimentoBadgeIcon: {
      fontSize: 16,
      marginRight: 8,
    },
    revolvimentoBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: PALETTE.sucesso,
    },
    quebraCard: {
      backgroundColor: '#FFF3E0',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderLeftWidth: 3,
      borderLeftColor: PALETTE.warning,
    },
    quebraCardTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: PALETTE.preto,
      marginBottom: 10,
    },
    quebraCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    quebraCardItem: {
      flex: 1,
      alignItems: 'center',
    },
    quebraCardLabel: {
      fontSize: 10,
      color: PALETTE.cinza,
      fontWeight: '600',
      marginBottom: 4,
    },
    quebraCardValue: {
      fontSize: 14,
      fontWeight: '700',
      color: PALETTE.preto,
    },
    quebraCardSeta: {
      fontSize: 16,
      fontWeight: '700',
      color: PALETTE.warning,
      marginHorizontal: 8,
    },
    quebraCardResult: {
      backgroundColor: PALETTE.branco,
      borderRadius: 6,
      padding: 8,
      alignItems: 'center',
    },
    quebraCardResultLabel: {
      fontSize: 10,
      color: PALETTE.cinza,
      fontWeight: '600',
    },
    quebraCardResultValue: {
      fontSize: 14,
      fontWeight: '800',
      color: PALETTE.warning,
      marginTop: 2,
    },
    quebraCardResultPercentual: {
      fontSize: 10,
      color: PALETTE.cinza,
      fontStyle: 'italic',
      marginTop: 2,
    },
    diasCard: {
      backgroundColor: '#E8F5E9',
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: PALETTE.sucesso,
    },
    diasCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    diasCardIcon: {
      fontSize: 24,
      marginRight: 12,
    },
    diasCardContent: {
      flex: 1,
    },
    diasCardLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: PALETTE.cinza,
      marginBottom: 2,
    },
    diasCardValue: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.sucesso,
    },
    diasCardTimeline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingHorizontal: 8,
    },
    diasCardTimelineItem: {
      alignItems: 'center',
      flex: 1,
    },
    diasCardTimelineIcon: {
      fontSize: 20,
      marginBottom: 4,
    },
    diasCardTimelineText: {
      fontSize: 10,
      fontWeight: '600',
      color: PALETTE.cinza,
    },
    diasCardTimelineArrow: {
      marginHorizontal: 8,
    },
    diasCardTimelineArrowText: {
      fontSize: 16,
      fontWeight: '700',
      color: PALETTE.sucesso,
    },
    diasCardStats: {
      flexDirection: 'row',
      backgroundColor: PALETTE.branco,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    diasCardStat: {
      alignItems: 'center',
      flex: 1,
    },
    diasCardStatLabel: {
      fontSize: 10,
      color: PALETTE.cinza,
      fontWeight: '600',
      marginBottom: 4,
    },
    diasCardStatValue: {
      fontSize: 16,
      fontWeight: '800',
      color: PALETTE.sucesso,
    },
    diasCardStatDivider: {
      width: 1,
      height: 30,
      backgroundColor: PALETTE.cinzaClaro2,
      marginHorizontal: 12,
    },
    observacoesBox: {
      backgroundColor: PALETTE.verdeClaro2,
      borderRadius: 8,
      padding: 10,
    },
    observacoesLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: PALETTE.verdePrimario,
      marginBottom: 6,
    },
    observacoesText: {
      fontSize: 12,
      color: PALETTE.preto,
      fontWeight: '500',
      lineHeight: 18,
    },
  });