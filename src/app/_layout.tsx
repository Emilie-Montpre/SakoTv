import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { queryClient } from '@/api/query-client';
import { DatabaseGate } from '@/db/database-gate';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <QueryClientProvider client={queryClient}>
      <DatabaseGate>
        <StatusBar style="auto" translucent={false} backgroundColor={theme.background} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="title/[id]" />
          <Stack.Screen name="import" options={{ presentation: 'modal', headerShown: true, title: 'Import TV Time' }} />
        </Stack>
        {/* Android edge-to-edge can't be disabled (forced since Android 15, and app.json's
            androidStatusBar.translucent needs a native rebuild Expo Go can't apply) — paint an
            opaque strip behind the status bar icons ourselves instead, on top of every screen. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            backgroundColor: theme.background,
            zIndex: 999,
          }}
        />
      </DatabaseGate>
    </QueryClientProvider>
  );
}
