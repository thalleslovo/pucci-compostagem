import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { syncService } from '@/services/sync';

// ===== INTERFACES TYPESCRIPT =====
interface MonitoramentoChuva {
  id: string;
  leiraId: string;
  data: string; // DD/MM/AAAA
  precipitacao: number; // 0-500 mm
  umidade?: string; // 'Seca' | 'Ideal' | 'Encharcada'
  observacao?: string;
  timestamp: number; // Para ordenação
}

interface Leira {
  id: string;
  nome: string;
  numeroLeira: number;
  status: string;
}

interface LeiraCompleta {
  id: string;
  numeroLeira: number;
  lote: string;
  dataFormacao: string;
  biossólidos: any[];
  bagaço: number;
  status: string;
  totalBiossólido: number;
}

// ===== COMPONENTE PRINCIPAL =====
const ChuvaScreen: React.FC = () => {
  const [leiras, setLeiras] = useState<Leira[]>([]);
  const [selectedLeiraId, setSelectedLeiraId] = useState<string>('');
  const [aplicarParaTodasLeiras, setAplicarParaTodasLeiras] = useState<boolean>(false);
  const [dataRegistro, setDataRegistro] = useState<string>(
    new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  );
  const [precipitacao, setPrecipitacao] = useState<string>('');
  const [umidade, setUmidade] = useState<string>(''); // Novo estado para umidade
  const [observacao, setObservacao] = useState<string>('');
  const [registros, setRegistros] = useState<MonitoramentoChuva[]>([]);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const ASYNC_STORAGE_KEY = 'leirasClimatica';
  const ASYNC_STORAGE_LEIRAS_KEY = 'leirasFormadas'; // Chave real das leiras do sistema

  // ===== CARREGAR LEIRAS REAIS DO SISTEMA =====
  const loadLeiras = async () => {
    try {
      console.log('📦 Carregando leiras do sistema...');

      // ✅ PUXAR LEIRAS REAIS DO SISTEMA
      const storedLeiras = await AsyncStorage.getItem(ASYNC_STORAGE_LEIRAS_KEY);
      if (storedLeiras) {
        const todasLeiras: LeiraCompleta[] = JSON.parse(storedLeiras);

        // ✅ FILTRAR APENAS LEIRAS ATIVAS (não prontas para venda)
        const leirasAtivas = todasLeiras.filter((leira: LeiraCompleta) =>
          leira.status !== 'pronta' // Exclui leiras já vendidas
        );

        // ✅ MAPEAR PARA FORMATO ESPERADO
        const leirasFormatadas: Leira[] = leirasAtivas.map((leira: LeiraCompleta) => ({
          id: leira.id,
          nome: `Leira #${leira.numeroLeira}`,
          numeroLeira: leira.numeroLeira,
          status: leira.status
        }));

        setLeiras(leirasFormatadas);

        // ✅ DEFINIR PRIMEIRA LEIRA COMO SELECIONADA
        if (leirasFormatadas.length > 0 && !selectedLeiraId) {
          setSelectedLeiraId(leirasFormatadas[0].id);
        }

        console.log(`✅ ${leirasFormatadas.length} leiras ativas carregadas`);
      } else {
        setLeiras([]);
        console.log('⚠️ Nenhuma leira encontrada no sistema');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar leiras:', error);
      Alert.alert('Erro', 'Não foi possível carregar as leiras do sistema.');
    }
  };

  // ===== CARREGAR REGISTROS CLIMÁTICOS =====
  const loadRegistros = async () => {
    try {
      const storedRegistros = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      if (storedRegistros) {
        const parsedRegistros: MonitoramentoChuva[] = JSON.parse(storedRegistros);
        // Ordenar por timestamp, mais recente primeiro
        setRegistros(parsedRegistros.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
      Alert.alert('Erro', 'Não foi possível carregar os registros de precipitação.');
    }
  };

  // ===== SALVAR REGISTROS =====
  const saveRegistros = async (updatedRegistros: MonitoramentoChuva[]) => {
    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(updatedRegistros));
      setRegistros(updatedRegistros.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Erro ao salvar registros:', error);
      Alert.alert('Erro', 'Não foi possível salvar os registros de precipitação.');
    }
  };

  // ===== RECARREGAR DADOS AO FOCAR NA TELA =====
  useFocusEffect(
    useCallback(() => {
      loadLeiras();
      loadRegistros();
    }, [])
  );

  // ===== FUNÇÕES AUXILIARES =====
  const parseDateString = (dateString: string): Date | null => {
    const [day, month, year] = dateString.split('/').map(Number);
    if (day && month && year) {
      return new Date(year, month - 1, day);
    }
    return null;
  };

  // ===== VALIDAÇÕES =====
  const validateInputs = (): boolean => {
    // ✅ VALIDAR SELEÇÃO DE LEIRA
    if (!aplicarParaTodasLeiras && !selectedLeiraId) {
      Alert.alert('Erro', 'Por favor, selecione uma leira ou marque "Aplicar para todas".');
      return false;
    }

    // ✅ VALIDAR SE HÁ LEIRAS ATIVAS
    if (aplicarParaTodasLeiras && leiras.length === 0) {
      Alert.alert('Erro', 'Não há leiras ativas no sistema para aplicar os dados.');
      return false;
    }

    // ✅ VALIDAR DATA
    if (!dataRegistro || !/^\d{2}\/\d{2}\/\d{4}$/.test(dataRegistro)) {
      Alert.alert('Erro', 'Por favor, insira uma data válida no formato DD/MM/AAAA.');
      return false;
    }

    const parsedDate = parseDateString(dataRegistro);
    if (!parsedDate || parsedDate.getFullYear() < 2025) {
      Alert.alert('Erro', 'A data deve ser a partir do ano 2025.');
      return false;
    }

    // ✅ VALIDAR PRECIPITAÇÃO
    const prec = parseFloat(precipitacao);
    if (isNaN(prec) || prec < 0 || prec > 500) {
      Alert.alert('Erro', 'Precipitação deve ser um número entre 0 e 500 mm.');
      return false;
    }

    return true;
  };

  // ===== SALVAR MONITORAMENTO =====
  const handleSave = async () => {
    if (!validateInputs()) {
      return;
    }

    let leirasParaAplicar: string[] = [];

    if (aplicarParaTodasLeiras) {
      // ✅ APLICAR PARA TODAS AS LEIRAS ATIVAS
      leirasParaAplicar = leiras.map(leira => leira.id);
    } else {
      // ✅ APLICAR APENAS PARA A LEIRA SELECIONADA
      leirasParaAplicar = [selectedLeiraId];
    }

    console.log(`💾 Salvando dados para ${leirasParaAplicar.length} leiras...`);

    // ✅ CRIAR REGISTROS PARA CADA LEIRA
    const novosRegistros: MonitoramentoChuva[] = [];
    const timestamp = parseDateString(dataRegistro)?.getTime() || Date.now();

    for (const leiraId of leirasParaAplicar) {
      const newRecord: MonitoramentoChuva = {
        id: editingRecordId || `${Date.now()}-${leiraId}`, // ID único por leira
        leiraId: leiraId,
        data: dataRegistro,
        precipitacao: parseFloat(precipitacao),
        umidade: umidade || undefined, // Salva umidade se selecionada
        observacao: observacao.trim() || undefined,
        timestamp: timestamp,
      };

      novosRegistros.push(newRecord);
    }

    // ✅ SALVAR TODOS OS REGISTROS
    let updatedRegistros: MonitoramentoChuva[];

    if (editingRecordId) {
      // Modo edição - atualizar registro existente
      updatedRegistros = registros.map((rec) =>
        rec.id === editingRecordId ? novosRegistros[0] : rec
      );
    } else {
      // Modo criação - adicionar novos registros
      updatedRegistros = [...registros, ...novosRegistros];
    }

    await saveRegistros(updatedRegistros);

    // ✅ ADICIONAR À FILA DE SINCRONIZAÇÃO
    console.log('📤 Adicionando à fila de sincronização...');
    for (const record of novosRegistros) {
      await syncService.adicionarFila('clima', record);
      console.log(`📤 Clima adicionado à fila para leira ${record.leiraId}`);
    }

    // ✅ MENSAGEM DE SUCESSO
    const mensagem = editingRecordId
      ? 'Registro atualizado com sucesso!\n\nOs dados serão sincronizados com o servidor quando você conectar à internet ✅.'
      : aplicarParaTodasLeiras
        ? `Dados de precipitação e umidade aplicados para ${leirasParaAplicar.length} leiras ativas!\n\nOs dados serão sincronizados com o servidor quando você conectar à internet.`
        : 'Registro salvo com sucesso!\n\nOs dados serão sincronizados com o servidor quando você conectar à internet.';

    Alert.alert('Sucesso', mensagem);
    clearForm();
  };

  // ===== EDITAR REGISTRO =====
  const handleEdit = (record: MonitoramentoChuva) => {
    setEditingRecordId(record.id);
    setSelectedLeiraId(record.leiraId);
    setAplicarParaTodasLeiras(false); // Sempre individual na edição
    setDataRegistro(record.data);
    setPrecipitacao(record.precipitacao.toString());
    setUmidade(record.umidade || ''); // Carrega umidade se existir
    setObservacao(record.observacao || '');
  };

  // ===== EXCLUIR REGISTRO =====
  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este registro?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          onPress: async () => {
            const updatedRegistros = registros.filter((rec) => rec.id !== id);
            await saveRegistros(updatedRegistros);
            Alert.alert('Sucesso', 'Registro excluído com sucesso!');
            clearForm();
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  // ===== LIMPAR FORMULÁRIO =====
  const clearForm = () => {
    setEditingRecordId(null);
    setAplicarParaTodasLeiras(false);
    setSelectedLeiraId(leiras.length > 0 ? leiras[0].id : '');
    setDataRegistro(
      new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    );
    setPrecipitacao('');
    setUmidade(''); // Limpa umidade
    setObservacao('');
  };

  // ===== CALCULAR MÉDIAS =====
  const calculateAverages = () => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentRecords = registros.filter((rec) => rec.timestamp >= sevenDaysAgo);

    if (recentRecords.length === 0) {
      return { avgPrecipitacao: 0 };
    }

    const totalPrecipitacao = recentRecords.reduce((sum, rec) => sum + rec.precipitacao, 0);

    return {
      avgPrecipitacao: (totalPrecipitacao / recentRecords.length).toFixed(2),
    };
  };

  // ===== CLASSIFICAR PRECIPITAÇÃO =====
  const getPrecipitacaoIndicator = (precipitacaoValue: number) => {
    if (precipitacaoValue === 0) {
      return { text: 'Sem Chuva', color: '#EF4444' }; // Red
    } else if (precipitacaoValue > 0 && precipitacaoValue <= 10) {
      return { text: 'Chuva Leve', color: '#F59E0B' }; // Yellow
    } else if (precipitacaoValue > 10 && precipitacaoValue <= 50) {
      return { text: 'Chuva Moderada', color: '#3B82F6' }; // Blue
    } else {
      return { text: 'Chuva Intensa', color: '#1E40AF' }; // Dark Blue
    }
  };

  // ===== OBTER COR DA UMIDADE =====
  const getUmidadeColor = (status: string) => {
    switch (status) {
      case 'Seca': return '#F97316'; // Laranja
      case 'Ideal': return '#22C55E'; // Verde
      case 'Encharcada': return '#3B82F6'; // Azul
      default: return '#9CA3AF'; // Cinza
    }
  };

  // ===== AGRUPAR REGISTROS POR DATA =====
  const agruparRegistrosPorData = () => {
    const grupos: { [data: string]: MonitoramentoChuva[] } = {};

    registros.forEach(registro => {
      if (!grupos[registro.data]) {
        grupos[registro.data] = [];
      }
      grupos[registro.data].push(registro);
    });

    return grupos;
  };

  const { avgPrecipitacao } = calculateAverages();
  const gruposRegistros = agruparRegistrosPorData();

  // ===== RENDER =====
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>🌧️ Monitoramento de Clima</Text>

        {/* ===== STATUS DAS LEIRAS ===== */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>📊 Status do Sistema</Text>
          <Text style={styles.statusText}>
            📦 {leiras.length} leiras ativas no sistema
          </Text>
          {leiras.length === 0 && (
            <Text style={styles.warningText}>
              ⚠️ Nenhuma leira ativa encontrada. Crie leiras primeiro.
            </Text>
          )}
        </View>

        {/* ===== FORMULÁRIO ===== */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {editingRecordId ? '✏️ Editar Monitoramento' : '📝 Registrar Monitoramento'}
          </Text>

          {/* ===== TOGGLE PARA TODAS AS LEIRAS ===== */}
          {!editingRecordId && leiras.length > 1 && (
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, aplicarParaTodasLeiras && styles.toggleButtonActive]}
                onPress={() => setAplicarParaTodasLeiras(!aplicarParaTodasLeiras)}
              >
                <Text style={[styles.toggleText, aplicarParaTodasLeiras && styles.toggleTextActive]}>
                  {aplicarParaTodasLeiras ? '✅' : '☐'} Aplicar para TODAS as leiras ativas
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ===== INFO DAS LEIRAS ATIVAS ===== */}
          {aplicarParaTodasLeiras && (
            <View style={styles.leirasAtivasInfo}>
              <Text style={styles.leirasAtivasTitle}>
                📦 {leiras.length} Leiras que serão afetadas:
              </Text>
              <View style={styles.leirasChips}>
                {leiras.map(leira => (
                  <View key={leira.id} style={styles.leiraChip}>
                    <Text style={styles.leiraChipText}>
                      #{leira.numeroLeira} - {leira.status}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ===== SELETOR DE LEIRA INDIVIDUAL ===== */}
          {!aplicarParaTodasLeiras && (
            <>
              <Text style={styles.label}>Leira:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedLeiraId}
                  onValueChange={(itemValue) => setSelectedLeiraId(itemValue)}
                  style={styles.picker}
                >
                  {leiras.length === 0 && <Picker.Item label="Nenhuma leira ativa disponível" value="" />}
                  {leiras.map((leira) => (
                    <Picker.Item
                      key={leira.id}
                      label={`${leira.nome} - ${leira.status}`}
                      value={leira.id}
                    />
                  ))}
                </Picker>
              </View>
            </>
          )}
          
          {/* ===== CAMPOS DO FORMULÁRIO ===== */}
          <Text style={styles.label}>Data (DD/MM/AAAA):</Text>
          <TextInput
            style={styles.input}
            value={dataRegistro}
            onChangeText={setDataRegistro}
            placeholder="Ex: 01/01/2025"
            keyboardType="numeric"
            maxLength={10}
          />

          <Text style={styles.label}>Precipitação (mm):</Text>
          <TextInput
            style={styles.input}
            value={precipitacao}
            onChangeText={setPrecipitacao}
            placeholder="0-500 mm"
            keyboardType="numeric"
          />

          {/* ===== SELETOR DE UMIDADE (NOVO) ===== */}
          <Text style={styles.label}>Umidade (Opcional):</Text>
          <View style={styles.umidadeContainer}>
            {['Seca', 'Ideal', 'Encharcada'].map((opcao) => (
              <TouchableOpacity
                key={opcao}
                style={[
                  styles.umidadeButton,
                  umidade === opcao && { backgroundColor: getUmidadeColor(opcao), borderColor: getUmidadeColor(opcao) }
                ]}
                onPress={() => setUmidade(umidade === opcao ? '' : opcao)}
              >
                <Text style={[
                  styles.umidadeButtonText,
                  umidade === opcao && { color: '#FFFFFF' }
                ]}>
                  {opcao}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Observação (Opcional):</Text>
          <TextInput
            style={styles.input}
            value={observacao}
            onChangeText={setObservacao}
            placeholder="Condições climáticas gerais..."
            multiline
            numberOfLines={3}
          />

          {/* ===== BOTÕES ===== */}
          <TouchableOpacity
            style={[styles.buttonPrimary, leiras.length === 0 && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={leiras.length === 0}
          >
            <Text style={styles.buttonText}>
              {editingRecordId ? 'Atualizar Registro' :
                aplicarParaTodasLeiras ? `Aplicar para ${leiras.length} Leiras` : 'Salvar Registro'}
            </Text>
          </TouchableOpacity>

          {editingRecordId && (
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={clearForm}
            >
              <Text style={styles.buttonText}>Cancelar Edição</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ===== MÉDIAS ===== */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Médias dos Últimos 7 Dias</Text>
          <Text style={styles.averageText}>🌧️ Precipitação Média: {avgPrecipitacao} mm</Text>
        </View>

        {/* ===== HISTÓRICO ===== */}
        <Text style={styles.sectionTitle}>📋 Histórico de Monitoramento</Text>
        {Object.keys(gruposRegistros).length === 0 ? (
          <Text style={styles.noRecordsText}>Nenhum registro encontrado.</Text>
        ) : (
          Object.keys(gruposRegistros)
            .sort((a, b) => new Date(b.split('/').reverse().join('-')).getTime() -
              new Date(a.split('/').reverse().join('-')).getTime())
            .map(data => (
              <View key={data} style={styles.dateGroup}>
                <Text style={styles.dateGroupTitle}>📅 {data}</Text>
                {gruposRegistros[data].length > 1 && (
                  <Text style={styles.dateGroupSubtitle}>
                    {gruposRegistros[data].length} leiras monitoradas
                  </Text>
                )}

                {gruposRegistros[data].map(record => {
                  const leiraNome = leiras.find(l => l.id === record.leiraId)?.nome || 'Leira Desconhecida';
                  const precipitacaoIndicator = getPrecipitacaoIndicator(record.precipitacao);

                  return (
                    <View key={record.id} style={styles.recordCard}>
                      <View style={styles.recordHeader}>
                        <Text style={styles.recordLeira}>{leiraNome}</Text>
                        <Text style={styles.recordDate}>{record.data}</Text>
                      </View>

                      <View style={styles.precipitacaoRow}>
                        <Text style={styles.recordDetail}>🌧️ Precipitação: {record.precipitacao} mm </Text>
                        <View style={[styles.precipitacaoBadge, { backgroundColor: precipitacaoIndicator.color }]}>
                          <Text style={styles.precipitacaoBadgeText}>{precipitacaoIndicator.text}</Text>
                        </View>
                      </View>

                      {/* ===== EXIBIÇÃO DA UMIDADE NO CARD ===== */}
                      {record.umidade && (
                        <View style={styles.precipitacaoRow}>
                          <Text style={styles.recordDetail}>💧 Umidade: </Text>
                          <View style={[styles.precipitacaoBadge, { backgroundColor: getUmidadeColor(record.umidade) }]}>
                            <Text style={styles.precipitacaoBadgeText}>{record.umidade}</Text>
                          </View>
                        </View>
                      )}

                      {record.observacao && (
                        <Text style={styles.recordObservation}>📝 Obs: {record.observacao}</Text>
                      )}

                      <View style={styles.recordActions}>
                        <TouchableOpacity
                          style={styles.actionButtonEdit}
                          onPress={() => handleEdit(record)}
                        >
                          <Text style={styles.actionButtonText}>✏️ Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButtonDelete}
                          onPress={() => handleDelete(record.id)}
                        >
                          <Text style={styles.actionButtonText}>🗑️ Excluir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ===== ESTILOS =====
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#1E40AF',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 15,
    textAlign: 'center',
  },
  toggleContainer: {
    marginBottom: 15,
  },
  toggleButton: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  toggleButtonActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#1E40AF',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  toggleTextActive: {
    color: '#1E40AF',
  },
  leirasAtivasInfo: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#1E40AF',
  },
  leirasAtivasTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  leirasChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  leiraChip: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  leiraChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#333',
  },
  // ESTILOS NOVOS PARA UMIDADE
  umidadeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10,
  },
  umidadeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  umidadeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  buttonPrimary: {
    backgroundColor: '#1E40AF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonSecondary: {
    backgroundColor: '#6B7280',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginTop: 25,
    marginBottom: 15,
    textAlign: 'center',
  },
  noRecordsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 20,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateGroupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 5,
    paddingHorizontal: 4,
  },
  dateGroupSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
    paddingHorizontal: 4,
    fontStyle: 'italic',
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#1E40AF',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recordLeira: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  recordDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  recordDetail: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  precipitacaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  precipitacaoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    marginLeft: 8,
  },
  precipitacaoBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recordObservation: {
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
  },
  recordActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  actionButtonEdit: {
    backgroundColor: '#15803D',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  actionButtonDelete: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  averageText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
});

export default ChuvaScreen;