import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://xpcxuonqffewtsmwlato.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwY3h1b25xZmZld3RzbXdsYXRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzNDU3MywiZXhwIjoyMDgwNTEwNTczfQ.CV9ccsDAX4ZJzFOG79GhE4aP-6CRTz64_Uwz0nHPCtE"
);

// Função para converter DD/MM/YYYY para YYYY-MM-DD (Obrigatório para tipo DATE do SQL)
function converterDataParaISO(dataBR: string): string | null {
  if (!dataBR) return null;
  // Se já estiver em ISO, retorna
  if (dataBR.includes('-')) return dataBR;

  const partes = dataBR.split('/');
  if (partes.length !== 3) return null;

  // Retorna YYYY-MM-DD
  return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

export const handler: Handler = async (event) => {
  // 1. HEADERS CORS (Essencial)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const body = JSON.parse(event.body || "{}");
    const enriquecimentos = body.enriquecimentos || [];

    // ⚠️ ATENÇÃO: Este ID deve existir na tabela auth.users do Supabase
    // Se não existir, o banco vai recusar por causa da Foreign Key
    let operadorId = body.operadorId;

    // Validação básica de UUID
    if (!operadorId || operadorId.length < 30) {
      // Use um ID de fallback que VOCÊ TEM CERTEZA que existe no auth.users
      operadorId = '116609f9-53c2-4289-9a63-0174fad8148e';
    }

    console.log(`📥 Processando ${enriquecimentos.length} itens para a tabela enriquecimento_leira...`);

    if (enriquecimentos.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ message: "Vazio" }) };
    }

    const agora = new Date().toISOString();
    const erros = [];

    for (const item of enriquecimentos) {
      // Converte a data para o formato que o banco aceita
      const dataISO = converterDataParaISO(item.dataEnriquecimento);

      // Mapeamento EXATO para sua tabela
      const payload = {
        id: item.id,
        usuario_id: operadorId,        // FK para auth.users
        leiraid: item.leiraId,         // Nome exato da coluna (tudo minúsculo)
        data_enriquecimento: dataISO,  // Formato YYYY-MM-DD
        hora_enriquecimento: item.horaEnriquecimento || null,
        peso_anterior: item.pesoAnterior,
        peso_adicionado: item.pesoAdicionado,
        peso_novo: item.pesoNovo,
        numero_mtr: item.numeroMTR || null,
        origem: item.origem || null,
        observacoes: item.observacoes || null,
        sincronizado: true,
        sincronizado_em: agora,
        criado_em: agora,
        atualizado_em: agora
      };

      const { error } = await supabase
        .from("enriquecimento_leira")
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error(`❌ Erro DB (ID: ${item.id}):`, error.message);
        erros.push(error.message);
      }
    }

    // Se houve erro, retorna 500 para o App saber e tentar de novo depois
    if (erros.length > 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          sucesso: false,
          erro: `Erro no Banco: ${erros[0]}` // Retorna o primeiro erro para facilitar debug
        }),
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