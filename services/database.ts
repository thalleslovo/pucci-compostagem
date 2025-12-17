// services/database.ts

import * as SQLite from 'expo-sqlite';
import { MTR, Leira, MedicaoTemperatura, RegistroChuva } from '@/types';

const DATABASE_NAME = 'pucci_compostagem.db';

let db: SQLite.SQLiteDatabase | null = null;

// Inicializar banco de dados
export const initializeDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Criar tabelas
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS mtrs (
        id TEXT PRIMARY KEY,
        numero_mtr TEXT UNIQUE,
        data_entrada TEXT,
        origem TEXT,
        tipo_material TEXT,
        quantidade REAL,
        motorista TEXT,
        placa_veiculo TEXT,
        observacoes TEXT,
        criado_em TEXT,
        atualizado_em TEXT
      );

      CREATE TABLE IF NOT EXISTS leiras (
        id TEXT PRIMARY KEY,
        numero INTEGER UNIQUE,
        data_criacao TEXT,
        mtrs_utilizadas TEXT,
        bagaco_quantidade REAL,
        status TEXT,
        data_revolvimento TEXT,
        data_inicio_compostagem TEXT,
        data_inicio_repouso TEXT,
        data_conclusao TEXT,
        total_dias INTEGER,
        progresso REAL,
        temperatura_media_recente REAL,
        ultima_medicao TEXT,
        precipitacao_total REAL,
        observacoes TEXT,
        criado_em TEXT,
        atualizado_em TEXT
      );

      CREATE TABLE IF NOT EXISTS medicoes_temperatura (
        id TEXT PRIMARY KEY,
        leira_id TEXT,
        data_medicao TEXT,
        ponto_1 REAL,
        ponto_2 REAL,
        ponto_3 REAL,
        temperatura_media REAL,
        observacoes TEXT,
        criado_em TEXT,
        FOREIGN KEY (leira_id) REFERENCES leiras(id)
      );

      -- ATUALIZADO: Adicionado campo 'umidade'
      CREATE TABLE IF NOT EXISTS registros_chuva (
        id TEXT PRIMARY KEY,
        leira_id TEXT,
        data_chuva TEXT,
        milimetros REAL,
        umidade TEXT, 
        observacoes TEXT,
        criado_em TEXT,
        FOREIGN KEY (leira_id) REFERENCES leiras(id)
      );
    `);

    // ✅ MIGRAÇÃO AUTOMÁTICA: Adiciona coluna 'umidade' se não existir
    try {
      await db.execAsync(`ALTER TABLE registros_chuva ADD COLUMN umidade TEXT;`);
      console.log('✅ Coluna umidade adicionada com sucesso');
    } catch (e) {
      // Ignora erro se a coluna já existir
    }

    console.log('✅ Banco de dados inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  }
};

// Obter database instance
const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    await initializeDatabase();
  }
  return db!;
};

// ==================== SERVIÇO DO BANCO ====================

export const databaseService = {
  // ==================== MTRs ====================

  // MTR: Criar
  createMTR: async (mtr: Omit<MTR, 'id' | 'criado_em' | 'atualizado_em'>): Promise<MTR> => {
    try {
      const database = await getDatabase();
      const id = Date.now().toString();
      const agora = new Date().toISOString();

      const novoMTR: MTR = {
        ...mtr,
        id,
        criado_em: agora,
        atualizado_em: agora,
      };

      await database.runAsync(
        `INSERT INTO mtrs (id, numero_mtr, data_entrada, origem, tipo_material, quantidade, motorista, placa_veiculo, observacoes, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          novoMTR.id,
          novoMTR.numero_mtr,
          novoMTR.data_entrada,
          novoMTR.origem,
          novoMTR.tipo_material,
          novoMTR.quantidade,
          novoMTR.motorista || null,
          novoMTR.placa_veiculo || null,
          novoMTR.observacoes || null,
          novoMTR.criado_em,
          novoMTR.atualizado_em,
        ]
      );

      console.log('✅ MTR criado:', id);
      return novoMTR;
    } catch (error) {
      console.error('❌ Erro ao criar MTR:', error);
      throw error;
    }
  },

  // MTR: Obter todos
  getAllMTRs: async (): Promise<MTR[]> => {
    try {
      const database = await getDatabase();
      const resultado = await database.getAllAsync<MTR>(
        `SELECT * FROM mtrs ORDER BY data_entrada DESC`
      );
      return resultado || [];
    } catch (error) {
      console.error('❌ Erro ao obter MTRs:', error);
      return [];
    }
  },

  // MTR: Obter por ID
  getMTRById: async (id: string): Promise<MTR | null> => {
    try {
      const database = await getDatabase();
      const resultado = await database.getFirstAsync<MTR>(
        `SELECT * FROM mtrs WHERE id = ?`,
        [id]
      );
      return resultado || null;
    } catch (error) {
      console.error('❌ Erro ao obter MTR:', error);
      return null;
    }
  },

  // ==================== LEIRAS ====================

  // LEIRA: Obter próximo número
  getProximoNumeroLeira: async (): Promise<number> => {
    try {
      const database = await getDatabase();
      const resultado = await database.getFirstAsync<{ numero: number }>(
        `SELECT MAX(numero) as numero FROM leiras`
      );
      return (resultado?.numero || 0) + 1;
    } catch (error) {
      console.error('❌ Erro ao obter próximo número de leira:', error);
      return 1;
    }
  },

  // LEIRA: Criar
  createLeira: async (leira: Omit<Leira, 'id' | 'criado_em' | 'atualizado_em'>): Promise<Leira> => {
    try {
      const database = await getDatabase();
      const id = Date.now().toString();
      const agora = new Date().toISOString();

      const novaLeira: Leira = {
        ...leira,
        id,
        criado_em: agora,
        atualizado_em: agora,
      };

      await database.runAsync(
        `INSERT INTO leiras (id, numero, data_criacao, mtrs_utilizadas, bagaco_quantidade, status, data_revolvimento, data_inicio_compostagem, data_inicio_repouso, data_conclusao, total_dias, progresso, temperatura_media_recente, ultima_medicao, precipitacao_total, observacoes, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          novaLeira.id,
          novaLeira.numero,
          novaLeira.data_criacao,
          JSON.stringify(novaLeira.mtrs_utilizadas),
          novaLeira.bagaco_quantidade,
          novaLeira.status,
          novaLeira.data_revolvimento || null,
          novaLeira.data_inicio_compostagem || null,
          novaLeira.data_inicio_repouso || null,
          novaLeira.data_conclusao || null,
          novaLeira.total_dias,
          novaLeira.progresso,
          novaLeira.temperatura_media_recente || null,
          novaLeira.ultima_medicao || null,
          novaLeira.precipitacao_total,
          novaLeira.observacoes || null,
          novaLeira.criado_em,
          novaLeira.atualizado_em,
        ]
      );

      console.log('✅ Leira criada:', id);
      return novaLeira;
    } catch (error) {
      console.error('❌ Erro ao criar Leira:', error);
      throw error;
    }
  },

  // LEIRA: Obter todas
  getAllLeiras: async (): Promise<Leira[]> => {
    try {
      const database = await getDatabase();
      const resultado = await database.getAllAsync<any>(
        `SELECT * FROM leiras ORDER BY numero DESC`
      );

      if (!resultado) return [];

      return resultado.map((leira) => ({
        ...leira,
        mtrs_utilizadas: JSON.parse(leira.mtrs_utilizadas || '[]'),
      }));
    } catch (error) {
      console.error('❌ Erro ao obter Leiras:', error);
      return [];
    }
  },

  // LEIRA: Obter por ID
  getLeitraById: async (id: string): Promise<Leira | null> => {
    try {
      const database = await getDatabase();
      const resultado = await database.getFirstAsync<any>(
        `SELECT * FROM leiras WHERE id = ?`,
        [id]
      );

      if (!resultado) return null;

      return {
        ...resultado,
        mtrs_utilizadas: JSON.parse(resultado.mtrs_utilizadas || '[]'),
      };
    } catch (error) {
      console.error('❌ Erro ao obter Leira:', error);
      return null;
    }
  },

  // LEIRA: Atualizar
  updateLeira: async (id: string, updates: Partial<Leira>): Promise<void> => {
    try {
      const database = await getDatabase();
      const agora = new Date().toISOString();

      const campos: string[] = [];
      const valores: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'criado_em') {
          campos.push(`${key} = ?`);
          if (Array.isArray(value)) {
            valores.push(JSON.stringify(value));
          } else {
            valores.push(value);
          }
        }
      });

      if (campos.length === 0) return;

      valores.push(agora);
      valores.push(id);

      await database.runAsync(
        `UPDATE leiras SET ${campos.join(', ')}, atualizado_em = ? WHERE id = ?`,
        valores
      );

      console.log('✅ Leira atualizada:', id);
    } catch (error) {
      console.error('❌ Erro ao atualizar Leira:', error);
      throw error;
    }
  },

  // ==================== MEDIÇÕES DE TEMPERATURA ====================

  // TEMPERATURA: Criar
  createMedicaoTemperatura: async (
    medicao: Omit<MedicaoTemperatura, 'id' | 'criado_em'>
  ): Promise<MedicaoTemperatura> => {
    try {
      const database = await getDatabase();
      const id = Date.now().toString();
      const agora = new Date().toISOString();

      const novaMedicao: MedicaoTemperatura = {
        ...medicao,
        id,
        criado_em: agora,
      };

      await database.runAsync(
        `INSERT INTO medicoes_temperatura (id, leira_id, data_medicao, ponto_1, ponto_2, ponto_3, temperatura_media, observacoes, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          novaMedicao.id,
          novaMedicao.leira_id,
          novaMedicao.data_medicao,
          novaMedicao.ponto_1,
          novaMedicao.ponto_2,
          novaMedicao.ponto_3,
          novaMedicao.temperatura_media,
          novaMedicao.observacoes || null,
          novaMedicao.criado_em,
        ]
      );

      console.log('✅ Medição de temperatura criada:', id);
      return novaMedicao;
    } catch (error) {
      console.error('❌ Erro ao criar medição:', error);
      throw error;
    }
  },

  // TEMPERATURA: Obter por Leira
  getMedicoesPorLeira: async (leira_id: string): Promise<MedicaoTemperatura[]> => {
    try {
      const database = await getDatabase();
      const resultado = await database.getAllAsync<MedicaoTemperatura>(
        `SELECT * FROM medicoes_temperatura WHERE leira_id = ? ORDER BY data_medicao DESC`,
        [leira_id]
      );
      return resultado || [];
    } catch (error) {
      console.error('❌ Erro ao obter medições:', error);
      return [];
    }
  },

  // ==================== REGISTROS DE CHUVA ====================

  // CHUVA: Criar (ATUALIZADO COM UMIDADE)
  createRegistroChuva: async (
    chuva: Omit<RegistroChuva, 'id' | 'criado_em'>
  ): Promise<RegistroChuva> => {
    try {
      const database = await getDatabase();
      const id = Date.now().toString();
      const agora = new Date().toISOString();

      const novoRegistro: RegistroChuva = {
        ...chuva,
        id,
        criado_em: agora,
      };

      await database.runAsync(
        `INSERT INTO registros_chuva (id, leira_id, data_chuva, milimetros, umidade, observacoes, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          novoRegistro.id,
          novoRegistro.leira_id,
          novoRegistro.data_chuva,
          novoRegistro.milimetros,
          novoRegistro.umidade || null, // Salva umidade
          novoRegistro.observacoes || null,
          novoRegistro.criado_em,
        ]
      );

      console.log('✅ Registro de chuva criado:', id);
      return novoRegistro;
    } catch (error) {
      console.error('❌ Erro ao criar registro de chuva:', error);
      throw error;
    }
  },

  // CHUVA: Obter por Leira
  getChuvasPorLeira: async (leira_id: string): Promise<RegistroChuva[]> => {
    try {
      const database = await getDatabase();
      const resultado = await database.getAllAsync<RegistroChuva>(
        `SELECT * FROM registros_chuva WHERE leira_id = ? ORDER BY data_chuva DESC`,
        [leira_id]
      );
      return resultado || [];
    } catch (error) {
      console.error('❌ Erro ao obter chuvas:', error);
      return [];
    }
  },

  // ==================== FUNÇÕES GERAIS ====================

  // Limpar banco de dados (desenvolvimento)
  resetDatabase: async (): Promise<void> => {
    try {
      const database = await getDatabase();
      await database.execAsync(`
        DELETE FROM registros_chuva;
        DELETE FROM medicoes_temperatura;
        DELETE FROM leiras;
        DELETE FROM mtrs;
      `);
      console.log('✅ Banco de dados limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar banco de dados:', error);
      throw error;
    }
  },
};