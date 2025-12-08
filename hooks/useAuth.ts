import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OPERADORES } from '@/config/operadores';

export interface OperadorLogado {
  id: string;
  nome: string;
  loginTime: number;
}

export const useAuth = () => {
  const [operador, setOperador] = useState<OperadorLogado | null>(null);
  const [loading, setLoading] = useState(true);

  // ===== CARREGAR SESSÃO AO INICIAR =====
  useEffect(() => {
    verificarSessao();
  }, []);

  // ===== VERIFICAR SE TEM SESSÃO ATIVA =====
  const verificarSessao = async () => {
    try {
      const sessaoSalva = await AsyncStorage.getItem('operadorLogado');
      
      if (sessaoSalva) {
        const operadorSalvo: OperadorLogado = JSON.parse(sessaoSalva);
        
        // ✅ VERIFICAR SE SESSÃO AINDA É VÁLIDA (24 horas)
        const agora = Date.now();
        const tempoDecorrido = agora - operadorSalvo.loginTime;
        const horasEm24 = 24 * 60 * 60 * 1000;
        
        if (tempoDecorrido < horasEm24) {
          setOperador(operadorSalvo);
          console.log(`✅ Sessão restaurada: ${operadorSalvo.nome}`);
        } else {
          // ❌ SESSÃO EXPIRADA
          await AsyncStorage.removeItem('operadorLogado');
          console.log('⏰ Sessão expirada');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===== LOGIN COM PIN =====
  const login = async (pin: string): Promise<boolean> => {
    try {
      console.log('🔐 Tentando login com PIN...');

      // ✅ PROCURAR OPERADOR COM ESTE PIN
      const operadorEncontrado = OPERADORES.find(
        (op) => op.pin === pin && op.ativo
      );

      if (!operadorEncontrado) {
        console.error('❌ PIN inválido');
        return false;
      }

      // ✅ CRIAR SESSÃO
      const novaOperador: OperadorLogado = {
        id: operadorEncontrado.id,
        nome: operadorEncontrado.nome,
        loginTime: Date.now(),
      };

      // ✅ SALVAR SESSÃO
      await AsyncStorage.setItem(
        'operadorLogado',
        JSON.stringify(novaOperador)
      );

      setOperador(novaOperador);

      console.log(`✅ Login bem-sucedido: ${operadorEncontrado.nome}`);
      return true;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return false;
    }
  };

  // ===== LOGOUT =====
  const logout = async (): Promise<void> => {
    try {
      console.log('👋 Fazendo logout...');

      await AsyncStorage.removeItem('operadorLogado');
      setOperador(null);

      console.log('✅ Logout bem-sucedido');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return {
    operador,
    loading,
    login,
    logout,
    isLogado: !!operador,
  };
};