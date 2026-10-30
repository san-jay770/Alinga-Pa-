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

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const theme = Colors.dark;

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please complete all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Password Too Short', 'Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await register({
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      Alert.alert('Account Created', 'Welcome to Alinga Pa!');
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Registration failed.';
      Alert.alert('Registration Failed', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Begin your journey with your personal companion
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Ionicons name="person-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Alex Rivers"
                  placeholderTextColor={theme.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Username</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Ionicons name="at-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="alex_rivers"
                  placeholderTextColor={theme.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Email Address</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Ionicons name="mail-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="alex@example.com"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Password (Min 8 chars)</Text>
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

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Link */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.loginLink, { color: theme.primary }]}>Sign In</Text>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  backBtn: {
    marginBottom: Spacing.sm,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
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
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: 13,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
