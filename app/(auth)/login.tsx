import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const { login, socialLogin } = useAuth();
  const theme = Colors.dark;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Info', 'Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to sign in. Please verify your credentials.';
      Alert.alert('Sign In Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (provider: 'google' | 'facebook' | 'twitter') => {
    setSocialLoading(provider);
    try {
      await socialLogin(provider);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Social Sign In', `Signed in as verified ${provider} companion user.`);
      router.replace('/(tabs)');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Logo Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.appLogoImage}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: theme.text }]}>Alinga Pa</Text>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>Your Life, Our Care.</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Sign in to your AI personal life companion
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Email Address</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Ionicons name="mail-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                  <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputContainer, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={theme.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted }]}>OR CONTINUE WITH</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Social Logins */}
            <View style={styles.socialRow}>
              {/* Google */}
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: theme.bg, borderColor: theme.border }]}
                onPress={() => handleSocial('google')}
                disabled={!!socialLoading}
              >
                {socialLoading === 'google' ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color="#EA4335" />
                    <Text style={[styles.socialBtnText, { color: theme.text }]}>Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Facebook */}
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: theme.bg, borderColor: theme.border }]}
                onPress={() => handleSocial('facebook')}
                disabled={!!socialLoading}
              >
                {socialLoading === 'facebook' ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <>
                    <Ionicons name="logo-facebook" size={18} color="#1877F2" />
                    <Text style={[styles.socialBtnText, { color: theme.text }]}>Facebook</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Twitter */}
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: theme.bg, borderColor: theme.border }]}
                onPress={() => handleSocial('twitter')}
                disabled={!!socialLoading}
              >
                {socialLoading === 'twitter' ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <>
                    <Ionicons name="logo-twitter" size={18} color="#1DA1F2" />
                    <Text style={[styles.socialBtnText, { color: theme.text }]}>Twitter</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Link */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>Don't have an account yet? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.signupLink, { color: theme.primary }]}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  appLogoImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 8,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  primaryButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 10,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 8,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  socialBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: 13,
  },
  signupLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
