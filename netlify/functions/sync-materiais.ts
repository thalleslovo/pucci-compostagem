import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://xpcxuonqffewtsmwlato.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwY3h1b25xZmZld3RzbXdsYXRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzNDU3MywiZXhwIjoyMDgwNTEwNTczfQ.CV9ccsDAX4ZJzFOG79GhE4aP-6CRTz64_Uwz0nHPCtE"
);

interface Material {
  id: string;
  data: string;
  tipoMaterial: string;
  numeroMTR: string;
  peso: number;
  origem: string;
}

// ✅ USE O UUID DO USUÁRIO QUE VOCÊ QUER
const USUARIO_ID = '116609f9-53c2-4289-9a63-0174fad8148e'; // Pucci Ambiental

export const handler: Handler = async (event) => {
  console.log("🔄 Função sync-materiais acionada");
  console.log("🔍 DEBUG - body recebido:", JSON.stringify(event.body));

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método não permitido" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const materiais: Material[] = body.materiais || [];
    const operadorNome = body.operadorNome || "Desconhecido";

    console.log(`📤 Recebido: ${materiais.length} materiais do operador ${operadorNome}`);
    console.log(`🔍 DEBUG - Usando usuarioId: ${USUARIO_ID}`);

    if (materiais.length === 0) {
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

    for (const material of materiais) {
      try {
        console.log(`💪 Processando material: ${material.id}`);

        const { data, error } = await supabase
          .from("materiais_registrados")
          .insert({
            id: material.id,
            usuario_id: USUARIO_ID,
            data: material.data,
            tipomaterial: material.tipoMaterial,
            numeromtr: material.numeroMTR || null,
            peso: material.peso,
            origem: material.origem,
            sincronizado: true,
            sincronizado_em: agora,
            criado_em: agora,
            atualizado_em: agora,
          });

        if (error) {
          console.error(`❌ Erro ao inserir material:`, error.message);
          resultados.push({
            id: material.id,
            status: "erro",
            erro: error.message,
          });
        } else {
          console.log(`✅ Material inserido com sucesso`);
          sincronizados++;
          resultados.push({
            id: material.id,
            status: "inserido",
          });
        }
      } catch (err) {
        console.error(`❌ Erro ao processar material:`, err);
        resultados.push({
          id: material.id,
          status: "erro",
          erro: String(err),
        });
      }
    }

    console.log(`✅ Sincronização concluída: ${sincronizados}/${materiais.length} inseridos`);

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