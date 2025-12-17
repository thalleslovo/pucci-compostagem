import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueueItem {
  id: string;
  tipo: 'material' | 'monitoramento' | 'enriquecimento';
  dados: any;
  timestamp: number;
  tentativas: number;
  maxTentativas: number;
}

class QueueService {
  private static readonly QUEUE_KEY = 'syncQueue';
  private static readonly MAX_QUEUE_SIZE = 100; // Máximo de itens na fila
  private static readonly MAX_ITEM_SIZE = 50 * 1024; // 50KB por item

  // ===== ADICIONAR À FILA =====
  static async adicionar(tipo: string, dados: any) {
    try {
      console.log(`📝 Adicionando à fila: ${tipo}`);

      const queue = await this.obterFila();

      // Verificar tamanho da fila
      if (queue.length >= this.MAX_QUEUE_SIZE) {
        console.warn('⚠️ Fila cheia! Removendo itens antigos...');
        queue.shift(); // Remove o mais antigo
      }

      const novoItem: QueueItem = {
        id: `${tipo}_${Date.now()}`,
        tipo: tipo as any,
        dados,
        timestamp: Date.now(),
        tentativas: 0,
        maxTentativas: 3,
      };

      queue.push(novoItem);
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));

      console.log(`✅ Item adicionado à fila. Total: ${queue.length}`);
      return novoItem.id;
    } catch (error) {
      console.error('❌ Erro ao adicionar à fila:', error);
      throw error;
    }
  }

  // ===== OBTER FILA =====
  static async obterFila(): Promise<QueueItem[]> {
    try {
      const queue = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('❌ Erro ao obter fila:', error);
      return [];
    }
  }

  // ===== PROCESSAR FILA (EM LOTES) =====
  static async processarFila(netlifyFunction: string) {
    try {
      console.log('🔄 Processando fila...');

      const queue = await this.obterFila();

      if (queue.length === 0) {
        console.log('✅ Fila vazia');
        return { sucesso: 0, erro: 0 };
      }

      // Processar em lotes de 10 itens
      const loteSize = 10;
      let sucesso = 0;
      let erro = 0;

      for (let i = 0; i < queue.length; i += loteSize) {
        const lote = queue.slice(i, i + loteSize);

        try {
          console.log(`📤 Enviando lote ${Math.floor(i / loteSize) + 1}...`);

          const response = await fetch(`/.netlify/functions/${netlifyFunction}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: lote }),
          });

          if (response.ok) {
            sucesso += lote.length;
            // Remover itens processados
            queue.splice(i, loteSize);
            i -= loteSize; // Ajustar índice
          } else {
            erro += lote.length;
            // Incrementar tentativas
            lote.forEach((item) => {
              item.tentativas++;
              if (item.tentativas >= item.maxTentativas) {
                console.error(`❌ Item ${item.id} excedeu tentativas`);
                queue.splice(queue.indexOf(item), 1);
              }
            });
          }
        } catch (error) {
          console.error('❌ Erro ao enviar lote:', error);
          erro += lote.length;
        }

        // Aguardar 500ms entre lotes (não sobrecarregar servidor)
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Salvar fila atualizada
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));

      console.log(`✅ Processamento concluído: ${sucesso} sucesso, ${erro} erro`);
      return { sucesso, erro };
    } catch (error) {
      console.error('❌ Erro ao processar fila:', error);
      return { sucesso: 0, erro: 0 };
    }
  }

  // ===== LIMPAR FILA =====
  static async limparFila() {
    try {
      await AsyncStorage.removeItem(this.QUEUE_KEY);
      console.log('✅ Fila limpa');
    } catch (error) {
      console.error('❌ Erro ao limpar fila:', error);
    }
  }

  // ===== OBTER TAMANHO DA FILA =====
  static async obterTamanho(): Promise<number> {
    const queue = await this.obterFila();
    return queue.length;
  }

  // ===== OBTER STATUS DA FILA =====
  static async obterStatus() {
    const queue = await this.obterFila();
    const pendentes = queue.filter((item) => item.tentativas === 0).length;
    const comErro = queue.filter((item) => item.tentativas > 0).length;

    return {
      total: queue.length,
      pendentes,
      comErro,
      ultimoItem: queue[queue.length - 1],
    };
  }
}

export default QueueService;