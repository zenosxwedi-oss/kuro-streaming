import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VideoPlayer from '@/components/VideoPlayer';
import { useApp } from '@/context/AppContext';
import { api, type Quality } from '@/lib/api';
import { useColors } from '@/hooks/useColors';

const { width: SCREEN_W } = Dimensions.get('window');
const PLAYER_H = Math.round(SCREEN_W * (9 / 16));

const safeDecode = (s?: string) => {
  if (!s) return '';
  try { return decodeURIComponent(s); } catch { return s; }
};

export default function EpisodeScreen() {
  const {
    episodeId,
    animeId,
    animeTitle,
    poster,
    episodeTitle,
    ns,
  } = useLocalSearchParams<{
    episodeId: string;
    animeId?: string;
    animeTitle?: string;
    poster?: string;
    episodeTitle?: string;
    ns?: string;           // 'neko' → use nekopoi API
  }>();

  const isNeko = ns === 'neko';
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addHistory } = useApp();

  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [loadingServer, setLoadingServer] = useState<string>('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['episode', episodeId, isNeko],
    queryFn: () =>
      isNeko
        ? api.neko.getEpisode(episodeId!)
        : api.getEpisode(episodeId!),
    enabled: !!episodeId,
  });

  // Reset state whenever episode changes, then apply defaults from fresh data
  useEffect(() => {
    setActiveUrl('');
    setSelectedQuality('');
    setLoadingServer('');
  }, [episodeId]);

  useEffect(() => {
    if (!data) return;
    setActiveUrl(data.defaultStreamingUrl ?? '');
    setSelectedQuality(data.server.qualities[0]?.title ?? '');
  }, [data]);

  // Add to watch history
  useEffect(() => {
    if (data && animeId && animeTitle && poster) {
      addHistory({
        episodeId: episodeId!,
        animeId,
        animeTitle: safeDecode(animeTitle),
        poster: safeDecode(poster),
        episodeTitle: episodeTitle
          ? safeDecode(episodeTitle)
          : (data?.title || ''),
      });
    }
  }, [data]);

  const handleServerPick = useCallback(
    async (serverId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoadingServer(serverId);
      try {
        const result = isNeko
          ? await api.neko.getServer(serverId)
          : await api.getServer(serverId);
        if (result?.url) setActiveUrl(result.url);
      } catch {
        // keep current url
      } finally {
        setLoadingServer('');
      }
    },
    [isNeko]
  );

  const navigateEpisode = useCallback(
    (epId: string) => {
      const base = `/episode/${epId}`;
      const q = new URLSearchParams({
        ...(animeId ? { animeId } : {}),
        ...(animeTitle ? { animeTitle } : {}),
        ...(poster ? { poster } : {}),
        ...(isNeko ? { ns: 'neko' } : {}),
      }).toString();
      router.replace((q ? `${base}?${q}` : base) as never);
    },
    [animeId, animeTitle, poster, isNeko]
  );

  const activeQuality: Quality | undefined = useMemo(
    () => data?.server.qualities.find((q) => q.title === selectedQuality),
    [data, selectedQuality]
  );

  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const displayTitle = safeDecode(animeTitle);
  const epLabel = data?.title || safeDecode(episodeTitle) || '';

  return (
    <View style={[styles.root, { backgroundColor: '#000' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Stack.Screen options={{ title: displayTitle || 'Nonton', headerStyle: { backgroundColor: '#000' }, headerTintColor: '#fff' }} />

      {/* ── In-app video player ── */}
      <View style={[styles.playerWrap, { height: PLAYER_H }]}>
        {isLoading ? (
          <View style={styles.playerPlaceholder}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.playerLoadText}>Memuat episode...</Text>
          </View>
        ) : isError || !data ? (
          <View style={styles.playerPlaceholder}>
            <Feather name="alert-circle" size={36} color={colors.primary} />
            <Text style={styles.playerLoadText}>Gagal memuat</Text>
            <TouchableOpacity onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.retryText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : activeUrl ? (
          <VideoPlayer url={activeUrl} title={epLabel} />
        ) : (
          <View style={styles.playerPlaceholder}>
            <Feather name="play-circle" size={48} color={colors.primary} />
            <Text style={styles.playerLoadText}>Pilih server di bawah</Text>
          </View>
        )}
      </View>

      {/* ── Controls below player ── */}
      <ScrollView
        style={[styles.controls, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: botPad + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Episode title */}
        <View style={[styles.epHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.epTitle, { color: colors.foreground }]} numberOfLines={2}>
            {isLoading ? 'Memuat...' : epLabel}
          </Text>
          {!!data?.releaseTime && (
            <Text style={[styles.releaseTime, { color: colors.mutedForeground }]}>{data.releaseTime}</Text>
          )}
        </View>

        {data && (
          <View style={styles.body}>
            {/* Quality selector */}
            {data.server.qualities.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>KUALITAS</Text>
                <View style={styles.chipRow}>
                  {data.server.qualities.map((q) => (
                    <TouchableOpacity
                      key={q.title}
                      onPress={() => setSelectedQuality(q.title)}
                      style={[
                        styles.chip,
                        {
                          borderColor: selectedQuality === q.title ? colors.primary : colors.border,
                          backgroundColor: selectedQuality === q.title ? colors.primary + '22' : colors.card,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: selectedQuality === q.title ? colors.primary : colors.mutedForeground }]}>
                        {q.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Server list */}
            {activeQuality && activeQuality.serverList.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SERVER</Text>
                <View style={styles.serverGrid}>
                  {activeQuality.serverList.map((srv) => {
                    const isActive = activeUrl && loadingServer === '' && false; // placeholder
                    return (
                      <TouchableOpacity
                        key={srv.serverId}
                        onPress={() => handleServerPick(srv.serverId)}
                        disabled={loadingServer === srv.serverId}
                        style={[styles.serverBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                        activeOpacity={0.7}
                      >
                        {loadingServer === srv.serverId ? (
                          <ActivityIndicator color={colors.primary} size="small" />
                        ) : (
                          <>
                            <Feather name="play" size={13} color={colors.primary} />
                            <Text style={[styles.serverText, { color: colors.foreground }]}>
                              {srv.title.trim()}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Download links */}
            {data.downloadUrl && data.downloadUrl.qualities.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DOWNLOAD</Text>
                {data.downloadUrl.qualities.map((dq) => (
                  <View key={dq.title} style={styles.downloadRow}>
                    <View style={[styles.dlQualityBadge, { backgroundColor: colors.primary + '22' }]}>
                      <Text style={[styles.dlQualityText, { color: colors.primary }]}>{dq.title.replace('Mp4_', '')} · {dq.size}</Text>
                    </View>
                    <View style={styles.dlLinks}>
                      {dq.urls.map((u) => (
                        <TouchableOpacity
                          key={u.url}
                          onPress={() => setActiveUrl(u.url)}
                          style={[styles.dlBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                        >
                          <Feather name="download" size={12} color={colors.mutedForeground} />
                          <Text style={[styles.dlBtnText, { color: colors.mutedForeground }]}>{u.title}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Prev / Next */}
            <View style={[styles.navRow, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => data.prevEpisode && navigateEpisode(data.prevEpisode)}
                disabled={!data.hasPrevEpisode}
                style={[styles.navBtn, { backgroundColor: data.hasPrevEpisode ? colors.card : colors.muted, borderColor: colors.border }]}
              >
                <Feather name="chevron-left" size={20} color={data.hasPrevEpisode ? colors.foreground : colors.border} />
                <Text style={[styles.navText, { color: data.hasPrevEpisode ? colors.foreground : colors.border }]}>Sebelumnya</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => data.nextEpisode && navigateEpisode(data.nextEpisode)}
                disabled={!data.hasNextEpisode}
                style={[styles.navBtn, { backgroundColor: data.hasNextEpisode ? colors.primary : colors.muted, borderColor: data.hasNextEpisode ? colors.primary : colors.border }]}
              >
                <Text style={[styles.navText, { color: data.hasNextEpisode ? '#fff' : colors.border }]}>Selanjutnya</Text>
                <Feather name="chevron-right" size={20} color={data.hasNextEpisode ? '#fff' : colors.border} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  playerWrap: { width: '100%', backgroundColor: '#000' },
  playerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#000' },
  playerLoadText: { color: '#888', fontSize: 13, fontFamily: 'Inter_400Regular' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  controls: { flex: 1 },
  epHeader: { padding: 16, borderBottomWidth: 1 },
  epTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', lineHeight: 21, marginBottom: 4 },
  releaseTime: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  body: { padding: 16 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  serverGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 10, borderWidth: 1, minWidth: 90,
  },
  serverText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  downloadRow: { marginBottom: 12 },
  dlQualityBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  dlQualityText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  dlLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dlBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1,
  },
  dlBtnText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 8, paddingTop: 20, borderTopWidth: 1 },
  navBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1,
  },
  navText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
