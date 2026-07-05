import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonBoxProps) {
  const colors = useColors();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true);
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.muted },
        animStyle,
        style,
      ]}
    />
  );
}

export function AnimeCardSkeleton({ width = 130 }: { width?: number }) {
  const colors = useColors();
  return (
    <View style={{ width, marginRight: 12 }}>
      <SkeletonBox width={width} height={width * 1.5} borderRadius={12} style={{ marginBottom: 8 }} />
      <SkeletonBox width={width * 0.9} height={12} style={{ marginBottom: 4 }} />
      <SkeletonBox width={width * 0.6} height={10} />
    </View>
  );
}

export function DetailSkeleton() {
  const colors = useColors();
  return (
    <View style={{ padding: 16 }}>
      <SkeletonBox width="100%" height={300} borderRadius={16} style={{ marginBottom: 16 }} />
      <SkeletonBox width="70%" height={24} style={{ marginBottom: 8 }} />
      <SkeletonBox width="50%" height={16} style={{ marginBottom: 16 }} />
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonBox key={i} width="100%" height={60} borderRadius={12} style={{ marginBottom: 8 }} />
      ))}
    </View>
  );
}
