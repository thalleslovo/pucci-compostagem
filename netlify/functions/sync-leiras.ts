import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://xpcxuonqffewtsmwlato.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwY3h1b25xZmZld3RzbXdsYXRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzNDU3MywiZXhwIjoyMDgwNTEwNTczfQ.CV9ccsDAX4ZJzFOG79GhE4aP-6CRTz64_Uwz0nHPCtE"
);

interface BiossólidoEntry {
  id: string;
  data: string;
  numeroMTR: string;
  peso: string;
  origem: string;
  tipoMaterial: string;
}

interface Leira {
  id: string;
  numeroLeira: number;
  lote: string;
  dataFormacao: string;
  biossólidos: BiossólidoEntry[];
  bagaço: number;
  status: string;
  totalBiossólido: number;
}

// ✅ UUID DO USUÁRIO
const USUARIO_ID = '116609f9-53c2-4289-9a63-0174fad8148e';

export const handler: Handler = async (event) => {
  console.log("🔄 Função sync-leiras acionada");
  console.log("🔍 DEBUG - body recebido:", JSON.stringify(event.body));

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método não permitido" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const leiras: Leira[] = body.leiras || [];
    const operadorNome = body.operadorNome || "Desconhecido";

    console.log(`📤 Recebido: ${leiras.length} leiras do operador ${operadorNome}`);
    console.log(`🔍 DEBUG - Usando usuarioId: ${USUARIO_ID}`);

    if (leiras.length === 0) {
      return {
        statusCode: 200,
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

    for (const leira of leiras) {
      try {
        console.log(`💪 Processando leira: ${leira.id}`);

        // ✅ USAR UPSERT: INSERT OR UPDATE
        const { data, error } = await supabase
          .from("leiras_formadas")
          .upsert({
            id: leira.id,
            usuario_id: USUARIO_ID,
            numeroleira: leira.numeroLeira,
            lote: leira.lote,
            dataformacao: leira.dataFormacao,
            status: leira.status,
            totalbiossólido: leira.totalBiossólido,
            bagaço: leira.bagaço,
            sincronizado: true,
            sincronizado_em: agora,
            criado_em: agora,
            atualizado_em: agora,
          }, {
            onConflict: 'id' // ✅ SE EXISTIR ID, FAZ UPDATE
          });

        if (error) {
          console.error(`❌ Erro ao sincronizar leira:`, error.message);
          resultados.push({
            id: leira.id,
            numeroLeira: leira.numeroLeira,
            status: "erro",
            erro: error.message,
          });
        } else {
          console.log(`✅ Leira sincronizada com sucesso`);
          sincronizados++;
          resultados.push({
            id: leira.id,
            numeroLeira: leira.numeroLeira,
            status: "sincronizada",
          });
        }
      } catch (err) {
        console.error(`❌ Erro ao processar leira:`, err);
        resultados.push({
          id: leira.id,
          numeroLeira: leira.numeroLeira,
          status: "erro",
          erro: String(err),
        });
      }
    }

    console.log(`✅ Sincronização concluída: ${sincronizados}/${leiras.length} sincronizadas`);

    return {
      statusCode: 200,
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
      body: JSON.stringify({
        sucesso: false,
        erro: "Erro ao sincronizar dados",
        detalhes: String(error),
      }),
    };
  }
};