import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = Colors.dark;
  const [email, setEmail] = useState('');

  const handleReset = () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please provide your account email.');
      return;
    }

    Alert.alert(
      'Recovery Instructions Sent',
      `If an account exists for ${email}, password reset instructions have been dispatched.`,
      [{ text: 'Return to Login', onPress: () => router.replace('/(auth)/login') }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Enter your registered email and we will help you regain secure access.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
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

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={handleReset}
          >
            <Text style={styles.primaryButtonText}>Send Reset Link</Text>
          </TouchableOpacity>
        </View>
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
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  backBtn: {
    marginBottom: Spacing.md,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
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
  primaryButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
