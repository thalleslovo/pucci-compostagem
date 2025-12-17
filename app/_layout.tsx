import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/utils/constants';
import { iniciarSyncPeriodico, pararSyncPeriodico } from '../services/background-sync';

export default function RootLayout() {
  useEffect(() => {
    // ✅ INICIAR SINCRONIZAÇÃO PERIÓDICA
    iniciarSyncPeriodico();

    // ✅ PARAR AO DESMONTAR
    return () => {
      pararSyncPeriodico();
    };
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="(auth)"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="(app)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}