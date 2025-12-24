import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://xpcxuonqffewtsmwlato.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwY3h1b25xZmZld3RzbXdsYXRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzNDU3MywiZXhwIjoyMDgwNTEwNTczfQ.CV9ccsDAX4ZJzFOG79GhE4aP-6CRTz64_Uwz0nHPCtE"
);


const USUARIO_ID = '116609f9-53c2-4289-9a63-0174fad8148e';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const body = JSON.parse(event.body || "{}");
    const leiras = body.leiras || [];

    if (leiras.length === 0) return { statusCode: 200, headers, body: JSON.stringify({ message: "Vazio" }) };

    const agora = new Date().toISOString();
    const erros = [];

    for (const leira of leiras) {
      // 1. Define Origem
      let origemLeira = 'MTR';
      if (leira.tipoFormacao === 'MANUAL') origemLeira = 'PISCINAO';

      // 2. Payload Exato para sua Tabela
      const payload = {
        id: leira.id,
        usuario_id: USUARIO_ID, // Agora vai aceitar mesmo se não existir na tabela usuarios
        numeroleira: leira.numeroLeira,
        lote: leira.lote,
        dataformacao: leira.dataFormacao, // Manda como string mesmo (DD/MM/YYYY)
        status: leira.status,
        bagaço: leira.bagaço || 12,
        totalbiossólido: leira.totalBiossólido || 0, // Com acento, igual ao banco
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
      return { statusCode: 500, headers, body: JSON.stringify({ sucesso: false, erro: erros[0] }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ sucesso: true }) };

  } catch (error: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ erro: error.message }) };
  }
};