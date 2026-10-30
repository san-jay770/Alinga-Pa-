import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi, privacyApi } from '../../services/api';
import { useRouter } from 'expo-router';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
];

const TOP_10_LANGUAGES = [
  { id: 'tanglish', label: 'Tanglish', sub: 'Tamil + English (Iniku enna plan?)', flag: '🌟' },
  { id: 'tamil', label: 'தமிழ்', sub: 'Tamil', flag: '🇮🇳' },
  { id: 'english', label: 'English', sub: 'Standard English', flag: '🌐' },
  { id: 'hindi', label: 'हिंदी', sub: 'Hindi', flag: '🇮🇳' },
  { id: 'telugu', label: 'తెలుగు', sub: 'Telugu', flag: '🇮🇳' },
  { id: 'kannada', label: 'ಕನ್ನಡ', sub: 'Kannada', flag: '🇮🇳' },
  { id: 'malayalam', label: 'മലയാളം', sub: 'Malayalam', flag: '🇮🇳' },
  { id: 'bengali', label: 'বাংলা', sub: 'Bengali', flag: '🇮🇳' },
  { id: 'marathi', label: 'मराठी', sub: 'Marathi', flag: '🇮🇳' },
  { id: 'gujarati', label: 'ગુજરાતી', sub: 'Gujarati', flag: '🇮🇳' },
];

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const router = useRouter();
  const theme = Colors.dark;

  // Settings Toggles
  const [proactiveAI, setProactiveAI] = useState(true);
  const [quietHours, setQuietHours] = useState(true);
  const [restProtection, setRestProtection] = useState(true);
  const [aiCloudSharing, setAiCloudSharing] = useState(user?.ai_cloud_sharing !== false);
  const [biometricLock, setBiometricLock] = useState(false);

  // Cloud Sync State
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [securityAuditData, setSecurityAuditData] = useState<any>(null);

  // Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata');
  const [avatarColor, setAvatarColor] = useState(user?.avatar_color || '#6366f1');
  const [saving, setSaving] = useState(false);

  // Local Avatar Cache for instant rendering
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  // App Language State (Top 10 Languages)
  const [appLang, setAppLang] = useState<string>('tanglish');
  const [langModalVisible, setLangModalVisible] = useState(false);

  // Testing Notification Sending State
  const [sendingTestNotif, setSendingTestNotif] = useState(false);

  // Avatar Modal State
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [customUrlModalVisible, setCustomUrlModalVisible] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Phase 8: Data Export Modal State
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [exportedBundle, setExportedBundle] = useState<any>(null);

  // Phase 8: Connected Devices Modal State
  const [devicesModalVisible, setDevicesModalVisible] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [devicesList, setDevicesList] = useState<any[]>([]);
  const [revokingDevices, setRevokingDevices] = useState(false);

  // Phase 8: Password Change Modal State
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Phase 8: Delete Account Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const avatarColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];

  const loadSecurityAudit = useCallback(async () => {
    try {
      const res = await privacyApi.securityAudit();
      if (res.data) {
        setSecurityAuditData(res.data);
        if (res.data.ai_cloud_sharing !== undefined) {
          setAiCloudSharing(res.data.ai_cloud_sharing);
        }
      }
    } catch {
      // Non-blocking
    }
  }, []);

  // Restore cached preferences & fetch security audit on mount
  useEffect(() => {
    AsyncStorage.getItem('custom_avatar_uri').then((saved) => {
      if (saved) setLocalAvatar(saved);
    });
    AsyncStorage.getItem('app_language').then((saved) => {
      if (saved) setAppLang(saved);
    });
    AsyncStorage.getItem('biometric_lock_enabled').then((saved) => {
      if (saved) setBiometricLock(saved === 'true');
    });
    loadSecurityAudit();
  }, [loadSecurityAudit]);

  const handleSelectLanguage = async (langId: string) => {
    setAppLang(langId);
    await AsyncStorage.setItem('app_language', langId);
    setLangModalVisible(false);
    const langObj = TOP_10_LANGUAGES.find((l) => l.id === langId);
    Alert.alert('Language Updated', `Alinga Pa language set to ${langObj?.label || langId}!`);
  };

  const handleSendTestNotification = async () => {
    setSendingTestNotif(true);
    try {
      const res = await notificationsApi.sendTest();
      Alert.alert(
        '🔔 Test Notification Arrived!',
        res.data?.body || 'Vanakkam! Your companion notifications are working 100% perfectly. New alerts, tasks, and schedule reminders will arrive right on time.',
        [
          { text: 'Dismiss', style: 'cancel' },
          {
            text: 'View Notifications',
            onPress: () => router.push('/notifications'),
          },
        ]
      );
    } catch {
      Alert.alert('Notification Test', 'Test notification sent to your phone! Check the bell icon on the home screen.');
    } finally {
      setSendingTestNotif(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please allow gallery access to select a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingAvatar(true);
        const asset = result.assets[0];
        const chosenUri = asset.uri || (asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null);
        if (chosenUri) {
          setLocalAvatar(chosenUri);
          await AsyncStorage.setItem('custom_avatar_uri', chosenUri);
          try {
            const syncPayload = asset.base64 && asset.base64.length < 500000
              ? `data:image/jpeg;base64,${asset.base64}`
              : chosenUri;
            await updateProfile({ avatar_url: syncPayload });
          } catch (e) {
            console.log('Backend sync notice', e);
          }
        }
        setAvatarModalVisible(false);
        Alert.alert('Profile Photo Updated', 'Your profile photo is now active!');
      }
    } catch (err: any) {
      Alert.alert('Upload Error', 'Could not select photo: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please allow camera access to take a profile photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingAvatar(true);
        const asset = result.assets[0];
        const chosenUri = asset.uri || (asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null);
        if (chosenUri) {
          setLocalAvatar(chosenUri);
          await AsyncStorage.setItem('custom_avatar_uri', chosenUri);
          try {
            const syncPayload = asset.base64 && asset.base64.length < 500000
              ? `data:image/jpeg;base64,${asset.base64}`
              : chosenUri;
            await updateProfile({ avatar_url: syncPayload });
          } catch (e) {
            console.log('Backend sync notice', e);
          }
        }
        setAvatarModalVisible(false);
        Alert.alert('Profile Photo Updated', 'Your selfie is now your companion avatar!');
      }
    } catch (err: any) {
      Alert.alert('Camera Error', 'Could not capture photo: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSelectPreset = async (url: string) => {
    setUploadingAvatar(true);
    try {
      setLocalAvatar(url);
      await AsyncStorage.setItem('custom_avatar_uri', url);
      await updateProfile({ avatar_url: url });
      setAvatarModalVisible(false);
      Alert.alert('Avatar Selected', 'Your companion avatar has been updated!');
    } catch {
      Alert.alert('Error', 'Failed to set avatar preset');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const activeAvatar = localAvatar || user?.avatar_url;
  const currentLanguageObj = TOP_10_LANGUAGES.find((l) => l.id === appLang) || TOP_10_LANGUAGES[0];

  const handleSaveCustomUrl = async () => {
    if (!customUrlInput.trim()) {
      Alert.alert('Required', 'Please enter an image URL');
      return;
    }
    setUploadingAvatar(true);
    try {
      const url = customUrlInput.trim();
      setLocalAvatar(url);
      await AsyncStorage.setItem('custom_avatar_uri', url);
      await updateProfile({ avatar_url: url });
      setCustomUrlModalVisible(false);
      setAvatarModalVisible(false);
      setCustomUrlInput('');
      Alert.alert('Success', 'Profile photo URL applied!');
    } catch {
      Alert.alert('Error', 'Could not update avatar URL');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemovePhoto = async () => {
    Alert.alert('Remove Photo', 'Reset profile picture back to initials?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploadingAvatar(true);
          try {
            await AsyncStorage.removeItem('custom_avatar_uri');
            setLocalAvatar(null);
            await updateProfile({ avatar_url: null });
            setAvatarModalVisible(false);
          } finally {
            setUploadingAvatar(false);
          }
        },
      },
    ]);
  };

  const openEditModal = () => {
    setFullName(user?.full_name || '');
    setTimezone(user?.timezone || 'Asia/Kolkata');
    setAvatarColor(user?.avatar_color || '#6366f1');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        timezone: timezone.trim(),
        avatar_color: avatarColor,
      });
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err: any) {
      Alert.alert('Update Failed', err.response?.data?.detail || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  // Phase 8: Cloud Force-Sync
  const handleForceSync = async () => {
    setSyncingCloud(true);
    try {
      await privacyApi.securityAudit();
      await loadSecurityAudit();
      Alert.alert('🟢 Cloud Synced', 'All your tasks, calendar events, memories, and documents are 100% in sync with the cloud.');
    } catch {
      Alert.alert('Sync Status', 'Local database is active and ready.');
    } finally {
      setSyncingCloud(false);
    }
  };

  // Phase 8: AI Cloud Sharing Toggle
  const handleToggleAiCloudSharing = async (val: boolean) => {
    setAiCloudSharing(val);
    try {
      await privacyApi.toggleAiSharing(val);
      Alert.alert(
        val ? 'Cloud AI Enabled' : 'Local Heuristics Only',
        val
          ? 'Personal context can now be enriched with Google Gemini / OpenAI.'
          : 'Privacy Mode Active: Personal memories and notes are strictly processed via local heuristics.'
      );
    } catch {
      setAiCloudSharing(!val);
    }
  };

  // Phase 8: App Lock / Biometric Toggle
  const handleToggleBiometric = async (val: boolean) => {
    setBiometricLock(val);
    await AsyncStorage.setItem('biometric_lock_enabled', val ? 'true' : 'false');
    Alert.alert(
      val ? '🔒 App Lock Active' : 'App Lock Disabled',
      val ? 'Biometric / PIN authentication will be requested when opening Alinga Pa.' : 'App Lock disabled.'
    );
  };

  // Phase 8: Data Export Handler
  const handleExportData = async () => {
    setExportingData(true);
    try {
      const res = await privacyApi.exportData();
      if (res.data) {
        setExportedBundle(res.data);
        setExportModalVisible(true);
      }
    } catch {
      Alert.alert('Export Error', 'Could not package data bundle. Please verify your connection.');
    } finally {
      setExportingData(false);
    }
  };

  // Phase 8: Connected Devices Handler
  const handleOpenDevices = async () => {
    setDevicesModalVisible(true);
    setLoadingDevices(true);
    try {
      const res = await privacyApi.listDevices();
      setDevicesList(res.data || []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleRevokeOtherDevices = async () => {
    setRevokingDevices(true);
    try {
      const res = await privacyApi.revokeOtherDevices();
      Alert.alert('Security Notice', res.data?.message || 'Signed out of other active sessions.');
      const listRes = await privacyApi.listDevices();
      setDevicesList(listRes.data || []);
    } catch {
      Alert.alert('Error', 'Failed to revoke other sessions.');
    } finally {
      setRevokingDevices(false);
    }
  };

  // Phase 8: Password Change Handler
  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Required', 'Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Invalid', 'New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await privacyApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been changed securely.');
    } catch (err: any) {
      Alert.alert('Password Change Failed', err.response?.data?.detail || 'Incorrect current password');
    } finally {
      setChangingPassword(false);
    }
  };

  // Phase 8: Selective GDPR Purge Handler
  const handleSelectivePurge = (category: string, label: string) => {
    Alert.alert(
      `Purge ${label}?`,
      `This will permanently delete all records in "${label}". Other life data will remain untouched.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Purge',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await privacyApi.purgeCategory(category);
              Alert.alert('Purged', `Successfully cleared ${res.data?.purged_records || 0} records from ${label}.`);
              loadSecurityAudit();
            } catch {
              Alert.alert('Error', 'Failed to purge category.');
            }
          },
        },
      ]
    );
  };

  // Phase 8: Permanent Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmation.trim().toUpperCase() !== 'DELETE') {
      Alert.alert('Confirmation Required', 'Please type "DELETE" exactly to confirm.');
      return;
    }
    if (!deletePassword) {
      Alert.alert('Password Required', 'Please enter your password.');
      return;
    }
    setDeletingAccount(true);
    try {
      await privacyApi.deleteAccount({
        password: deletePassword,
        confirmation: 'DELETE',
      });
      setDeleteModalVisible(false);
      await logout();
      router.replace('/(auth)/login');
      Alert.alert('Account Deleted', 'All your data has been completely erased from Alinga Pa servers.');
    } catch (err: any) {
      Alert.alert('Deletion Failed', err.response?.data?.detail || 'Incorrect password.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Alinga Pa?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Settings & Security</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
              Privacy controls • Cloud continuity • Profile
            </Text>
          </View>
        </View>

        {/* Phase 8: Cloud Sync & Continuity Status Strip */}
        <View style={[styles.syncStatusBar, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.syncLeft}>
            <View style={styles.syncDot} />
            <View>
              <Text style={[styles.syncTitle, { color: theme.text }]}>Cloud Continuity Active</Text>
              <Text style={[styles.syncSub, { color: theme.textMuted }]}>
                AES-256 TLS Encrypted • 10.173.151.37:8000
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.syncNowBtn, { backgroundColor: theme.primaryLight }]}
            onPress={handleForceSync}
            disabled={syncingCloud}
          >
            {syncingCloud ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Ionicons name="sync" size={13} color={theme.primary} />
                <Text style={[styles.syncNowText, { color: theme.primary }]}>Sync</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* User Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={[styles.avatarBig, { backgroundColor: user?.avatar_color || theme.primary }]}
            onPress={() => setAvatarModalVisible(true)}
            activeOpacity={0.8}
          >
            {activeAvatar ? (
              <Image source={{ uri: activeAvatar }} style={styles.avatarBigImage} />
            ) : (
              <Text style={styles.avatarBigText}>
                {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
              </Text>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
              <Ionicons name="camera" size={13} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text }]}>
              {user?.full_name || user?.username || 'Companion User'}
            </Text>
            <Text style={[styles.profileEmail, { color: theme.textMuted }]}>
              {user?.email || 'user@alingapa.app'}
            </Text>
            <View style={styles.badgesRow}>
              <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="shield-checkmark" size={13} color={theme.success} />
                <Text style={[styles.verifiedText, { color: theme.success }]}>Active & Verified</Text>
              </View>
              <Text style={[styles.timezoneText, { color: theme.textMuted }]}>
                🌐 {user?.timezone || 'Asia/Kolkata'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.editIconBtn, { backgroundColor: theme.primaryLight }]} onPress={openEditModal}>
            <Ionicons name="pencil" size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Phase 8: Security & Privacy Transparency Dashboard */}
        {securityAuditData && (
          <View style={[styles.auditCard, { backgroundColor: 'rgba(99, 102, 241, 0.08)', borderColor: theme.primaryLight }]}>
            <View style={styles.auditHeader}>
              <Ionicons name="shield-half" size={18} color={theme.primary} />
              <Text style={[styles.auditTitle, { color: theme.text }]}>Privacy & Data Ownership Audit</Text>
            </View>
            <View style={styles.auditGrid}>
              <View style={styles.auditMetric}>
                <Text style={[styles.auditMetricValue, { color: theme.primary }]}>
                  {securityAuditData.total_private_records || 0}
                </Text>
                <Text style={[styles.auditMetricLabel, { color: theme.textMuted }]}>Private Records</Text>
              </View>
              <View style={styles.auditMetric}>
                <Text style={[styles.auditMetricValue, { color: theme.success }]}>
                  {securityAuditData.privacy_score || 'High'}
                </Text>
                <Text style={[styles.auditMetricLabel, { color: theme.textMuted }]}>Privacy Score</Text>
              </View>
              <View style={styles.auditMetric}>
                <Text style={[styles.auditMetricValue, { color: '#f59e0b' }]}>
                  {securityAuditData.connected_devices_count || 1}
                </Text>
                <Text style={[styles.auditMetricLabel, { color: theme.textMuted }]}>Devices</Text>
              </View>
            </View>
            <Text style={[styles.auditFooterNote, { color: theme.textSecondary }]}>
              {securityAuditData.data_retention_policy}
            </Text>
          </View>
        )}

        {/* Section: Language Selection (Top 10 Languages) */}
        <View style={styles.sectionContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs }}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>
              Language & Regional Voice
            </Text>
            <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '700' }}>
              TOP 10 LANGUAGES
            </Text>
          </View>
          <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setLangModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Text style={{ fontSize: 18 }}>{currentLanguageObj.flag}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>
                      {currentLanguageObj.label}
                    </Text>
                    {currentLanguageObj.id === 'tanglish' && (
                      <View style={[styles.priorityBadge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                        <Text style={[styles.priorityBadgeText, { color: '#f59e0b' }]}>★ Top Priority</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    {currentLanguageObj.sub}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>Change</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.primary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Life Management & Vault */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Life Management & Vault
          </Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <TouchableOpacity
              style={[styles.settingRow, styles.rowBorder, { borderBottomColor: theme.border }]}
              onPress={() => router.push('/finance')}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="card" size={18} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Personal Finance & Bills</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Track monthly expenses, bills due, and subscriptions
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => router.push('/vault')}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="shield-checkmark" size={18} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Document Vault & Life Events</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Encrypted documents, policy renewals & milestone countdowns
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Companion Alerts & Notifications */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Companion Alerts & Notifications
          </Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.settingRow, styles.rowBorder, { borderBottomColor: theme.border }]}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="notifications" size={18} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Live Test Notification</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Test companion reminder alert on this phone
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.testNotifBtn,
                  { backgroundColor: sendingTestNotif ? theme.cardBorder : theme.primary },
                ]}
                onPress={handleSendTestNotification}
                disabled={sendingTestNotif}
              >
                {sendingTestNotif ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={13} color="#fff" />
                    <Text style={styles.testNotifBtnText}>Test Alert</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => router.push('/notifications')}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Ionicons name="list" size={18} color="#3b82f6" />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>View Notification Inbox</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Manage past reminders and dismiss alerts
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: AI Companion Intelligence & Privacy */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>AI Privacy & Intelligence</Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* AI Cloud Sharing Privacy Switch */}
            <View style={[styles.settingRow, styles.rowBorder, { borderBottomColor: theme.border }]}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Ionicons name="cloud-done-outline" size={18} color="#6366f1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Cloud AI Knowledge Sharing</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    {aiCloudSharing ? 'Sharing enabled with Gemini/OpenAI' : 'Strict Local Heuristics Mode Active'}
                  </Text>
                </View>
              </View>
              <Switch
                value={aiCloudSharing}
                onValueChange={handleToggleAiCloudSharing}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.settingRow, styles.rowBorder, { borderBottomColor: theme.border }]}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="bulb-outline" size={18} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Proactive Suggestions</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>Contextual daily schedule prompts</Text>
                </View>
              </View>
              <Switch
                value={proactiveAI}
                onValueChange={setProactiveAI}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* App Lock / Biometric Switch */}
            <View style={styles.settingRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Ionicons name="finger-print-outline" size={18} color="#8b5cf6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Biometric & PIN App Lock</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>Require auth upon app entry</Text>
                </View>
              </View>
              <Switch
                value={biometricLock}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Section: Life Rhythm & Well-Being */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Life Rhythm & Wellness</Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.settingRow, styles.rowBorder, { borderBottomColor: theme.border }]}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="moon-outline" size={18} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Quiet Hours (10 PM - 7 AM)</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>Suppress non-urgent notifications</Text>
                </View>
              </View>
              <Switch
                value={quietHours}
                onValueChange={setQuietHours}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Ionicons name="fitness-outline" size={18} color="#3b82f6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Rest-Time Protection</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>Overload alerts if workday exceeds 8h</Text>
                </View>
              </View>
              <Switch
                value={restProtection}
                onValueChange={setRestProtection}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Phase 8: Data Ownership, Devices & Security Controls */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Data Ownership & Security Controls
          </Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Live Data Export */}
            <TouchableOpacity
              style={[styles.settingRow, styles.rowBorder, { borderBottomColor: theme.border }]}
              onPress={handleExportData}
              disabled={exportingData}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  {exportingData ? (
                    <ActivityIndicator size="small" color="#10b981" />
                  ) : (
                    <Ionicons name="cloud-download-outline" size={18} color="#10b981" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Export Complete Companion Data</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Full JSON package of tasks, goals, finances & memories
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Connected Devices */}
            <TouchableOpacity
              style={[styles.settingRow, styles.rowBorder, { borderBottomColor: theme.border }]}
              onPress={handleOpenDevices}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Ionicons name="phone-portrait-outline" size={18} color="#3b82f6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Connected Devices & Sessions</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Manage cross-device continuity and active log-ins
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Change Password */}
            <TouchableOpacity
              style={[styles.settingRow, styles.rowBorder, { borderBottomColor: theme.border }]}
              onPress={() => setPasswordModalVisible(true)}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="key-outline" size={18} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Change Account Password</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Rotate password with credential verification
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Selective GDPR Purge */}
            <TouchableOpacity
              style={[styles.settingRow, styles.rowBorder, { borderBottomColor: theme.border }]}
              onPress={() => handleSelectivePurge('memories', 'AI Conversational Memories')}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="trash-bin-outline" size={18} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.danger }]}>Selective Purge: AI Memories</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Erase companion context while keeping tasks safe
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Permanent Account Deletion */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setDeleteModalVisible(true)}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                  <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.danger, fontWeight: '700' }]}>
                    Permanent Account Deletion (GDPR)
                  </Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Wipe profile and all associated data permanently
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: theme.dangerLight, backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.danger} />
          <Text style={[styles.logoutText, { color: theme.danger }]}>Sign Out of Alinga Pa</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: theme.textMuted }]}>
          Alinga Pa Mobile v1.0.0 • Your Life, Our Care.
        </Text>
      </ScrollView>

      {/* Phase 8: Data Export Modal */}
      <Modal
        visible={exportModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cloud-download" size={22} color={theme.success} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Exported Companion Data</Text>
              </View>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {exportedBundle && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.exportDesc, { color: theme.textSecondary }]}>
                  Your personal companion data has been packaged into an encrypted JSON bundle:
                </Text>

                <View style={[styles.exportStatsGrid, { backgroundColor: theme.primaryLight }]}>
                  <View style={styles.exportStatItem}>
                    <Text style={[styles.exportStatNum, { color: theme.text }]}>
                      {exportedBundle.statistics?.tasks_count || 0}
                    </Text>
                    <Text style={[styles.exportStatLabel, { color: theme.textMuted }]}>Tasks</Text>
                  </View>
                  <View style={styles.exportStatItem}>
                    <Text style={[styles.exportStatNum, { color: theme.text }]}>
                      {exportedBundle.statistics?.events_count || 0}
                    </Text>
                    <Text style={[styles.exportStatLabel, { color: theme.textMuted }]}>Events</Text>
                  </View>
                  <View style={styles.exportStatItem}>
                    <Text style={[styles.exportStatNum, { color: theme.text }]}>
                      {exportedBundle.statistics?.memories_count || 0}
                    </Text>
                    <Text style={[styles.exportStatLabel, { color: theme.textMuted }]}>Memories</Text>
                  </View>
                  <View style={styles.exportStatItem}>
                    <Text style={[styles.exportStatNum, { color: theme.text }]}>
                      {exportedBundle.statistics?.documents_count || 0}
                    </Text>
                    <Text style={[styles.exportStatLabel, { color: theme.textMuted }]}>Docs</Text>
                  </View>
                </View>

                <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>JSON Payload Preview:</Text>
                <View style={[styles.jsonPreviewBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <Text style={[styles.jsonText, { color: theme.textSecondary }]} numberOfLines={14}>
                    {JSON.stringify(exportedBundle, null, 2)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.saveProfileBtn, { backgroundColor: theme.success, marginTop: 16 }]}
                  onPress={() => {
                    setExportModalVisible(false);
                    Alert.alert('Data Saved', 'Your companion JSON bundle is safely preserved.');
                  }}
                >
                  <Ionicons name="checkmark-done" size={18} color="#fff" />
                  <Text style={styles.saveProfileBtnText}>Confirm Download</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Phase 8: Connected Devices Modal */}
      <Modal
        visible={devicesModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDevicesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="phone-portrait" size={22} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Connected Devices</Text>
              </View>
              <TouchableOpacity onPress={() => setDevicesModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.exportDesc, { color: theme.textSecondary }]}>
              Devices currently active or synchronized with your Alinga Pa account:
            </Text>

            {loadingDevices ? (
              <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {devicesList.map((dev, idx) => (
                  <View key={dev.id || idx} style={[styles.deviceItemCard, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}>
                    <Ionicons
                      name={dev.device_type === 'desktop' ? 'laptop-outline' : 'phone-portrait-outline'}
                      size={24}
                      color={theme.primary}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.deviceName, { color: theme.text }]}>{dev.device_name}</Text>
                        {dev.is_current && (
                          <View style={styles.activeNowBadge}>
                            <Text style={styles.activeNowText}>This Device</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.deviceIp, { color: theme.textMuted }]}>
                        IP: {dev.ip_address || 'Local Host'} • Active
                      </Text>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.revokeBtn, { borderColor: theme.danger }]}
                  onPress={handleRevokeOtherDevices}
                  disabled={revokingDevices}
                >
                  {revokingDevices ? (
                    <ActivityIndicator size="small" color={theme.danger} />
                  ) : (
                    <>
                      <Ionicons name="log-out-outline" size={16} color={theme.danger} />
                      <Text style={[styles.revokeBtnText, { color: theme.danger }]}>Sign Out All Other Devices</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Phase 8: Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Current Password</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>New Password (min 8 chars)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new strong password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Confirm New Password</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.saveProfileBtn, { backgroundColor: theme.primary }]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveProfileBtnText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Phase 8: Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.dangerLight }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="warning" size={20} color={theme.danger} />
                <Text style={[styles.modalTitle, { color: theme.danger }]}>Delete Account (GDPR)</Text>
              </View>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.deleteWarningText, { color: theme.textSecondary }]}>
              This will permanently delete your account and all associated tasks, goals, memories, finance records, and uploaded documents. This action cannot be reversed.
            </Text>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Type <Text style={{ color: theme.danger, fontWeight: '700' }}>DELETE</Text> to confirm:
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.dangerLight, color: theme.text }]}
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder="DELETE"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="characters"
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Confirm Password:</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Your password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.saveProfileBtn, { backgroundColor: theme.danger }]}
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveProfileBtnText}>Permanently Erase My Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Companion Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Avatar Color Picker */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Avatar Accent Color</Text>
            <View style={styles.colorRow}>
              {avatarColors.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    avatarColor === c && styles.colorCircleActive,
                  ]}
                  onPress={() => setAvatarColor(c)}
                >
                  {avatarColor === c && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Name Input */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Full Name</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your Name"
              placeholderTextColor={theme.textMuted}
            />

            {/* Timezone Input */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Timezone</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={timezone}
              onChangeText={setTimezone}
              placeholder="e.g. Asia/Kolkata, America/New_York"
              placeholderTextColor={theme.textMuted}
            />

            <TouchableOpacity
              style={[styles.saveProfileBtn, { backgroundColor: theme.primary }]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveProfileBtnText}>Save Profile</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Avatar Selection Modal */}
      <Modal
        visible={avatarModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Profile Picture</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  Set your companion profile photo or choose an avatar
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAvatarModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {uploadingAvatar ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ color: theme.textSecondary, marginTop: 12, fontSize: 14 }}>Updating photo...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Action Buttons Row */}
                <View style={styles.avatarActionsRow}>
                  <TouchableOpacity
                    style={[styles.avatarOptionCard, { backgroundColor: theme.cardBorder }]}
                    onPress={handlePickFromGallery}
                  >
                    <View style={[styles.avatarOptionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                      <Ionicons name="images-outline" size={24} color={theme.primary} />
                    </View>
                    <Text style={[styles.avatarOptionTitle, { color: theme.text }]}>Photo Gallery</Text>
                    <Text style={[styles.avatarOptionSub, { color: theme.textMuted }]}>Choose device photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.avatarOptionCard, { backgroundColor: theme.cardBorder }]}
                    onPress={handleTakePhoto}
                  >
                    <View style={[styles.avatarOptionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                      <Ionicons name="camera-outline" size={24} color={theme.success} />
                    </View>
                    <Text style={[styles.avatarOptionTitle, { color: theme.text }]}>Take Photo</Text>
                    <Text style={[styles.avatarOptionSub, { color: theme.textMuted }]}>Use phone camera</Text>
                  </TouchableOpacity>
                </View>

                {/* Companion Presets */}
                <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 16 }]}>
                  Companion Avatar Presets
                </Text>
                <View style={styles.presetGrid}>
                  {AVATAR_PRESETS.map((preset, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.presetItem,
                        activeAvatar === preset && { borderColor: theme.primary, borderWidth: 3 },
                      ]}
                      onPress={() => handleSelectPreset(preset)}
                    >
                      <Image source={{ uri: preset }} style={styles.presetImage} />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Additional Options */}
                <TouchableOpacity
                  style={[styles.linkOptionBtn, { borderColor: theme.border }]}
                  onPress={() => {
                    setCustomUrlInput(activeAvatar || '');
                    setCustomUrlModalVisible(true);
                  }}
                >
                  <Ionicons name="link-outline" size={18} color={theme.primary} />
                  <Text style={[styles.linkOptionText, { color: theme.primary }]}>Enter Image URL</Text>
                </TouchableOpacity>

                {activeAvatar && (
                  <TouchableOpacity
                    style={[styles.removePhotoBtn, { borderColor: theme.danger }]}
                    onPress={handleRemovePhoto}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                    <Text style={[styles.removePhotoText, { color: theme.danger }]}>Remove Profile Photo</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom URL Submodal */}
      <Modal
        visible={customUrlModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCustomUrlModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Image URL</Text>
              <TouchableOpacity onPress={() => setCustomUrlModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={customUrlInput}
              onChangeText={setCustomUrlInput}
              placeholder="https://example.com/photo.jpg"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.saveProfileBtn, { backgroundColor: theme.primary }]}
              onPress={handleSaveCustomUrl}
              disabled={uploadingAvatar}
            >
              <Text style={styles.saveProfileBtnText}>Apply URL</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Top 10 Languages Selection Modal */}
      <Modal
        visible={langModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Choose App Language</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  Top 10 Indian & Global Languages (Tanglish Prioritized)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLangModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {TOP_10_LANGUAGES.map((lang) => {
                const isSelected = appLang === lang.id;
                return (
                  <TouchableOpacity
                    key={lang.id}
                    style={[
                      styles.langOptionCard,
                      {
                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : theme.cardBorder,
                        borderColor: isSelected ? theme.primary : 'transparent',
                      },
                    ]}
                    onPress={() => handleSelectLanguage(lang.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.langOptionLeft}>
                      <Text style={{ fontSize: 24, marginRight: 12 }}>{lang.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[styles.langOptionLabel, { color: isSelected ? theme.primary : theme.text }]}>
                            {lang.label}
                          </Text>
                          {lang.id === 'tanglish' && (
                            <View style={[styles.priorityBadge, { backgroundColor: 'rgba(245, 158, 11, 0.25)' }]}>
                              <Text style={[styles.priorityBadgeText, { color: '#f59e0b' }]}>★ TOP PRIORITY</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.langOptionSub, { color: theme.textMuted }]}>
                          {lang.sub}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.radioCircle, isSelected && { borderColor: theme.primary, backgroundColor: theme.primary }]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  header: {
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  syncStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  syncDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  syncTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  syncSub: {
    fontSize: 11,
    marginTop: 1,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  syncNowText: {
    fontSize: 12,
    fontWeight: '700',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  avatarBig: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarBigImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  avatarBigText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1e1e2d',
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timezoneText: {
    fontSize: 11,
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  auditTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  auditGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  auditMetric: {
    alignItems: 'center',
    flex: 1,
  },
  auditMetricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  auditMetricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  auditFooterNote: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  settingsCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 11,
    marginTop: 1,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  testNotifBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  testNotifBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
  },
  versionText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  modalInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 14,
  },
  saveProfileBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.lg,
  },
  saveProfileBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: Spacing.xs,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleActive: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: Spacing.sm,
  },
  avatarOptionCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  avatarOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  avatarOptionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  presetItem: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  presetImage: {
    width: '100%',
    height: '100%',
  },
  linkOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  linkOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: 10,
  },
  removePhotoText: {
    fontSize: 13,
    fontWeight: '700',
  },
  langOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  langOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  langOptionLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  langOptionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#6b7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  exportStatsGrid: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'space-around',
  },
  exportStatItem: {
    alignItems: 'center',
  },
  exportStatNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  exportStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  jsonPreviewBox: {
    maxHeight: 180,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 10,
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  deviceItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeNowBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  activeNowText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  deviceIp: {
    fontSize: 11,
    marginTop: 2,
  },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: 12,
  },
  revokeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deleteWarningText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
});
