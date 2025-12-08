// utils/constants.ts

export const COLORS = {
  primary: '#2E7D32',      // Verde Pucci
  secondary: '#F5F5F5',    // Cinza claro
  success: '#4CAF50',      // Verde sucesso
  warning: '#FF9800',      // Laranja aviso
  danger: '#F44336',       // Vermelho erro
  text: '#212121',         // Texto principal
  gray: '#757575',         // Texto secundário
  lightGray: '#EEEEEE',    // Fundo cinzento
  border: '#BDBDBD',       // Bordas
  white: '#FFFFFF',        // Branco
  background: '#FAFAFA',   // Fundo geral
  disabled: '#BDBDBD',     // Desabilitado
};

export const STATUS_COLORS = {
  em_preparo: {
    background: '#E8F5E9',
    text: '#1B5E20',
  },
  compostagem_ativa: {
    background: '#FFF3E0',
    text: '#E65100',
  },
  repouso: {
    background: '#E3F2FD',
    text: '#0D47A1',
  },
  pronta: {
    background: '#F3E5F5',
    text: '#4A148C',
  },
  encerrada: {
    background: '#FFEBEE',
    text: '#B71C1C',
  },
};

export const FASES_COMPOSTAGEM = {
  em_preparo: {
    nome: 'Em Preparo',
    duracao_dias: 7,
    descricao: 'Leira sendo preparada e secando',
  },
  compostagem_ativa: {
    nome: 'Compostagem Ativa',
    duracao_dias: 21,
    descricao: 'Processo ativo de decomposição e aquecimento',
  },
  repouso: {
    nome: 'Repouso/Maturação',
    duracao_dias: 21,
    descricao: 'Fase de maturação e estabilização',
  },
  pronta: {
    nome: 'Pronta para Venda',
    duracao_dias: 0,
    descricao: 'Compostagem finalizada',
  },
};

export const CICLO_TOTAL_DIAS = 60; // Dias esperados para ciclo completo
export const CICLO_REAL_DIAS = 120; // Dias reais atuais (problema a resolver)

export const MTRS_POR_LEIRA = 3; // Necessário 3 MTRs para formar leira
export const BAGACO_CANA_TONELADAS = 12; // Toneladas de bagaço de cana