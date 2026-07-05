import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type AnimeItem } from '@/lib/api';
import { useColors } from '@/hooks/useColors';

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: '',             label: 'Semua',     icon: '🏠' },
  { id: 'hentai',      label: 'Hentai',    icon: '🎌' },
  { id: '3d-hentai',   label: '3D Hentai', icon: '🎲' },
  { id: 'jav',         label: 'JAV',       icon: '🎬' },
  { id: 'jav-cosplay', label: 'Cosplay',   icon: '👘' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

// ─── Genre chips ──────────────────────────────────────────────────────────────

const NEKO_GENRES = [
  { id: 'hentai',     label: 'Hentai' },
  { id: 'uncensored', label: 'Uncensored' },
  { id: 'censored',   label: 'Censored' },
  { id: 'milf',       label: 'MILF' },
  { id: 'ntr',        label: 'NTR' },
  { id: 'school',     label: 'School' },
  { id: 'romance',    label: 'Romance' },
  { id: 'yuri',       label: 'Yuri' },
  { id: 'yaoi',       label: 'Yaoi' },
  { id: 'vanilla',    label: 'Vanilla' },
  { id: 'rape',       label: 'Rape' },
  { id: 'ahegao',     label: 'Ahegao' },
  { id: 'anal',       label: 'Anal' },
  { id: 'bdsm',       label: 'BDSM' },
  { id: 'ecchi',      label: 'Ecchi' },
  { id: 'fantasy',    label: 'Fantasy' },
  { id: 'elf',        label: 'Elf' },
  { id: 'nurse',      label: 'Nurse' },
  { id: 'maid',       label: 'Maid' },
];

// ─── Card ─────────────────────────────────────────────────────────────────────

function GridCard({ item, onPress }: { item: AnimeItem; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Image
        source={{ uri: item.poster }}
        style={styles.gridPoster}
        contentFit="cover"
        recyclingKey={item.animeId}
      />
      <View style={styles.gridMeta}>
        <Text style={[styles.gridTitle, { color: colors.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HentaiScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [activeCategory, setActiveCategory] = useState<CategoryId>('');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['neko-list', activeCategory],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      api.neko.getPage(activeCategory, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam: number) =>
      (lastPage.animeList?.length ?? 0) > 0 ? lastPageParam + 1 : undefined,
  });

  const animeList: AnimeItem[] = data?.pages.flatMap((p) => p.animeList ?? []) ?? [];

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 60;

  const navigate = useCallback(
    (item: AnimeItem) => router.push(`/anime/${item.animeId}?ns=neko`),
    [],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCategoryChange = useCallback((id: CategoryId) => {
    setActiveCategory(id);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AnimeItem }) => (
      <GridCard item={item} onPress={() => navigate(item)} />
    ),
    [navigate],
  );

  const ListFooter = () => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Memuat lebih banyak...
          </Text>
        </View>
      );
    }
    if (!hasNextPage && animeList.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            ✓ Semua konten sudah dimuat ({animeList.length} film)
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 14, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.appName, { color: colors.primary }]}>猫</Text>
          <Text style={[styles.appSubtitle, { color: colors.mutedForeground }]}>
            NEKOPOI · Streaming
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/search?ns=neko')}
          style={[styles.searchBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="search" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* ── Category tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        style={[styles.tabsWrap, { borderBottomColor: colors.border, backgroundColor: colors.background }]}
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => handleCategoryChange(cat.id)}
              activeOpacity={0.75}
              style={[
                styles.tab,
                active
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={styles.tabIcon}>{cat.icon}</Text>
              <Text style={[styles.tabLabel, { color: active ? '#fff' : colors.foreground }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Genre chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreRow}
        style={[styles.genreWrap, { backgroundColor: colors.background }]}
      >
        {NEKO_GENRES.map((g) => (
          <TouchableOpacity
            key={g.id}
            onPress={() =>
              router.push(`/genre/${g.id}?title=${encodeURIComponent(g.label)}&ns=neko`)
            }
            style={[styles.genreChip, { backgroundColor: colors.muted, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.genreLabel, { color: colors.foreground }]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Content grid ── */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>Memuat konten...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centerBox}>
          <Feather name="wifi-off" size={36} color={colors.border} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>Gagal memuat konten</Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : animeList.length === 0 ? (
        <View style={styles.centerBox}>
          <Feather name="inbox" size={36} color={colors.border} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>Tidak ada konten</Text>
        </View>
      ) : (
        <FlatList<AnimeItem>
          data={animeList}
          keyExtractor={(item, i) => `${item.animeId}-${i}`}
          numColumns={2}
          columnWrapperStyle={styles.columnWrap}
          contentContainerStyle={[styles.gridContent, { paddingBottom: botPad }]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={renderItem}
          ListFooterComponent={<ListFooter />}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_GAP = 10;

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  appName: { fontSize: 32, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  appSubtitle: { fontSize: 10, fontFamily: 'Inter_500Medium', letterSpacing: 1.5, marginTop: -2 },
  searchBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  tabsWrap: { flexGrow: 0, borderBottomWidth: 1 },
  tabsRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  tabIcon: { fontSize: 14 },
  tabLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  genreWrap: { flexGrow: 0 },
  genreRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  genreChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  genreLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  gridContent: { paddingHorizontal: 12, paddingTop: 4 },
  columnWrap: { gap: CARD_GAP, marginBottom: CARD_GAP },
  gridCard: { flex: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 1 },
  gridPoster: { width: '100%', aspectRatio: 3 / 4 },
  gridMeta: { padding: 8 },
  gridTitle: { fontSize: 12, fontFamily: 'Inter_500Medium', lineHeight: 17 },

  centerBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingBottom: 80,
  },
  infoText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  footerLoader: {
    alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 20,
  },
  footerText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
