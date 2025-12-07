import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Colors } from '../../constants/Colors';
import i18n from '../../utils/i18n';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Logo/Icon Section */}
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="hammer" size={60} color={Colors.dark.primary} />
          </View>
        </View>

        {/* Title Section */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{i18n.t('welcome.title')}</Text>
          <Text style={styles.subtitle}>{i18n.t('welcome.subtitle')}</Text>
        </View>

        {/* Illustration or Feature List */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="people"
            title={i18n.locale === 'fr' ? 'Trouver des experts' : 'Find Experts'}
          />
          <FeatureItem
            icon="location"
            title={i18n.locale === 'fr' ? 'Services locaux' : 'Local Services'}
          />
          <FeatureItem
            icon="shield-checkmark"
            title={i18n.locale === 'fr' ? 'Paiements sécurisés' : 'Secure Payments'}
          />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title={i18n.t('welcome.getStarted')}
          onPress={() => router.push('/(auth)/signup')}
          variant="primary"
          style={styles.button}
        />
        <Button
          title={i18n.t('welcome.login')}
          onPress={() => router.push('/(auth)/login')}
          variant="outline"
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon} size={24} color={Colors.dark.primary} />
      </View>
      <Text style={styles.featureText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.dark.primary,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  featuresContainer: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    padding: 16,
    borderRadius: 12,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark.text,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  button: {
    width: '100%',
  },
});
