import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = '@onboarding_complete';

interface SlideData {
  id: number;
  icon: keyof typeof Ionicons.glyphMap;
  titleEn: string;
  titleFr: string;
  subtitleEn: string;
  subtitleFr: string;
  gradient: string[];
  features: { icon: keyof typeof Ionicons.glyphMap; textEn: string; textFr: string }[];
}

const slides: SlideData[] = [
  {
    id: 1,
    icon: 'people',
    titleEn: 'Find Trusted Taskers',
    titleFr: 'Trouvez des Tâcherons',
    subtitleEn: 'Connect with verified professionals for any job',
    subtitleFr: 'Connectez-vous avec des professionnels vérifiés',
    gradient: ['#10b981', '#059669'],
    features: [
      { icon: 'shield-checkmark', textEn: 'Verified Profiles', textFr: 'Profils Vérifiés' },
      { icon: 'star', textEn: 'Rated & Reviewed', textFr: 'Notés & Évalués' },
      { icon: 'flash', textEn: 'Instant Booking', textFr: 'Réservation Instantanée' },
    ],
  },
  {
    id: 2,
    icon: 'location',
    titleEn: 'Real-Time Tracking',
    titleFr: 'Suivi en Temps Réel',
    subtitleEn: 'Know exactly when your tasker arrives',
    subtitleFr: 'Sachez exactement quand votre tâcheron arrive',
    gradient: ['#3b82f6', '#1d4ed8'],
    features: [
      { icon: 'navigate', textEn: 'Live Location', textFr: 'Position en Direct' },
      { icon: 'time', textEn: 'ETA Updates', textFr: 'Mises à Jour ETA' },
      { icon: 'chatbubbles', textEn: 'In-App Chat', textFr: 'Chat Intégré' },
    ],
  },
  {
    id: 3,
    icon: 'wallet',
    titleEn: 'Secure & Simple',
    titleFr: 'Sécurisé & Simple',
    subtitleEn: 'Pay safely and rate your experience',
    subtitleFr: 'Payez en toute sécurité et évaluez',
    gradient: ['#8b5cf6', '#6d28d9'],
    features: [
      { icon: 'card', textEn: 'Secure Payments', textFr: 'Paiements Sécurisés' },
      { icon: 'receipt', textEn: 'Transparent Pricing', textFr: 'Tarifs Transparents' },
      { icon: 'heart', textEn: 'Satisfaction Guaranteed', textFr: 'Satisfaction Garantie' },
    ],
  },
];

function FeatureItem({ 
  feature, 
  index, 
  isActive,
  locale,
}: { 
  feature: SlideData['features'][0]; 
  index: number;
  isActive: boolean;
  locale: string;
}) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 500,
          delay: 300 + index * 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          delay: 300 + index * 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      translateY.setValue(30);
      opacity.setValue(0);
    }
  }, [isActive]);

  return (
    <Animated.View 
      style={[
        styles.featureItem,
        { transform: [{ translateY }], opacity }
      ]}
    >
      <View style={styles.featureIconContainer}>
        <Ionicons name={feature.icon} size={20} color="#fff" />
      </View>
      <Text style={styles.featureText}>
        {locale === 'fr' ? feature.textFr : feature.textEn}
      </Text>
    </Animated.View>
  );
}

function Slide({ 
  data, 
  isActive,
  locale,
}: { 
  data: SlideData; 
  isActive: boolean;
  locale: string;
}) {
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      iconScale.setValue(0);
      iconRotate.setValue(0);
      titleOpacity.setValue(0);
      titleTranslateY.setValue(20);
      subtitleOpacity.setValue(0);
      ringScale.setValue(0.8);
      ringOpacity.setValue(0);

      Animated.sequence([
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotate, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringScale, {
              toValue: 1.3,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity, {
              toValue: 0.3,
              duration: 750,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(ringScale, {
              toValue: 0.8,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity, {
              toValue: 0,
              duration: 750,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();

      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        delay: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive]);

  const spin = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.slide}>
      <LinearGradient
        colors={data.gradient}
        style={styles.gradientTop}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.iconWrapper}>
        <Animated.View 
          style={[
            styles.iconRing,
            { 
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
              borderColor: data.gradient[0],
            }
          ]} 
        />
        <Animated.View
          style={[
            styles.iconContainer,
            { 
              backgroundColor: data.gradient[0],
              transform: [{ scale: iconScale }, { rotate: spin }] 
            }
          ]}
        >
          <Ionicons name={data.icon} size={48} color="#fff" />
        </Animated.View>
      </View>

      <Animated.Text 
        style={[
          styles.title,
          { 
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }]
          }
        ]}
      >
        {locale === 'fr' ? data.titleFr : data.titleEn}
      </Animated.Text>

      <Animated.Text 
        style={[styles.subtitle, { opacity: subtitleOpacity }]}
      >
        {locale === 'fr' ? data.subtitleFr : data.subtitleEn}
      </Animated.Text>

      <View style={styles.featuresContainer}>
        {data.features.map((feature, index) => (
          <FeatureItem 
            key={index} 
            feature={feature} 
            index={index}
            isActive={isActive}
            locale={locale}
          />
        ))}
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [locale, setLocale] = useState('en');
  
  const buttonScale = useRef(new Animated.Value(1)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;
  const skipOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem('@app_language').then(lang => {
      if (lang) setLocale(lang);
    });

    Animated.parallel([
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 500,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.timing(skipOpacity, {
        toValue: 1,
        duration: 500,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/');
  };

  const handleNext = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.skipContainer, { opacity: skipOpacity }]}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>
            {locale === 'fr' ? 'Passer' : 'Skip'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {slides.map((slide, index) => (
        <View 
          key={slide.id} 
          style={[
            styles.slideContainer,
            { display: index === currentIndex ? 'flex' : 'none' }
          ]}
        >
          <Slide 
            data={slide} 
            isActive={index === currentIndex}
            locale={locale}
          />
        </View>
      ))}

      <View style={styles.bottomSection}>
        <Animated.View style={[styles.dotsContainer, { opacity: dotsOpacity }]}>
          {slides.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setCurrentIndex(index)}
              activeOpacity={0.7}
            >
              <Animated.View
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === currentIndex 
                      ? slides[currentIndex].gradient[0] 
                      : Colors.dark.border,
                    width: index === currentIndex ? 24 : 8,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={slides[currentIndex].gradient}
              style={styles.nextButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextButtonText}>
                {isLastSlide 
                  ? (locale === 'fr' ? 'Commencer' : 'Get Started')
                  : (locale === 'fr' ? 'Suivant' : 'Next')
                }
              </Text>
              <Ionicons 
                name={isLastSlide ? 'checkmark' : 'arrow-forward'} 
                size={20} 
                color="#fff" 
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  skipContainer: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark.textSecondary,
  },
  slideContainer: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    paddingTop: height * 0.12,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.35,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  iconRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
    marginBottom: 40,
  },
  featuresContainer: {
    width: '100%',
    paddingHorizontal: 32,
    gap: 16,
    marginTop: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    gap: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
