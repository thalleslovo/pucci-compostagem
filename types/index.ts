// types/index.ts

export interface MTR {
  id: string;
  numero_mtr: string;
  data_entrada: string;
  origem: 'Sabesp' | 'Ambient';
  tipo_material: 'biossólido' | 'bagaço_cana';
  quantidade: number; // em toneladas
  motorista?: string;
  placa_veiculo?: string;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface Leira {
  id: string;
  numero: number; // Número sequencial da leira
  data_criacao: string;
  mtrs_utilizadas: string[]; // IDs dos MTRs usados
  bagaco_quantidade: number; // Toneladas de bagaço
  status: 'em_preparo' | 'compostagem_ativa' | 'repouso' | 'pronta' | 'encerrada';
  data_revolvimento?: string; // Quando foi revolvida
  data_inicio_compostagem?: string;
  data_inicio_repouso?: string;
  data_conclusao?: string;
  total_dias: number;
  progresso: number; // Porcentagem 0-100
  temperatura_media_recente?: number;
  ultima_medicao?: string;
  precipitacao_total: number; // em mm
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface MedicaoTemperatura {
  id: string;
  leira_id: string;
  data_medicao: string;
  ponto_1: number; // Temperatura ponto 1
  ponto_2: number; // Temperatura ponto 2
  ponto_3: number; // Temperatura ponto 3
  temperatura_media: number;
  observacoes?: string;
  criado_em: string;
}

export interface RegistroChuva {
  id: string;
  leira_id: string;
  data_chuva: string;
  milimetros: number;
  observacoes?: string;
  criado_em: string;
}

export interface LeiraComDetalhes extends Leira {
  medicoes: MedicaoTemperatura[];
  chuvas: RegistroChuva[];
  mtrs_completos: MTR[];
}

export interface DashboardStats {
  total_mtrs: number;
  total_leiras: number;
  leiras_em_preparo: number;
  leiras_em_compostagem: number;
  leiras_em_repouso: number;
  leiras_prontas: number;
  temperatura_media_geral: number;
  chuva_total_mes: number;
}