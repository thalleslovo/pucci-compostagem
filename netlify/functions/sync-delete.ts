import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  // CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const body = JSON.parse(event.body || '{}');
    const { tabela, itens } = body;

    if (!itens || itens.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ deletados: 0 }) };
    }

    // ✅ O SEGREDO ESTÁ AQUI: MAPEAR O NOME
    const mapaTabelas: Record<string, string> = {
      'leira': 'leiras_formadas',      // <--- IMPORTANTE
      'leiras': 'leiras_formadas',     // <--- IMPORTANTE
      'clima': 'monitoramento_clima',
      'monitoramento': 'monitoramentos',
      'material': 'materiais_registrados'
    };

    // Se não achar no mapa, usa o nome original
    const tabelaReal = mapaTabelas[tabela] || tabela;
    const idsParaDeletar = itens.map((i: any) => i.id);

    console.log(`🗑️ Deletando ${idsParaDeletar.length} itens de '${tabelaReal}'`);

    const { error, count } = await supabase
      .from(tabelaReal)
      .delete({ count: 'exact' })
      .in('id', idsParaDeletar);

    if (error) {
      console.error('❌ Erro Supabase:', error.message);
      // Retorna o erro detalhado para o App não dar "undefined"
      return {
        statusCode: 400, // Bad Request
        headers,
        body: JSON.stringify({ erro: error.message }) 
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ deletados: count, sucesso: true }),
    };

  } catch (error: any) {
    console.error('❌ Erro Geral:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ erro: error.message || 'Erro interno' }),
    };
  }
};