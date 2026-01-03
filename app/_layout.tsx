import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { GameProvider } from '@/context/GameContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeDatabase } from '@/services/database';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setIsDbReady(true))
      .catch((error) => {
        console.error('Failed to initialize database:', error);
        // Still allow app to load even if DB fails
        setIsDbReady(true);
      });
  }, []);

  if (!isDbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GameProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="project/[id]" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </GameProvider>
    </ThemeProvider>
  );
}
