// netlify/functions/auth-user.ts

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

export const handler: Handler = async (event) => {
  // Apenas GET
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método não permitido" }),
    };
  }

  try {
    // Verificar autenticação
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Não autorizado" }),
      };
    }

    const token = authHeader.replace("Bearer ", "");

    // Verificar token com Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Token inválido" }),
      };
    }

    console.log(`✅ Usuário autenticado: ${user.id}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        sucesso: true,
        usuario: {
          id: user.id,
          email: user.email,
          criado_em: user.created_at,
        },
      }),
    };
  } catch (error) {
    console.error("❌ Erro na autenticação:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        sucesso: false,
        erro: "Erro ao verificar autenticação",
        detalhes: String(error),
      }),
    };
  }
};