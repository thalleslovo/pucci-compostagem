import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://xpcxuonqffewtsmwlato.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwY3h1b25xZmZld3RzbXdsYXRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzNDU3MywiZXhwIjoyMDgwNTEwNTczfQ.CV9ccsDAX4ZJzFOG79GhE4aP-6CRTz64_Uwz0nHPCtE"
);

interface RegistroClima {
  id: string;
  leiraId: string;
  data: string;
  precipitacao: number;
  umidade?: string; // <--- ADICIONADO AQUI
  observacao?: string;
}

export const handler: Handler = async (event) => {
  console.log("🔄 Função sync-clima acionada");
  console.log("🔍 DEBUG - body recebido:", JSON.stringify(event.body));

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método não permitido" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const clima: RegistroClima[] = body.clima || [];
    const operadorNome = body.operadorNome || "Desconhecido";

    // ✅ FORÇAR UUID CORRETO - Ignorar valor inválido do app
    let operadorId = body.operadorId;

    // Se for inválido, usar o UUID correto
    if (!operadorId || operadorId === 'operador-001' || !operadorId.includes('-')) {
      operadorId = 'e1305705-7be9-4e67-9ab1-6ef5ddd449fb';
      console.log('⚠️ operadorId inválido recebido, usando UUID padrão');
    }

    console.log(`📤 Recebido: ${clima.length} registros de clima do operador ${operadorNome}`);
    console.log(`🔍 DEBUG - operadorId final: ${operadorId}`);

    if (clima.length === 0) {
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

    for (const registro of clima) {
      try {
        console.log(`💪 Processando clima da leira: ${registro.leiraId}`);
        console.log(`🔍 DEBUG - Usando operadorId: ${operadorId}`);

        const { data, error } = await supabase
          .from("clima_leira")
          .insert({
            id: registro.id,
            usuario_id: operadorId,
            leiraid: registro.leiraId,
            data: registro.data,
            precipitacao: registro.precipitacao,
            umidade: registro.umidade || null, // <--- ADICIONADO AQUI: Salva no Supabase!
            observacao: registro.observacao || null,
            sincronizado: true,
            sincronizado_em: agora,
            criado_em: agora,
            atualizado_em: agora,
          });

        if (error) {
          console.error(`❌ Erro ao inserir clima:`, error.message);
          resultados.push({
            id: registro.id,
            leiraId: registro.leiraId,
            status: "erro",
            erro: error.message,
          });
        } else {
          console.log(`✅ Registro de clima inserido com sucesso`);
          sincronizados++;
          resultados.push({
            id: registro.id,
            leiraId: registro.leiraId,
            status: "inserido",
          });
        }
      } catch (err) {
        console.error(`❌ Erro ao processar clima:`, err);
        resultados.push({
          id: registro.id,
          leiraId: registro.leiraId,
          status: "erro",
          erro: String(err),
        });
      }
    }

    console.log(`✅ Sincronização concluída: ${sincronizados}/${clima.length} inseridos`);

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