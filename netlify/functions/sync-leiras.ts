const { createClient } = require('@supabase/supabase-js');

// Seus dados
const supabaseUrl = "https://xpcxuonqffewtsmwlato.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwY3h1b25xZmZld3RzbXdsYXRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzNDU3MywiZXhwIjoyMDgwNTEwNTczfQ.CV9ccsDAX4ZJzFOG79GhE4aP-6CRTz64_Uwz0nHPCtE";

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostico() {
  console.log("🕵️ TESTANDO TABELA DE LEIRAS (NOMES ANTIGOS)...");

  const ID_TESTE = '116609f9-53c2-4289-9a63-0174fad8148e'; 

  const payload = {
    id: `teste-${Date.now()}`,
    usuario_id: ID_TESTE,
    
    // NOMES DO CÓDIGO ANTIGO
    numeroleira: 888,
    lote: 'TESTE-DEBUG',
    dataformacao: '24/12/2025', // Formato BR que seu código antigo usava
    status: 'formada',
    bagaço: 10,
    totalbiossólido: 50, // Com acento
    
    // NOVA COLUNA
    tipo_formacao: 'PISCINAO' 
  };

  console.log("📤 Tentando inserir:", payload);

  const { data, error } = await supabase
    .from('leiras_formadas')
    .insert(payload)
    .select();

  if (error) {
    console.log("\n❌ ERRO ENCONTRADO:");
    console.log(`Mensagem: ${error.message}`);
    console.log(`Código: ${error.code}`);
    console.log(`Detalhes: ${error.details || 'Sem detalhes'}`);
    console.log(`Hint: ${error.hint || 'Sem dica'}`);
  } else {
    console.log("\n✅ SUCESSO! O banco aceitou.");
    await supabase.from('leiras_formadas').delete().eq('id', payload.id);
  }
}

diagnostico();