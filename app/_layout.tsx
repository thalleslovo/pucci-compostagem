// app/_layout.tsx

import { Stack } from 'expo-router';
import { COLORS } from '@/utils/constants';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Auth Stack */}
      <Stack.Screen
        name="(auth)"
        options={{
          headerShown: false,
        }}
      />

      {/* App Stack */}
      <Stack.Screen
        name="(app)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}