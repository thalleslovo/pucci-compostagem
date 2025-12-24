import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://xpcxuonqffewtsmwlato.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwY3h1b25xZmZld3RzbXdsYXRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzNDU3MywiZXhwIjoyMDgwNTEwNTczfQ.CV9ccsDAX4ZJzFOG79GhE4aP-6CRTz64_Uwz0nHPCtE"
);


// Função auxiliar para converter data DD/MM/YYYY -> YYYY-MM-DD
function converterData(dataBR: string): string | null {
  if (!dataBR) return null;
  if (dataBR.includes('-')) return dataBR; // Já é ISO
  const partes = dataBR.split('/');
  if (partes.length !== 3) return null;
  return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

export const handler: Handler = async (event) => {
  // 1. Headers CORS (Obrigatórios)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const body = JSON.parse(event.body || "{}");
    const leiras = body.leiras || [];

    // Validação de Operador ID
    let operadorId = body.operadorId;
    if (!operadorId || operadorId.length < 30) {
      operadorId = '116609f9-53c2-4289-9a63-0174fad8148e'; // ID de Fallback
    }

    console.log(`📥 Recebendo ${leiras.length} leiras...`);

    if (leiras.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ message: "Vazio" }) };
    }

    const agora = new Date().toISOString();
    const erros = [];

    for (const leira of leiras) {
      // Converte a data de formação
      const dataFormatada = converterData(leira.dataFormacao);

      // 🔥 AQUI ESTÁ A MÁGICA: Mapeando o tipoFormacao
      // Se o App mandar 'MANUAL', salvamos 'PISCINAO' no banco para ficar bem claro
      let origemLeira = 'MTR';
      if (leira.tipoFormacao === 'MANUAL') {
        origemLeira = 'PISCINAO';
      }

      const payload = {
        id: leira.id,
        usuario_id: operadorId,
        numero_leira: leira.numeroLeira,
        lote: leira.lote,
        data_formacao: dataFormatada,
        status: leira.status,
        bagaco_ton: leira.bagaço || 0,
        total_biossolido: leira.totalBiossólido || 0,

        // ✅ NOVA COLUNA
        tipo_formacao: origemLeira,

        sincronizado: true,
        sincronizado_em: agora,
        criado_em: agora,
        atualizado_em: agora
      };

      const { error } = await supabase
        .from("leiras_formadas")
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error(`❌ Erro Leira ${leira.numeroLeira}:`, error.message);
        erros.push(error.message);
      }
    }

    if (erros.length > 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ sucesso: false, erro: erros[0] }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sucesso: true }),
    };

  } catch (error: any) {
    console.error("❌ Erro Crítico:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ erro: error.message }),
    };
  }
};