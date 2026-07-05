import React, { useCallback } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimeCard from '@/components/AnimeCard';
import { AnimeCardSkeleton } from '@/components/SkeletonLoader';
import { api, type AnimeItem } from '@/lib/api';
import { useColors } from '@/hooks/useColors';

const GENRES = [
  { id: 'action', label: 'Action' },
  { id: 'romance', label: 'Romance' },
  { id: 'fantasy', label: 'Fantasy' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'drama', label: 'Drama' },
  { id: 'horror', label: 'Horror' },
  { id: 'ecchi', label: 'Ecchi' },
  { id: 'hentai', label: 'Hentai' },
  { id: 'sci-fi', label: 'Sci-Fi' },
  { id: 'isekai', label: 'Isekai' },
  { id: 'slice-of-life', label: 'Slice of Life' },
  { id: 'supernatural', label: 'Supernatural' },
];

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>Lihat Semua</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const {
    data: ongoingData,
    isLoading: loadingOngoing,
    refetch: refetchOngoing,
    isRefetching: refetchingOngoing,
  } = useQuery({
    queryKey: ['ongoing'],
    queryFn: () => api.getOngoing(),
  });

  const {
    data: completeData,
    isLoading: loadingComplete,
    refetch: refetchComplete,
    isRefetching: refetchingComplete,
  } = useQuery({
    queryKey: ['complete'],
    queryFn: () => api.getComplete(),
  });

  const onRefresh = useCallback(() => {
    refetchOngoing();
    refetchComplete();
  }, [refetchOngoing, refetchComplete]);

  const isRefreshing = refetchingOngoing || refetchingComplete;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 60;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: botPad }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <View>
          <Text style={[styles.appName, { color: colors.primary }]}>黒</Text>
          <Text style={[styles.appSubtitle, { color: colors.mutedForeground }]}>KURO · Anime Streaming</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/search')}
          style={[styles.searchBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="search" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Genre chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreScroll}
        style={{ marginBottom: 24 }}
      >
        {GENRES.map((g) => (
          <TouchableOpacity
            key={g.id}
            onPress={() => router.push(`/genre/${g.id}?title=${encodeURIComponent(g.label)}`)}
            style={[styles.genreChip, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.genreLabel, { color: colors.foreground }]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Ongoing Anime */}
      <SectionHeader
        title="Sedang Tayang"
        onSeeAll={() => router.push('/genre/action?title=Action')}
      />
      {loadingOngoing ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {[1, 2, 3, 4].map((i) => <AnimeCardSkeleton key={i} />)}
        </ScrollView>
      ) : (
        <FlatList<AnimeItem>
          horizontal
          data={ongoingData?.animeList ?? []}
          keyExtractor={(item) => item.animeId}
          renderItem={({ item }) => (
            <AnimeCard item={item} onPress={() => router.push(`/anime/${item.animeId}`)} />
          )}
          contentContainerStyle={styles.horizontalList}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!!(ongoingData?.animeList?.length)}
          ListEmptyComponent={<EmptySection />}
        />
      )}

      {/* Completed Anime */}
      <SectionHeader title="Selesai Tayang" />
      {loadingComplete ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {[1, 2, 3, 4].map((i) => <AnimeCardSkeleton key={i} />)}
        </ScrollView>
      ) : (
        <FlatList<AnimeItem>
          horizontal
          data={completeData?.animeList ?? []}
          keyExtractor={(item) => item.animeId}
          renderItem={({ item }) => (
            <AnimeCard item={item} onPress={() => router.push(`/anime/${item.animeId}`)} />
          )}
          contentContainerStyle={styles.horizontalList}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!!(completeData?.animeList?.length)}
          ListEmptyComponent={<EmptySection />}
        />
      )}

      {/* Browse by Genre */}
      <View style={[styles.browseSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.browseSectionTitle, { color: colors.foreground }]}>Jelajahi Genre</Text>
        <View style={styles.browseGrid}>
          {GENRES.slice(0, 8).map((g) => (
            <TouchableOpacity
              key={g.id}
              onPress={() => router.push(`/genre/${g.id}?title=${encodeURIComponent(g.label)}`)}
              style={[styles.browseChip, { backgroundColor: colors.muted }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.browseChipText, { color: colors.foreground }]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function EmptySection() {
  const colors = useColors();
  return (
    <View style={styles.emptySection}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  appSubtitle: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 1.5,
    marginTop: -2,
  },
  searchBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  genreScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  genreLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  horizontalList: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  emptySection: {
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  browseSection: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  browseSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
  },
  browseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  browseChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  browseChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
});
