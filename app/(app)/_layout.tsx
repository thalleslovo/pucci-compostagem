// app/(app)/_layout.tsx

import React, { useEffect } from 'react';
import { useRouter, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { authService } from '@/services/auth';
import { COLORS } from '@/utils/constants';

export default function AppLayout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const hasPIN = await authService.hasPIN();
        setIsAuthenticated(hasPIN);

        if (!hasPIN) {
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        router.replace('/(auth)/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Mostrar loading
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Se não autenticado
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.white,
        },
        headerTintColor: COLORS.primary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: COLORS.text,
        },
      }}
    >
      {/* Tela Home */}
      <Stack.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerShown: false,
        }}
      />

      {/* Tela Nova Leira */}
      <Stack.Screen
        name="nova-leira"
        options={{
          title: 'Nova Leira',
          headerBackTitle: 'Voltar',
        }}
      />

      {/* Tela Detalhes da Leira */}
      <Stack.Screen
        name="detalhes-leira"
        options={{
          title: 'Detalhes da Leira',
          headerBackTitle: 'Voltar',
        }}
      />

      {/* Tela Entrada de Material */}
      <Stack.Screen
        name="entrada-material"
        options={{
          title: 'Entrada de Material',
          headerBackTitle: 'Voltar',
        }}
      />

      {/* Tela Medição de Temperatura */}
      <Stack.Screen
        name="medicao-temperatura"
        options={{
          title: 'Medição de Temperatura',
          headerBackTitle: 'Voltar',
        }}
      />

      {/* Tela Registro de Chuva */}
      <Stack.Screen
        name="registro-chuva"
        options={{
          title: 'Registro de Chuva',
          headerBackTitle: 'Voltar',
        }}
      />

      {/* Tela Relatórios */}
      <Stack.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          headerBackTitle: 'Voltar',
        }}
      />
    </Stack>
  );
}