import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

// Rarity colors for drop display
const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  rare: "#3B82F6",
  epic: "#8B5CF6",
  legendary: "#F59E0B",
  mythic: "#EF4444",
};

interface CompletionAnimationProps {
  onComplete?: () => void;
  visible: boolean;
  xp?: number;
  galleons?: number;
  drop?: {
    name: string;
    icon: string | null;
    rarity: string;
  };
}

const PARTICLE_COUNT = 20;
const COLORS = ["#FFD700", "#FFA500", "#FF4500", "#32CD32", "#4169E1"];

const Particle = ({ delay, index }: { delay: number; index: number }) => {
  const angle = (Math.PI * 2 * index) / PARTICLE_COUNT;

  // Memoize random values so they don't change on re-renders
  const { radius, randomX, randomY } = useMemo(
    () => ({
      radius: Math.random() * 150 + 50,
      randomX: Math.random() * 40 - 20,
      randomY: Math.random() * 40 - 20,
    }),
    [],
  );

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    // Randomize endpoint slightly for more natural look
    const finalX = Math.cos(angle) * radius + randomX;
    const finalY = Math.sin(angle) * radius + randomY;

    translateX.value = withDelay(
      delay,
      withTiming(finalX, { duration: 800, easing: Easing.out(Easing.quad) }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(finalY, { duration: 800, easing: Easing.out(Easing.quad) }),
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(400, withTiming(0, { duration: 300 })),
      ),
    );
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.5, { duration: 600 }),
      ),
    );
  }, [
    angle,
    delay,
    radius,
    randomX,
    randomY,
    opacity,
    scale,
    translateX,
    translateY,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const color = COLORS[index % COLORS.length];

  return (
    <Animated.View
      style={[styles.particle, { backgroundColor: color }, animatedStyle]}
    />
  );
};

export function CompletionAnimation({
  onComplete,
  visible,
  xp,
  galleons,
  drop,
}: CompletionAnimationProps) {
  // Backdrop opacity
  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const rewardsOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(0.5, { duration: 300 });
      scale.value = withSpring(1);
      // Delay rewards appearance for dramatic effect
      rewardsOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));

      // Auto hide after animation
      const timeout = setTimeout(() => {
        backdropOpacity.value = withTiming(0, { duration: 300 });
        rewardsOpacity.value = withTiming(0, { duration: 200 });
        if (onComplete) {
          onComplete();
        }
      }, 3000); // Extended to 3s to show rewards
      return () => clearTimeout(timeout);
    } else {
      backdropOpacity.value = 0;
      scale.value = 0;
      rewardsOpacity.value = 0;
    }
  }, [visible, backdropOpacity, scale, rewardsOpacity, onComplete]);

  const rewardsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rewardsOpacity.value,
  }));

  if (!visible) return null;

  const dropColor = drop
    ? RARITY_COLORS[drop.rarity] || RARITY_COLORS.common
    : "#FFF";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      <View style={styles.centerContainer}>
        {/* Main Badge */}
        <Animated.View style={[styles.badge, { transform: [{ scale }] }]}>
          <Animated.Text style={styles.text}>QUEST COMPLETE!</Animated.Text>
        </Animated.View>

        {/* Rewards Section */}
        <Animated.View style={[styles.rewardsContainer, rewardsAnimatedStyle]}>
          {/* XP and Galleons */}
          <View style={styles.rewardsRow}>
            {xp !== undefined && xp > 0 && (
              <View style={styles.rewardItem}>
                <Text style={styles.rewardIcon}>⭐</Text>
                <Text style={styles.rewardValue}>+{xp} XP</Text>
              </View>
            )}
            {galleons !== undefined && galleons > 0 && (
              <View style={styles.rewardItem}>
                <Text style={styles.rewardIcon}>💰</Text>
                <Text style={styles.rewardValue}>+{galleons}</Text>
              </View>
            )}
          </View>

          {/* Drop Item */}
          {drop && (
            <View style={[styles.dropContainer, { borderColor: dropColor }]}>
              <Text style={styles.dropIcon}>{drop.icon || "🎁"}</Text>
              <Text style={[styles.dropName, { color: dropColor }]}>
                {drop.name}
              </Text>
              <Text style={[styles.dropRarity, { color: dropColor }]}>
                {drop.rarity.toUpperCase()}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Particles */}
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <Particle key={i} index={i} delay={0} />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <Particle key={`delayed-${i}`} index={i} delay={100} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
  },
  badge: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    backgroundColor: "#FFD700",
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#FFF",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    zIndex: 10,
  },
  text: {
    color: "#740001", // Maroon
    fontWeight: "bold",
    fontSize: 24,
    letterSpacing: 2,
  },
  rewardsContainer: {
    marginTop: 24,
    alignItems: "center",
    gap: 16,
  },
  rewardsRow: {
    flexDirection: "row",
    gap: 24,
  },
  rewardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  rewardIcon: {
    fontSize: 20,
  },
  rewardValue: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
  },
  dropContainer: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
  },
  dropIcon: {
    fontSize: 40,
  },
  dropName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  dropRarity: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
