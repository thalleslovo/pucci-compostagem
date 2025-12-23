import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || "https://xpcxuonqffewtsmwlato.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwY3h1b25xZmZld3RzbXdsYXRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzNDU3MywiZXhwIjoyMDgwNTEwNTczfQ.CV9ccsDAX4ZJzFOG79GhE4aP-6CRTz64_Uwz0nHPCtE"
);

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const body = JSON.parse(event.body || '{}');
    const { tabela, itens } = body;

    console.log(`🗑️ RECEBIDO PEDIDO DE DELETE: Tabela '${tabela}'`);

    if (!itens || itens.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ deletados: 0 }) };
    }

    // ✅ MAPA DE TRADUÇÃO (CRUCIAL)
    const mapaTabelas: Record<string, string> = {
      'leira': 'leiras_formadas',      // <--- O App manda 'leira'
      'leiras': 'leiras_formadas',     // <--- O App manda 'leiras'
      'clima': 'monitoramento_clima',
      'monitoramento': 'monitoramentos',
      'material': 'materiais_registrados'
    };

    // Descobre o nome real
    const tabelaReal = mapaTabelas[tabela] || tabela;
    const idsParaDeletar = itens.map((i: any) => i.id);

    console.log(`🎯 Tabela Real no Banco: '${tabelaReal}'`);
    console.log(`🔥 IDs para apagar:`, idsParaDeletar);

    // Tenta deletar
    const { error, count } = await supabase
      .from(tabelaReal)
      .delete({ count: 'exact' })
      .in('id', idsParaDeletar);

    if (error) {
      console.error('❌ ERRO SUPABASE:', error.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ erro: `Erro no Banco: ${error.message}` }) 
      };
    }

    console.log(`✅ SUCESSO! ${count} itens apagados.`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ deletados: count, sucesso: true }),
    };

  } catch (error: any) {
    console.error('❌ ERRO GERAL:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ erro: `Erro Interno: ${error.message}` }),
    };
  }
};