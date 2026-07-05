import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function GenreLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
        headerShadowVisible: false,
        headerBackTitle: 'Kembali',
      }}
    >
      <Stack.Screen name="[genreId]" />
    </Stack>
  );
}
