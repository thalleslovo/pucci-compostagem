import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Conexão com o Supabase usando a Chave Mestra (Service Role)
const supabase = createClient(
  process.env.SUPABASE_URL || "https://xpcxuonqffewtsmwlato.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwY3h1b25xZmZld3RzbXdsYXRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzNDU3MywiZXhwIjoyMDgwNTEwNTczfQ.CV9ccsDAX4ZJzFOG79GhE4aP-6CRTz64_Uwz0nHPCtE"
);

const USUARIO_ID = '116609f9-53c2-4289-9a63-0174fad8148e';

export const handler: Handler = async (event) => {
  // Configuração CORS para o App não reclamar
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Responde rápido se for pre-flight check
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const body = JSON.parse(event.body || "{}");
    const leiras = body.leiras || [];

    // Se não veio nada, retorna sucesso vazio
    if (leiras.length === 0) return { statusCode: 200, headers, body: JSON.stringify({ message: "Vazio" }) };

    const agora = new Date().toISOString();
    const erros = [];

    for (const leira of leiras) {
      // 1. Define a origem (MTR ou PISCINAO)
      let origemLeira = 'MTR';
      if (leira.tipoFormacao === 'MANUAL') origemLeira = 'PISCINAO';

      // 2. Monta o objeto da LEIRA
      const payloadLeira = {
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

      // 3. Salva a LEIRA na tabela 'leiras_formadas'
      const { error: erroLeira } = await supabase
        .from("leiras_formadas")
        .upsert(payloadLeira, { onConflict: 'id' });

      if (erroLeira) {
        console.error(`❌ Erro Leira ${leira.numeroLeira}:`, erroLeira.message);
        erros.push(erroLeira.message);
        continue; // Se falhar a leira, pula para a próxima e não tenta salvar MTRs
      }

      // ============================================================
      // 4. SALVA OS MTRs (BIOSSÓLIDOS)
      // ============================================================
      // Tenta pegar a lista com qualquer nome que o App mandar
      const listaMTRs = leira.biossólidos || leira.biossolidos || leira.mtrs || [];

      if (listaMTRs.length > 0) {
        // Primeiro: Limpa MTRs antigos dessa leira (para evitar duplicidade na edição)
        await supabase.from("leira_mtrs").delete().eq("leira_id", leira.id);

        // Prepara os dados para inserir
        const mtrsParaInserir = listaMTRs.map((item: any) => {
          // Captura o valor do MTR de qualquer campo possível
          const valorMTR = item.numeroMTR || item.mtr || item.numero || 'S/N';

          return {
            leira_id: leira.id, 
            // 🔥 CORREÇÃO AQUI: Converte para String() para evitar erro se vier número puro
            numero_mtr: String(valorMTR), 
            peso: parseFloat(item.peso) || 0,
            origem: item.origem || 'Desconhecida',
            tipo_material: item.tipoMaterial || 'Biossólido',
            criado_em: agora
          };
        });

        // Insere na tabela 'leira_mtrs'
        const { error: erroMTR } = await supabase
          .from("leira_mtrs")
          .insert(mtrsParaInserir);

        if (erroMTR) {
          console.error(`⚠️ Erro ao salvar MTRs da leira ${leira.numeroLeira}:`, erroMTR.message);
        } else {
          console.log(`✅ ${mtrsParaInserir.length} MTRs salvos para a Leira ${leira.numeroLeira}`);
        }
      }
    }

    // Se houve erro crítico em alguma leira, retorna erro
    if (erros.length > 0) {
      return { statusCode: 500, headers, body: JSON.stringify({ sucesso: false, erro: erros[0] }) };
    }

    // Sucesso total
    return { statusCode: 200, headers, body: JSON.stringify({ sucesso: true }) };

  } catch (error: any) {
    console.error("❌ Erro Geral:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ erro: error.message }) };
  }
};