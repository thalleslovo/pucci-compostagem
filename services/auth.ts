// services/auth.ts

import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'pucci_pin_secure';

export const authService = {
  // Definir PIN (primeira vez)
  setPIN: async (pin: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(PIN_KEY, pin);
      console.log('✅ PIN armazenado com segurança');
    } catch (error) {
      console.error('❌ Erro ao armazenar PIN:', error);
      throw error;
    }
  },

  // Verificar se PIN foi definido
  hasPIN: async (): Promise<boolean> => {
    try {
      const pin = await SecureStore.getItemAsync(PIN_KEY);
      const result = pin !== null && pin !== undefined && pin !== '';
      console.log('Verificando PIN:', result);
      return result;
    } catch (error) {
      console.error('❌ Erro ao verificar PIN:', error);
      return false;
    }
  },

  // Validar PIN (login)
  validatePIN: async (pin: string): Promise<boolean> => {
    try {
      const storedPin = await SecureStore.getItemAsync(PIN_KEY);
      
      if (!storedPin) {
        console.warn('⚠️ Nenhum PIN armazenado');
        return false;
      }

      // Converter para string explicitamente
      const pinString = String(storedPin).trim();
      const inputPin = String(pin).trim();
      const isValid = pinString === inputPin;
      
      if (isValid) {
        console.log('✅ PIN válido');
      } else {
        console.warn('❌ PIN inválido');
      }

      return isValid;
    } catch (error) {
      console.error('❌ Erro ao validar PIN:', error);
      return false;
    }
  },

  // Alterar PIN (opcional para futuro)
  changePIN: async (oldPin: string, newPin: string): Promise<boolean> => {
    try {
      const isValid = await authService.validatePIN(oldPin);

      if (!isValid) {
        console.warn('❌ PIN antigo incorreto');
        return false;
      }

      await authService.setPIN(newPin);
      console.log('✅ PIN alterado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao alterar PIN:', error);
      return false;
    }
  },

  // Remover PIN (logout/reset)
  removePIN: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(PIN_KEY);
      console.log('✅ PIN removido');
    } catch (error) {
      console.error('❌ Erro ao remover PIN:', error);
      throw error;
    }
  },
};