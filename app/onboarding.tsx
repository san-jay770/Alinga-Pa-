import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge: string;
  title: string;
  subtitle: string;
  features: string[];
}

const slides: Slide[] = [
  {
    id: '1',
    icon: 'sparkles',
    badge: 'AI LIFE COMPANION',
    title: 'Your Life,\nOur Care.',
    subtitle: 'Alinga Pa understands your routines, deadlines, and responsibilities, keeping your entire day harmoniously organized.',
    features: ['Adaptive Schedule', 'Voice Assistant', 'Proactive Care'],
  },
  {
    id: '2',
    icon: 'time',
    badge: 'INTELLIGENT TIMING',
    title: 'Adaptive Priority &\nMissed Task Recovery',
    subtitle: 'Life happens. When unexpected delays occur, your assistant automatically rebalances your schedule without anxiety.',
    features: ['Auto Reschedule', 'Deadline Guard', 'Buffer Zones'],
  },
  {
    id: '3',
    icon: 'shield-checkmark',
    badge: '100% PRIVATE & SECURE',
    title: 'Your Personal Vault,\nGuaranteed Safe.',
    subtitle: 'Your memories, documents, and habits stay in your hands with strict user-controlled data isolation.',
    features: ['256-Bit Isolated', 'Rule 49 Confirmed', 'Zero Leakage'],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = Colors.dark;
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Breathing pulse loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.07,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Gentle float loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2600,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2600,
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Glowing aura loop
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.85,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.35,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    floatLoop.start();
    glowLoop.start();

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
      glowLoop.stop();
    };
  }, []);

  const triggerSlideTransition = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(18);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('has_onboarded', 'true');
    router.replace('/(auth)/register');
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('has_onboarded', 'true');
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIdx = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIdx });
      setCurrentIndex(nextIdx);
      triggerSlideTransition();
    } else {
      handleFinish();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={[styles.brandText, { color: theme.text }]}>Alinga Pa</Text>
        </View>

        <TouchableOpacity onPress={handleSkip}>
          <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          if (idx !== currentIndex) {
            setCurrentIndex(idx);
            triggerSlideTransition();
          }
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {/* Animated Hero Emblem Area */}
            <View style={styles.heroWrapper}>
              {/* Layer 1: Outer pulsating glow ring */}
              <Animated.View
                style={[
                  styles.glowRingOuter,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: glowAnim,
                  },
                ]}
              />

              {/* Layer 2: Inner soft ambient halo */}
              <Animated.View
                style={[
                  styles.glowRingInner,
                  {
                    opacity: glowAnim,
                  },
                ]}
              />

              {/* Layer 3: Floating & Breathing Core Icon / App Logo */}
              <Animated.View
                style={[
                  styles.iconCircle,
                  {
                    transform: [
                      { translateY: floatAnim },
                      { scale: item.id === '1' ? pulseAnim : 1 },
                    ],
                  },
                ]}
              >
                {item.id === '1' ? (
                  <Image
                    source={require('../assets/logo.png')}
                    style={styles.slideHeroLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name={item.icon} size={64} color={theme.primary} />
                )}
              </Animated.View>
            </View>

            {/* Slide Text Content with Fade & Slide Animation */}
            <Animated.View
              style={[
                styles.contentContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={[styles.badgeContainer, { backgroundColor: 'rgba(99, 102, 241, 0.16)' }]}>
                <Ionicons name="sparkles" size={13} color={theme.primary} style={{ marginRight: 5 }} />
                <Text style={[styles.badgeText, { color: theme.primary }]}>{item.badge}</Text>
              </View>

              <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>

              {/* Feature Pills */}
              <View style={styles.featuresRow}>
                {item.features.map((feat: string, fIdx: number) => (
                  <View key={fIdx} style={[styles.featurePill, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: theme.border }]}>
                    <Text style={[styles.featurePillText, { color: theme.textSecondary }]}>✓ {feat}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          </View>
        )}
      />

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: currentIndex === i ? theme.primary : theme.border },
                currentIndex === i && styles.activeDot,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.primary }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={currentIndex === slides.length - 1 ? 'arrow-forward' : 'chevron-forward'}
            size={18}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={handleSkip}>
          <Text style={[styles.loginLinkText, { color: theme.textMuted }]}>
            Already have an account? <Text style={{ color: theme.primary, fontWeight: '700' }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  heroWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  glowRingOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
  },
  glowRingInner: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
  },
  iconCircle: {
    width: 154,
    height: 154,
    borderRadius: 77,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  slideHeroLogo: {
    width: 154,
    height: 154,
    borderRadius: 77,
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: Spacing.md,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 35,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: '92%',
    marginBottom: Spacing.md,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  featurePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomControls: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
  },
});
