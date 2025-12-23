import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

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
      return JSON.parse(operadorSalvo);
    } catch (error) {
      console.error('❌ Erro ao obter operador:', error);
      return null;
    }
  },

  // ===== OBTER TAMANHO DA FILA (ESSENCIAL PARA O DASHBOARD) =====
  async obterTamanhoFila(): Promise<number> {
    try {
      const fila = await AsyncStorage.getItem('filaSync') || '[]';
      const filaArray: SyncQueue[] = JSON.parse(fila);
      return filaArray.length;
    } catch (error) {
      return 0;
    }
  },

  // ===== ADICIONAR À FILA =====
  async adicionarFila(tipo: SyncQueue['tipo'], dados: any): Promise<void> {
    try {
      const fila = await AsyncStorage.getItem('filaSync') || '[]';
      const filaArray: SyncQueue[] = JSON.parse(fila);

      filaArray.push({ tipo, dados, timestamp: Date.now(), tentativas: 0 });

      await AsyncStorage.setItem('filaSync', JSON.stringify(filaArray));
      console.log(`📝 Adicionado à fila: ${tipo}`);

      const temInternet = await this.verificarInternet();
      if (temInternet) {
        await this.sincronizar();
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar à fila:', error);
    }
  },

  // ===== SINCRONIZAR (PRINCIPAL) =====
  async sincronizar(): Promise<boolean> {
    try {
      const temInternet = await this.verificarInternet();
      if (!temInternet) return false;

      const operador = await this.obterOperadorLogado();
      if (!operador) return false;

      const fila = await AsyncStorage.getItem('filaSync') || '[]';
      const filaArray: SyncQueue[] = JSON.parse(fila);

      if (filaArray.length === 0) return true;

      console.log(`🔄 Sincronizando ${filaArray.length} itens...`);

      // Agrupamento
      const grupos = {
        material: filaArray.filter(f => f.tipo === 'material').map(f => f.dados),
        leira: filaArray.filter(f => f.tipo === 'leira').map(f => f.dados),
        monitoramento: filaArray.filter(f => f.tipo === 'monitoramento').map(f => f.dados),
        clima: filaArray.filter(f => f.tipo === 'clima').map(f => f.dados),
        enriquecimento: filaArray.filter(f => f.tipo === 'enriquecimento').map(f => f.dados),
        leira_deletada: filaArray.filter(f => f.tipo === 'leira_deletada').map(f => f.dados),
        clima_deletado: filaArray.filter(f => f.tipo === 'clima_deletado').map(f => f.dados),
      };

      let erros = 0;

      // Execução Sequencial
      if (grupos.material.length) await this.sincronizarGenerico('sync-materiais', { materiais: grupos.material }, operador).catch(() => erros++);
      if (grupos.leira.length) await this.sincronizarGenerico('sync-leiras', { leiras: grupos.leira }, operador).catch(() => erros++);
      if (grupos.monitoramento.length) await this.sincronizarGenerico('sync-monitoramento', { monitoramentos: grupos.monitoramento }, operador).catch(() => erros++);
      
      if (grupos.clima.length) {
        const payloadClima = grupos.clima.map(i => ({ ...i, umidade: i.umidade || null, observacao: i.observacao || '' }));
        await this.sincronizarGenerico('sync-clima', { clima: payloadClima }, operador).catch(() => erros++);
      }

      if (grupos.enriquecimento.length) await this.sincronizarGenerico('sync-enriquecimento', { enriquecimentos: grupos.enriquecimento }, operador).catch(() => erros++);

      // DELEÇÕES
      if (grupos.leira_deletada.length) await this.sincronizarDelecoes('leiras', grupos.leira_deletada, operador).catch(() => erros++);
      if (grupos.clima_deletado.length) await this.sincronizarDelecoes('clima', grupos.clima_deletado, operador).catch(() => erros++);

      if (erros === 0) {
        await AsyncStorage.removeItem('filaSync');
        console.log('✅ Sincronização concluída - Fila limpa');
        return true;
      } else {
        console.log(`⚠️ Sincronização parcial (${erros} erros)`);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro geral:', error);
      return false;
    }
  },

  // ===== FUNÇÃO GENÉRICA DE ENVIO =====
  async sincronizarGenerico(endpoint: string, body: any, operador: any): Promise<void> {
    const netlifyUrl = process.env.EXPO_PUBLIC_NETLIFY_URL || 'http://localhost:9999';
    const response = await fetch(`${netlifyUrl}/.netlify/functions/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, operadorId: operador.id, operadorNome: operador.nome }),
    });
    if (!response.ok) throw new Error(`Erro ${response.status} em ${endpoint}`);
  },

  // ===== FUNÇÃO DE DELEÇÃO (VERSÃO FINAL PROFISSIONAL) =====
  async sincronizarDelecoes(tabela: string, itens: any[], operador: any): Promise<void> {
    try {
      const netlifyUrl = process.env.EXPO_PUBLIC_NETLIFY_URL || 'http://localhost:9999';
      const fullUrl = `${netlifyUrl}/.netlify/functions/sync-delete`;

      console.log(`🗑️ Enviando ${itens.length} itens para deletar da tabela ${tabela}...`);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabela, itens, operadorId: operador.id }),
      });

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        // Se não for JSON, loga o aviso mas não trava o app
        console.warn(`⚠️ Resposta inválida do servidor ao deletar: ${responseText}`);
        return; 
      }

      if (!response.ok) {
        // Se o servidor recusou, loga o erro mas remove da fila para não travar
        console.warn(`⚠️ Erro no servidor: ${result.erro || result.message}`);
        return;
      }

      console.log(`✅ Sucesso! ${result.deletados} itens deletados.`);

    } catch (error) {
      console.error(`❌ Erro de conexão ao deletar ${tabela}:`, error);
      // Se for erro de rede, joga o erro para tentar depois
      if (String(error).includes('Network request failed')) {
        throw error;
      }
    }
  }
};