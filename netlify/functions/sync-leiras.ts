import { Handler } from "@netlify/functions";

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

    // SE O APP MANDOU DADOS, VAMOS VER A ESTRUTURA EXATA
    if (leiras.length > 0) {
      const primeiraLeira = leiras[0];
      
      // Retorna para o App (ou Postman) exatamente o que chegou
      return {
        statusCode: 200, // Retorna 200 para o App não dar erro de rede
        headers,
        body: JSON.stringify({
          DEBUG: "MODO DE TESTE ATIVADO",
          recebi_leiras: leiras.length,
          chaves_da_primeira_leira: Object.keys(primeiraLeira),
          conteudo_biossolidos_com_acento: primeiraLeira.biossólidos,
          conteudo_biossolidos_sem_acento: primeiraLeira.biossolidos,
          conteudo_mtrs: primeiraLeira.mtrs,
          conteudo_completo_primeira_leira: primeiraLeira // Vai mostrar tudo
        })
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ message: "Recebi lista vazia" }) };

  } catch (error: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ erro: error.message }) };
  }
};