import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, type BookmarkItem, type HistoryItem } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

type Tab = 'bookmarks' | 'history';

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bookmarks, history, removeBookmark, clearHistory } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('bookmarks');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleClearHistory = () => {
    Alert.alert('Hapus Riwayat', 'Yakin ingin menghapus semua riwayat tontonan?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: clearHistory },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Library</Text>
        {activeTab === 'history' && history.length > 0 && (
          <TouchableOpacity onPress={handleClearHistory}>
            <Feather name="trash-2" size={20} color={colors.destructive} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(['bookmarks', 'history'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabBtn,
              activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.primary : colors.mutedForeground },
              ]}
            >
              {tab === 'bookmarks' ? 'Tersimpan' : 'Riwayat'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'bookmarks' ? (
        bookmarks.length === 0 ? (
          <EmptyState icon="bookmark" title="Belum ada tontonan tersimpan" text="Simpan anime favoritmu di sini" />
        ) : (
          <FlatList<BookmarkItem>
            data={bookmarks}
            keyExtractor={(item) => item.animeId}
            contentContainerStyle={{ padding: 16, paddingBottom: botPad + 80 }}
            renderItem={({ item }) => (
              <LibraryRow
                poster={item.poster}
                title={item.title}
                subtitle={new Date(item.savedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                onPress={() => router.push(`/anime/${item.animeId}`)}
                rightAction={
                  <TouchableOpacity onPress={() => removeBookmark(item.animeId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="x" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                }
                colors={colors}
              />
            )}
          />
        )
      ) : history.length === 0 ? (
        <EmptyState icon="clock" title="Belum ada riwayat" text="Anime yang kamu tonton akan muncul di sini" />
      ) : (
        <FlatList<HistoryItem>
          data={history}
          keyExtractor={(item) => item.episodeId + item.watchedAt}
          contentContainerStyle={{ padding: 16, paddingBottom: botPad + 80 }}
          renderItem={({ item }) => (
            <LibraryRow
              poster={item.poster}
              title={item.animeTitle}
              subtitle={item.episodeTitle}
              onPress={() => router.push(`/episode/${item.episodeId}?animeId=${item.animeId}&animeTitle=${encodeURIComponent(item.animeTitle)}&poster=${encodeURIComponent(item.poster)}`)}
              colors={colors}
            />
          )}
        />
      )}
    </View>
  );
}

function LibraryRow({
  poster,
  title,
  subtitle,
  onPress,
  rightAction,
  colors,
}: {
  poster: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  rightAction?: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Image source={{ uri: poster }} style={styles.rowPoster} contentFit="cover" />
      <View style={styles.rowInfo}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={2}>{title}</Text>
        <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      {rightAction}
    </TouchableOpacity>
  );
}

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <Feather name={icon as any} size={48} color={colors.border} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  tabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginRight: 24,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    padding: 10,
    gap: 12,
  },
  rowPoster: {
    width: 56,
    height: 80,
    borderRadius: 8,
  },
  rowInfo: { flex: 1 },
  rowTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
    lineHeight: 19,
  },
  rowSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
