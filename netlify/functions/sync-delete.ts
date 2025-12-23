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
    const { tabela, itens } = JSON.parse(event.body || '{}');

    // Mapeia o nome do App para o nome real no Banco
    const mapaTabelas: Record<string, string> = {
      'leiras': 'leiras',
      'clima': 'monitoramento_clima',
      'monitoramento': 'monitoramentos',
      'material': 'materiais'
    };

    const tabelaReal = mapaTabelas[tabela] || tabela;
    const ids = itens.map((i: any) => i.id);

    if (ids.length > 0) {
      const { error } = await supabase
        .from(tabelaReal)
        .delete()
        .in('id', ids);

      if (error) throw error;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ deletados: ids.length, sucesso: true }),
    };

  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ erro: error.message }),
    };
  }
};