import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// ✅ SEUS DADOS DE CONEXÃO (MANTIDOS)
const supabase = createClient(
  process.env.SUPABASE_URL || "https://xpcxuonqffewtsmwlato.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwY3h1b25xZmZld3RzbXdsYXRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzNDU3MywiZXhwIjoyMDgwNTEwNTczfQ.CV9ccsDAX4ZJzFOG79GhE4aP-6CRTz64_Uwz0nHPCtE"
);

// ✅ INTERFACES
interface PontoTemperatura {
  ponto: string;
  temperatura: number;
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

// ✅ SEU UUID FIXO (MANTIDO)
const USUARIO_ID = '116609f9-53c2-4289-9a63-0174fad8148e';

// ✅ SUA FUNÇÃO AUXILIAR (MANTIDA)
function extrairTemperaturas(temperaturas: PontoTemperatura[]) {
  let topo = null;
  let meio = null;
  let fundo = null;

  if (temperaturas && temperaturas.length > 0) {
    for (const pontoTemp of temperaturas) {
      if (pontoTemp.ponto === 'topo') topo = pontoTemp.temperatura;
      if (pontoTemp.ponto === 'meio') meio = pontoTemp.temperatura;
      if (pontoTemp.ponto === 'fundo') fundo = pontoTemp.temperatura;
    }
  }

  console.log(`🌡️ Temperaturas extraídas - Topo: ${topo}, Meio: ${meio}, Fundo: ${fundo}`);

  return { topo, meio, fundo };
}

export const handler: Handler = async (event) => {
  // 🔥 CORREÇÃO CRÍTICA: CABEÇALHOS CORS
  // Sem isso, o App recebe "Network Error"
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // 1. Responde rápido se for verificação de pré-voo (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log("🔄 Função sync-monitoramento acionada");

  // 2. Verifica método POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers, // <--- Importante devolver headers no erro também
      body: JSON.stringify({ error: "Método não permitido" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const monitoramentos: MonitoramentoLeira[] = body.monitoramentos || [];
    const operadorNome = body.operadorNome || "Desconhecido";

    console.log(`📤 Recebido: ${monitoramentos.length} monitoramentos do operador ${operadorNome}`);

    if (monitoramentos.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          sucesso: true,
          sincronizados: 0,
          detalhes: [],
        }),
      };
    }

    const resultados = [];
    let sincronizados = 0;
    const agora = new Date().toISOString();

    for (const monitoramento of monitoramentos) {
      try {
        console.log(`💪 Processando monitoramento: ${monitoramento.id}`);

        // Extrai temperaturas usando sua lógica
        const { topo, meio, fundo } = extrairTemperaturas(monitoramento.temperaturas);

        // ✅ INSERÇÃO NO SUPABASE (MANTIDA EXATAMENTE COMO VOCÊ FEZ)
        const { data, error } = await supabase
          .from("monitoramento_leira")
          .upsert({
            id: monitoramento.id,
            usuario_id: USUARIO_ID, // Seu ID fixo
            leiraid: monitoramento.leiraId,
            data: monitoramento.data,
            hora: monitoramento.hora || null,
            temperatura_topo: topo,
            temperatura_meio: meio,
            temperatura_fundo: fundo,
            revolveu: monitoramento.revolveu,
            observacoes: monitoramento.observacoes || null,
            status: monitoramento.statusNovo || null,
            volume_original: monitoramento.volumeOriginal || null,
            volume_final: monitoramento.volumeFinal || null,
            quebra_volume: monitoramento.quebraVolume || null,
            percentual_quebra: monitoramento.percentualQuebra || null,
            dias_desde_formacao: monitoramento.diasDesdeFormacao || null,
            sincronizado: true,
            sincronizado_em: agora,
            criado_em: agora,
            atualizado_em: agora,
          }, {
            onConflict: 'id'
          });

        if (error) {
          console.error(`❌ Erro ao sincronizar monitoramento:`, error.message);
          resultados.push({
            id: monitoramento.id,
            leiraId: monitoramento.leiraId,
            status: "erro",
            erro: error.message,
          });
        } else {
          console.log(`✅ Monitoramento sincronizado com sucesso`);
          sincronizados++;
          resultados.push({
            id: monitoramento.id,
            leiraId: monitoramento.leiraId,
            status: "sincronizado",
          });
        }
      } catch (err) {
        console.error(`❌ Erro ao processar monitoramento:`, err);
        resultados.push({
          id: monitoramento.id,
          leiraId: monitoramento.leiraId,
          status: "erro",
          erro: String(err),
        });
      }
    }

    console.log(`✅ Sincronização concluída: ${sincronizados}/${monitoramentos.length} sincronizados`);

    return {
      statusCode: 200,
      headers, // <--- OBRIGATÓRIO PARA FUNCIONAR NO APP
      body: JSON.stringify({
        sucesso: true,
        sincronizados,
        erros: resultados.filter(r => r.status === "erro").length,
        detalhes: resultados,
      }),
    };

  } catch (error) {
    console.error("❌ Erro geral na sincronização:", error);
    return {
      statusCode: 500,
      headers, // <--- OBRIGATÓRIO PARA FUNCIONAR NO APP
      body: JSON.stringify({
        sucesso: false,
        erro: "Erro ao sincronizar dados",
        detalhes: String(error),
      }),
    };
  }
};