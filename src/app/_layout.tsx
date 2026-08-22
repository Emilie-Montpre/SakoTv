import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { queryClient } from '@/api/query-client';
import { DatabaseGate } from '@/db/database-gate';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <DatabaseGate>
        <StatusBar style="auto" translucent backgroundColor="transparent" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="title/[id]" />
          <Stack.Screen name="import" options={{ presentation: 'modal', headerShown: true, title: 'Import TV Time' }} />
        </Stack>
      </DatabaseGate>
    </QueryClientProvider>
  );
}
