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

      // 2. Payload da LEIRA
      const payload = {
        id: leira.id,
        usuario_id: USUARIO_ID,
        numeroleira: leira.numeroLeira,
        lote: leira.lote,
        dataformacao: leira.dataFormacao,
        status: leira.status,
        bagaço: leira.bagaço || 12,
        totalbiossólido: leira.totalBiossólido || 0,
        tipo_formacao: origemLeira,
        sincronizado: true,
        sincronizado_em: agora,
        criado_em: agora,
        atualizado_em: agora
      };

      // 3. Salva a LEIRA
      const { error: erroLeira } = await supabase
        .from("leiras_formadas")
        .upsert(payload, { onConflict: 'id' });

      if (erroLeira) {
        console.error(`❌ Erro Leira ${leira.numeroLeira}:`, erroLeira.message);
        erros.push(erroLeira.message);
        continue;
      }

      // ============================================================
      // 4. CORREÇÃO AQUI: Aceita qualquer nome que vier do App
      // ============================================================
      const listaMTRs = leira.biossólidos || leira.biossolidos || leira.mtrs || [];

      console.log(`🧐 Leira ${leira.numeroLeira}: Encontrados ${listaMTRs.length} MTRs para salvar.`);

      if (listaMTRs.length > 0) {
        // Limpa antigos
        await supabase.from("leira_mtrs").delete().eq("leira_id", leira.id);

        const mtrsParaInserir = listaMTRs.map((item: any) => ({
          leira_id: leira.id,
          numero_mtr: item.numeroMTR || item.mtr || item.numero || 'S/N',
          peso: parseFloat(item.peso) || 0,
          origem: item.origem || null,
          tipo_material: item.tipoMaterial || 'Biossólido',
          criado_em: agora
        }));

        const { error: erroMTR } = await supabase
          .from("leira_mtrs")
          .insert(mtrsParaInserir);

        if (erroMTR) {
          console.error(`⚠️ Erro MTR:`, erroMTR.message);
        } else {
          console.log(`✅ Sucesso: MTRs salvos.`);
        }
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