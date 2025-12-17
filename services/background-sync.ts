import { syncService } from './sync';

let syncInterval: NodeJS.Timeout | null = null;

// ===== INICIAR SINCRONIZAÇÃO PERIÓDICA =====
export async function iniciarSyncPeriodico() {
  try {
    console.log('🔄 Iniciando sincronização periódica (a cada 60s)...');

    // ✅ Sincronizar imediatamente ao abrir o app
    await sincronizarSeNecessario();

    // ✅ Depois sincronizar a cada 60 segundos
    if (syncInterval) clearInterval(syncInterval);

    syncInterval = setInterval(async () => {
      await sincronizarSeNecessario();
    }, 60000); // 60 segundos

    console.log('✅ Sincronização periódica iniciada');
  } catch (error) {
    console.error('❌ Erro ao iniciar sync periódico:', error);
  }
}

// ===== PARAR SINCRONIZAÇÃO PERIÓDICA =====
export function pararSyncPeriodico() {
  try {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
      console.log('✅ Sincronização periódica parada');
    }
  } catch (error) {
    console.error('❌ Erro ao parar sync periódico:', error);
  }
}

// ===== SINCRONIZAR SE NECESSÁRIO =====
async function sincronizarSeNecessario() {
  try {
    const temInternet = await syncService.verificarInternet();

    if (!temInternet) {
      console.log('⚠️ [Sync Periódico] Sem internet - aguardando próxima tentativa');
      return;
    }

    const tamanhoFila = await syncService.obterTamanhoFila();

    if (tamanhoFila === 0) {
      console.log('✅ [Sync Periódico] Fila vazia - nada para sincronizar');
      return;
    }

    console.log(`🔄 [Sync Periódico] Sincronizando ${tamanhoFila} itens...`);
    const sucesso = await syncService.sincronizar();

    if (sucesso) {
      console.log('✅ [Sync Periódico] Sincronização concluída com sucesso');
    } else {
      console.log('⚠️ [Sync Periódico] Sincronização parcial - tentará novamente');
    }
  } catch (error) {
    console.error('❌ [Sync Periódico] Erro:', error);
  }
}

// ===== SINCRONIZAR MANUALMENTE =====
export async function sincronizarAgora() {
  try {
    console.log('🔄 Sincronizando manualmente...');
    const sucesso = await syncService.sincronizar();
    console.log(sucesso ? '✅ Sincronização manual concluída' : '❌ Erro na sincronização manual');
    return sucesso;
  } catch (error) {
    console.error('❌ Erro ao sincronizar manualmente:', error);
    return false;
  }
}

// ===== OBTER TAMANHO DA FILA =====
export async function obterTamanhoFila(): Promise<number> {
  return await syncService.obterTamanhoFila();
}