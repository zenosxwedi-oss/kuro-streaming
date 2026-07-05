import React, { useState, useRef, useCallback } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimeCard from '@/components/AnimeCard';
import { api, type AnimeItem } from '@/lib/api';
import { useColors } from '@/hooks/useColors';

export default function SearchScreen() {
  const { ns } = useLocalSearchParams<{ ns?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim());
    }, 500);
  }, []);

  const [mode, setMode] = useState<'anime' | 'neko'>(ns === 'neko' ? 'neko' : 'anime');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', debouncedQuery, mode],
    queryFn: () =>
      mode === 'neko'
        ? api.neko.search(debouncedQuery)
        : api.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const results = data?.animeList ?? [];
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        {/* Mode toggle */}
        <View style={[styles.modeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(['anime', 'neko'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[
                styles.modeBtn,
                { backgroundColor: mode === m ? colors.primary : 'transparent' },
              ]}
            >
              <Text style={[styles.modeBtnText, { color: mode === m ? '#fff' : colors.mutedForeground }]}>
                {m === 'anime' ? 'Anime' : 'Nekopoi'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} style={{ marginRight: 10 }} />
          <TextInput
            value={query}
            onChangeText={handleChange}
            placeholder={mode === 'neko' ? 'Cari hentai...' : 'Cari anime...'}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setDebouncedQuery(''); }}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {debouncedQuery.length < 2 ? (
        <View style={styles.empty}>
          <Feather name="search" size={48} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {mode === 'neko' ? 'Cari Hentai' : 'Cari Anime'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Ketik judul yang ingin kamu tonton
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.empty}>
          <Feather name="alert-circle" size={40} color={colors.destructive} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, marginTop: 8 }]}>
            Gagal memuat hasil pencarian
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="film" size={48} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Tidak ditemukan</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Coba kata kunci lain
          </Text>
        </View>
      ) : (
        <FlatList<AnimeItem>
          data={results}
          keyExtractor={(item) => item.animeId}
          numColumns={3}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <AnimeCard
              item={item}
              width={(340 - 48) / 3}
              onPress={() =>
                router.push(`/anime/${item.animeId}${mode === 'neko' ? '?ns=neko' : ''}`)
              }
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    padding: 0,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  grid: { padding: 16, gap: 12 },
  modeRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  modeBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
