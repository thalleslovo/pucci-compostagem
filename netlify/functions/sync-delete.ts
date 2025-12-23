import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { tabela, itens } = body;

    console.log(`🗑️ Pedido de delete: Tabela '${tabela}', ${itens?.length} itens`);

    if (!itens || itens.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ deletados: 0 }) };
    }

    // ✅ MAPA DE TABELAS CORRIGIDO
    const mapaTabelas: Record<string, string> = {
      // Quando o App pede 'leiras', o Backend apaga em 'leiras_formadas'
      'leira': 'leiras_formadas',
      'leiras': 'leiras_formadas',
      
      'clima': 'monitoramento_clima',
      'monitoramento': 'monitoramentos',
      'material': 'materiais_registrados',
      'materiais': 'materiais_registrados'
    };

    // Pega o nome real ou usa o que veio (fallback)
    const tabelaReal = mapaTabelas[tabela] || tabela;
    const idsParaDeletar = itens.map((i: any) => i.id);

    console.log(`🎯 Deletando da tabela real: '${tabelaReal}'`);

    const { error, count } = await supabase
      .from(tabelaReal)
      .delete({ count: 'exact' })
      .in('id', idsParaDeletar);

    if (error) {
      console.error('❌ Erro Supabase:', error.message);
      throw error;
    }

    console.log(`✅ Sucesso! ${count} registros apagados de ${tabelaReal}.`);

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
      body: JSON.stringify({ 
        erro: error.message || 'Erro interno ao deletar',
        sucesso: false
      }),
    };
  }
};