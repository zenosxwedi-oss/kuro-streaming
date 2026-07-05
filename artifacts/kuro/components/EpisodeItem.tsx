import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { EpisodeListItem } from '@/lib/api';

interface Props {
  item: EpisodeListItem;
  onPress: () => void;
}

export default function EpisodeItem({ item, onPress }: Props) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.epNum, { backgroundColor: colors.primary + '22' }]}>
        <Text style={[styles.epNumText, { color: colors.primary }]}>{item.eps}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          Episode {item.eps}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{item.date}</Text>
      </View>
      <Feather name="play-circle" size={22} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  epNum: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  epNumText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
