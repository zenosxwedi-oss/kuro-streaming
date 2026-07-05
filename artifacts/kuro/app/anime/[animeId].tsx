import React, { useCallback } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimeCard from '@/components/AnimeCard';
import EpisodeItem from '@/components/EpisodeItem';
import { DetailSkeleton } from '@/components/SkeletonLoader';
import { useApp } from '@/context/AppContext';
import { api, type AnimeItem, type EpisodeListItem } from '@/lib/api';
import { useColors } from '@/hooks/useColors';

export default function AnimeDetailScreen() {
  const { animeId, ns } = useLocalSearchParams<{ animeId: string; ns?: string }>();
  const isNeko = ns === 'neko';
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addBookmark, removeBookmark, isBookmarked } = useApp();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['anime', animeId, isNeko],
    queryFn: () =>
      isNeko ? api.neko.getDetail(animeId!) : api.getAnimeDetail(animeId!),
    enabled: !!animeId,
  });

  const bookmarked = isBookmarked(animeId ?? '');

  const toggleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!data) return;
    if (bookmarked) {
      removeBookmark(animeId!);
    } else {
      addBookmark({ animeId: animeId!, title: data.title, poster: data.poster });
    }
  }, [bookmarked, data, animeId, addBookmark, removeBookmark]);

  const navigateEpisode = useCallback(
    (ep: EpisodeListItem) => {
      if (!data) return;
      const params = new URLSearchParams({
        animeId: animeId!,
        animeTitle: encodeURIComponent(data.title),
        poster: encodeURIComponent(data.poster),
        episodeTitle: encodeURIComponent(ep.title),
        ...(isNeko ? { ns: 'neko' } : {}),
      });
      router.push(`/episode/${ep.episodeId}?${params.toString()}`);
    },
    [data, animeId, isNeko]
  );

  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <DetailSkeleton />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          Gagal memuat data anime
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const synopsis =
    data.synopsis?.paragraphs?.filter(Boolean).join('\n\n') || '';

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: data.title,
          headerRight: () => (
            <TouchableOpacity
              onPress={toggleBookmark}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather
                name="bookmark"
                size={22}
                color={bookmarked ? colors.primary : colors.foreground}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 24 }}
      >
        {/* Hero */}
        <View style={styles.heroWrapper}>
          <Image
            source={{ uri: data.poster }}
            style={styles.heroBg}
            contentFit="cover"
            blurRadius={20}
          />
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.heroGrad}
          />
          <View style={styles.heroContent}>
            <Image
              source={{ uri: data.poster }}
              style={[styles.poster, { borderRadius: colors.radius }]}
              contentFit="cover"
            />
            <View style={styles.heroInfo}>
              {!!data.score && data.score !== '' && (
                <View style={[styles.scoreBadge, { backgroundColor: colors.primary }]}>
                  <Feather name="star" size={11} color="#fff" />
                  <Text style={styles.scoreText}>{data.score}</Text>
                </View>
              )}
              <View style={styles.metaRow}>
                {!!data.type && <MetaChip label={data.type} colors={colors} />}
                {!!data.status && <MetaChip label={data.status} colors={colors} />}
                {isNeko && <MetaChip label="18+" colors={colors} accent />}
              </View>
              {!!data.aired && (
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {data.aired}
                </Text>
              )}
              {!!data.duration && (
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {data.duration}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.foreground }]}>{data.title}</Text>
          {!!data.japanese && (
            <Text style={[styles.japanese, { color: colors.mutedForeground }]}>
              {data.japanese}
            </Text>
          )}

          {/* Genres */}
          {data.genreList.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.genreRow}
              contentContainerStyle={{ gap: 8 }}
            >
              {data.genreList.map((g) => (
                <TouchableOpacity
                  key={g.genreId}
                  onPress={() =>
                    router.push(
                      `/genre/${g.genreId}?title=${encodeURIComponent(g.title)}${isNeko ? '&ns=neko' : ''}`
                    )
                  }
                  style={[
                    styles.genreChip,
                    {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '18',
                    },
                  ]}
                >
                  <Text style={[styles.genreText, { color: colors.primary }]}>
                    {g.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Synopsis */}
          {!!synopsis && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Sinopsis
              </Text>
              <Text style={[styles.synopsis, { color: colors.mutedForeground }]}>
                {synopsis}
              </Text>
            </View>
          )}

          {/* Episodes */}
          {data.episodeList.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Episode ({data.episodeList.length})
              </Text>
              {[...data.episodeList].reverse().map((ep) => (
                <EpisodeItem
                  key={ep.episodeId}
                  item={ep}
                  onPress={() => navigateEpisode(ep)}
                />
              ))}
            </View>
          )}

          {/* Recommended */}
          {data.recommendedAnimeList.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Rekomendasi
              </Text>
              <FlatList<AnimeItem>
                horizontal
                data={data.recommendedAnimeList}
                keyExtractor={(item) => item.animeId}
                renderItem={({ item }) => (
                  <AnimeCard
                    item={item}
                    onPress={() =>
                      router.push(
                        `/anime/${item.animeId}${isNeko ? '?ns=neko' : ''}`
                      )
                    }
                  />
                )}
                showsHorizontalScrollIndicator={false}
                scrollEnabled={data.recommendedAnimeList.length > 2}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function MetaChip({
  label,
  colors,
  accent,
}: {
  label: string;
  colors: ReturnType<typeof useColors>;
  accent?: boolean;
}) {
  return (
    <View
      style={[
        styles.metaChip,
        {
          backgroundColor: accent ? colors.primary + '33' : colors.muted,
        },
      ]}
    >
      <Text
        style={[
          styles.metaChipText,
          { color: accent ? colors.primary : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  heroWrapper: { height: 280, position: 'relative', overflow: 'hidden' },
  heroBg: { ...StyleSheet.absoluteFillObject },
  heroGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 },
  heroContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  poster: { width: 110, height: 160 },
  heroInfo: { flex: 1, gap: 6, paddingBottom: 4 },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  scoreText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metaChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  metaChipText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  metaText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.4, marginBottom: 4 },
  japanese: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 14 },
  genreRow: { marginBottom: 16 },
  genreChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  genreText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  synopsis: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  errorText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
