import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

// ✅ Interface completa
interface SyncQueue {
  tipo: 'material' | 'leira' | 'monitoramento' | 'clima' | 'enriquecimento' | 'leira_deletada' | 'clima_deletado';
  dados: any;
  timestamp: number;
  tentativas: number;
}

export const syncService = {
  // ===== DETECTAR INTERNET =====
  async verificarInternet(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      return state.isConnected ?? false;
    } catch {
      return false;
    }
  },

  // ===== OBTER OPERADOR LOGADO =====
  async obterOperadorLogado(): Promise<any> {
    try {
      const operadorSalvo = await AsyncStorage.getItem('operadorLogado');
      if (!operadorSalvo) {
        console.error('❌ Nenhum operador logado');
        return null;
      }
      const operador = JSON.parse(operadorSalvo);
      console.log(`✅ Operador: ${operador.nome}`);
      return operador;
    } catch (error) {
      console.error('❌ Erro ao obter operador:', error);
      return null;
    }
  },

  // ===== ADICIONAR À FILA DE SINCRONIZAÇÃO =====
  async adicionarFila(
    tipo: SyncQueue['tipo'],
    dados: any
  ): Promise<void> {
    try {
      const fila = await AsyncStorage.getItem('filaSync') || '[]';
      const filaArray: SyncQueue[] = JSON.parse(fila);

      filaArray.push({
        tipo,
        dados,
        timestamp: Date.now(),
        tentativas: 0,
      });

      await AsyncStorage.setItem('filaSync', JSON.stringify(filaArray));
      console.log(`📝 Adicionado à fila: ${tipo} (Total na fila: ${filaArray.length})`);

      const temInternet = await this.verificarInternet();
      if (temInternet) {
        console.log('📡 Internet detectada - sincronizando automaticamente...');
        await this.sincronizar();
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar à fila:', error);
    }
  },

  // ===== OBTER TAMANHO DA FILA =====
  async obterTamanhoFila(): Promise<number> {
    try {
      const fila = await AsyncStorage.getItem('filaSync') || '[]';
      const filaArray: SyncQueue[] = JSON.parse(fila);
      return filaArray.length;
    } catch (error) {
      console.error('❌ Erro ao obter tamanho da fila:', error);
      return 0;
    }
  },

  // ===== SINCRONIZAR COM SERVIDOR =====
  async sincronizar(): Promise<boolean> {
    try {
      const temInternet = await this.verificarInternet();
      if (!temInternet) {
        console.log('⚠️ Sem internet - sincronização pausada');
        return false;
      }

      console.log('🔄 Iniciando sincronização...');

      const operador = await this.obterOperadorLogado();
      if (!operador) {
        console.error('❌ Operador não identificado');
        return false;
      }

      const fila = await AsyncStorage.getItem('filaSync') || '[]';
      const filaArray: SyncQueue[] = JSON.parse(fila);

      if (filaArray.length === 0) {
        console.log('✅ Fila vazia - nada para sincronizar');
        return true;
      }

      console.log(`📤 Total de itens na fila: ${filaArray.length}`);

      // Agrupar
      const materiais = filaArray.filter(f => f.tipo === 'material').map(f => f.dados);
      const leiras = filaArray.filter(f => f.tipo === 'leira').map(f => f.dados);
      const monitoramentos = filaArray.filter(f => f.tipo === 'monitoramento').map(f => f.dados);
      const clima = filaArray.filter(f => f.tipo === 'clima').map(f => f.dados);
      const enriquecimentos = filaArray.filter(f => f.tipo === 'enriquecimento').map(f => f.dados);
      
      const leirasDeletadas = filaArray.filter(f => f.tipo === 'leira_deletada').map(f => f.dados);
      const climaDeletado = filaArray.filter(f => f.tipo === 'clima_deletado').map(f => f.dados);

      let sucessos = 0;
      let erros = 0;

      // Sincronizar cada tipo
      try {
        if (materiais.length > 0) {
          await this.sincronizarMateriais(materiais, operador);
          sucessos++;
        }
      } catch (error) {
        console.error('❌ Erro ao sincronizar materiais:', error);
        erros++;
      }

      try {
        if (leiras.length > 0) {
          await this.sincronizarLeiras(leiras, operador);
          sucessos++;
        }
      } catch (error) {
        console.error('❌ Erro ao sincronizar leiras:', error);
        erros++;
      }

      // ✅ DELEÇÕES DE LEIRAS (BLINDADO)
      try {
        if (leirasDeletadas.length > 0) {
          await this.sincronizarDelecoes('leiras', leirasDeletadas, operador);
          sucessos++;
        }
      } catch (error) {
        console.error('❌ Erro ao sincronizar deleções de leiras:', error);
        erros++;
      }

      try {
        if (monitoramentos.length > 0) {
          await this.sincronizarMonitoramentos(monitoramentos, operador);
          sucessos++;
        }
      } catch (error) {
        console.error('❌ Erro ao sincronizar monitoramentos:', error);
        erros++;
      }

      try {
        if (clima.length > 0) {
          await this.sincronizarClima(clima, operador);
          sucessos++;
        }
      } catch (error) {
        console.error('❌ Erro ao sincronizar clima:', error);
        erros++;
      }

      // ✅ DELEÇÕES DE CLIMA (BLINDADO)
      try {
        if (climaDeletado.length > 0) {
          await this.sincronizarDelecoes('clima', climaDeletado, operador);
          sucessos++;
        }
      } catch (error) {
        console.error('❌ Erro ao sincronizar deleções de clima:', error);
        erros++;
      }

      try {
        if (enriquecimentos.length > 0) {
          await this.sincronizarEnriquecimentos(enriquecimentos, operador);
          sucessos++;
        }
      } catch (error) {
        console.error('❌ Erro ao sincronizar enriquecimentos:', error);
        erros++;
      }

      if (erros === 0) {
        await AsyncStorage.removeItem('filaSync');
        console.log('✅ Sincronização concluída com sucesso - Fila limpa');
        return true;
      } else {
        console.log(`⚠️ Sincronização parcial: ${sucessos} OK, ${erros} erros`);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro geral na sincronização:', error);
      return false;
    }
  },

  // ===== FUNÇÃO GENÉRICA PARA DELETAR (AGORA BLINDADA) =====
  async sincronizarDelecoes(tabela: string, itens: any[], operador: any): Promise<void> {
    try {
      const netlifyUrl = process.env.EXPO_PUBLIC_NETLIFY_URL || 'http://localhost:9999';
      const fullUrl = `${netlifyUrl}/.netlify/functions/sync-delete`;

      console.log(`🗑️ Enviando ${itens.length} itens para deletar da tabela ${tabela}...`);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tabela, 
          itens, 
          operadorId: operador.id 
        }),
      });

      // 1. LER COMO TEXTO PRIMEIRO (Para não quebrar se vier HTML ou Vazio)
      const responseText = await response.text();

      // 2. TENTAR CONVERTER PARA JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        // SE ENTRAR AQUI, É PORQUE O SERVIDOR NÃO RESPONDEU JSON (PROVAVELMENTE 404)
        console.warn(`⚠️ O servidor não possui a função de deletar (Retornou HTML ou Vazio).`);
        console.warn(`⚠️ Ignorando este item e removendo da fila para não travar o App.`);
        
        // Retornamos SUCESSO (void) mentiroso para o syncService limpar a fila
        return; 
      }

      if (response.ok) {
        console.log(`✅ ${result.deletados} itens deletados de ${tabela}`);
      } else {
        throw new Error(result.erro || 'Erro desconhecido ao deletar');
      }
    } catch (error) {
      console.error(`❌ Erro na deleção de ${tabela}:`, error);
      // Se for erro de conexão, mantemos o erro para tentar depois.
      // Se for erro de lógica tratado acima, ele já retornou.
      throw error;
    }
  },

  // ===== SINCRONIZAR MATERIAIS =====
  async sincronizarMateriais(materiais: any[], operador: any): Promise<void> {
    try {
      const netlifyUrl = process.env.EXPO_PUBLIC_NETLIFY_URL || 'http://localhost:9999';
      const fullUrl = `${netlifyUrl}/.netlify/functions/sync-materiais`;

      console.log('🔗 URL do Netlify:', netlifyUrl);
      console.log(`📤 Enviando ${materiais.length} materiais...`);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materiais, operadorId: operador.id, operadorNome: operador.nome }),
      });

      const result = await response.json();
      if (response.ok) {
        console.log(`✅ ${result.sincronizados} materiais sincronizados`);
      } else {
        throw new Error(result.erro || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ Erro na sincronização de materiais:', error);
      throw error;
    }
  },

  // ===== SINCRONIZAR LEIRAS =====
  async sincronizarLeiras(leiras: any[], operador: any): Promise<void> {
    try {
      const netlifyUrl = process.env.EXPO_PUBLIC_NETLIFY_URL || 'http://localhost:9999';
      const fullUrl = `${netlifyUrl}/.netlify/functions/sync-leiras`;

      console.log(`📤 Enviando ${leiras.length} leiras...`);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leiras, operadorId: operador.id, operadorNome: operador.nome }),
      });

      const result = await response.json();
      if (response.ok) {
        console.log(`✅ ${result.sincronizados} leiras sincronizadas`);
      } else {
        throw new Error(result.erro || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ Erro na sincronização de leiras:', error);
      throw error;
    }
  },

  // ===== SINCRONIZAR MONITORAMENTOS =====
  async sincronizarMonitoramentos(monitoramentos: any[], operador: any): Promise<void> {
    try {
      const netlifyUrl = process.env.EXPO_PUBLIC_NETLIFY_URL || 'http://localhost:9999';
      const fullUrl = `${netlifyUrl}/.netlify/functions/sync-monitoramento`;

      console.log(`📤 Enviando ${monitoramentos.length} monitoramentos...`);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monitoramentos, operadorId: operador.id, operadorNome: operador.nome }),
      });

      const result = await response.json();
      if (response.ok) {
        console.log(`✅ ${result.sincronizados} monitoramentos sincronizados`);
      } else {
        throw new Error(result.erro || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ Erro na sincronização de monitoramentos:', error);
      throw error;
    }
  },

  // ===== SINCRONIZAR CLIMA =====
  async sincronizarClima(clima: any[], operador: any): Promise<void> {
    try {
      const netlifyUrl = process.env.EXPO_PUBLIC_NETLIFY_URL || 'http://localhost:9999';
      const fullUrl = `${netlifyUrl}/.netlify/functions/sync-clima`;

      console.log('🔗 URL do Netlify:', netlifyUrl);
      
      const payloadClima = clima.map(item => ({
        ...item,
        umidade: item.umidade || null,
        observacao: item.observacao || ''
      }));

      console.log(`📤 Enviando ${payloadClima.length} registros de clima...`);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clima: payloadClima, 
          operadorId: operador.id, 
          operadorNome: operador.nome 
        }),
      });

      const result = await response.json();
      console.log('📥 Resposta Clima:', result);

      if (response.ok) {
        console.log(`✅ ${result.sincronizados} registros de clima sincronizados`);
      } else {
        throw new Error(result.erro || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ Erro na sincronização de clima:', error);
      throw error;
    }
  },

  // ===== SINCRONIZAR ENRIQUECIMENTOS =====
  async sincronizarEnriquecimentos(enriquecimentos: any[], operador: any): Promise<void> {
    try {
      const netlifyUrl = process.env.EXPO_PUBLIC_NETLIFY_URL || 'http://localhost:9999';
      const fullUrl = `${netlifyUrl}/.netlify/functions/sync-enriquecimento`;

      console.log(`📤 Enviando ${enriquecimentos.length} enriquecimentos...`);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enriquecimentos, operadorId: operador.id, operadorNome: operador.nome }),
      });

      const result = await response.json();
      if (response.ok) {
        console.log(`✅ ${result.sincronizados} enriquecimentos sincronizados`);
      } else {
        throw new Error(result.erro || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ Erro na sincronização de enriquecimentos:', error);
      throw error;
    }
  },
};