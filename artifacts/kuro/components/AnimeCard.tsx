import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import type { AnimeItem } from '@/lib/api';

interface Props {
  item: AnimeItem;
  onPress: () => void;
  width?: number;
}

export default function AnimeCard({ item, onPress, width = 130 }: Props) {
  const colors = useColors();
  const height = width * 1.5;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.container, { width, marginRight: 12 }]}
    >
      <View style={[styles.posterWrapper, { width, height, borderRadius: colors.radius, backgroundColor: colors.card }]}>
        <Image
          source={{ uri: item.poster }}
          style={[styles.poster, { borderRadius: colors.radius }]}
          contentFit="cover"
          transition={200}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={[styles.gradient, { borderRadius: colors.radius }]}
        />
        {item.episodes != null && (
          <View style={styles.epsBadge}>
            <Text style={styles.epsBadgeText}>{item.episodes} EP</Text>
          </View>
        )}
        {!!item.score && item.score !== '' && (
          <View style={[styles.scoreBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.scoreBadgeText}>{item.score}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
        {item.title}
      </Text>
      {!!item.latestReleaseDate && (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
          {item.releaseDay ? `${item.releaseDay} · ` : ''}{item.latestReleaseDate}
        </Text>
      )}
      {!!item.lastReleaseDate && !item.latestReleaseDate && (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
          {item.lastReleaseDate}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  posterWrapper: {
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  epsBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  epsBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  scoreBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  scoreBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  title: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 17,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
});
