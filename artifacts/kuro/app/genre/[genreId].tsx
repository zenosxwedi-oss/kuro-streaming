import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import AnimeCard from '@/components/AnimeCard';
import { api, type AnimeItem } from '@/lib/api';
import { useColors } from '@/hooks/useColors';

const safeDecode = (s?: string) => {
  if (!s) return '';
  try { return decodeURIComponent(s); } catch { return s; }
};

export default function GenreScreen() {
  const { genreId, title, ns } = useLocalSearchParams<{ genreId: string; title?: string; ns?: string }>();
  const isNeko = ns === 'neko';
  const colors = useColors();
  const label = safeDecode(title) || genreId || '';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['genre', genreId, isNeko],
    queryFn: () =>
      isNeko ? api.neko.getGenre(genreId!) : api.getGenre(genreId!),
    enabled: !!genreId,
  });

  const items = data?.animeList ?? [];

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: label }} />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={36} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Gagal memuat genre</Text>
          <TouchableOpacity onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList<AnimeItem>
          data={items}
          keyExtractor={(item) => item.animeId}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <AnimeCard
              item={item}
              width={104}
              onPress={() =>
                router.push(`/anime/${item.animeId}${isNeko ? '?ns=neko' : ''}`)
              }
            />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="film" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tidak ada anime</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  grid: { padding: 16, paddingBottom: 32 },
  row: { gap: 12, marginBottom: 16 },
  errorText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
