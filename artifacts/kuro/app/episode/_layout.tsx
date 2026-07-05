import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function EpisodeLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
        headerShadowVisible: false,
        headerBackTitle: 'Kembali',
      }}
    >
      <Stack.Screen name="[episodeId]" options={{ title: 'Nonton' }} />
    </Stack>
  );
}
