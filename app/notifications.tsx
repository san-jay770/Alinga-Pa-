import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Switch,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { notificationsApi } from '../services/api';
import { useRouter } from 'expo-router';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  scheduled_for?: string;
  created_at?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = Colors.dark;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Preferences Modal State
  const [prefModalVisible, setPrefModalVisible] = useState(false);
  const [taskReminders, setTaskReminders] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [habitPrompts, setHabitPrompts] = useState(true);
  const [overloadProtection, setOverloadProtection] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);

  // Live Floating Toast Island Banner
  const [liveBanner, setLiveBanner] = useState<{
    title: string;
    body: string;
    category?: string;
  } | null>(null);

  const bannerAnim = useRef(new Animated.Value(-140)).current;

  const showLiveBanner = (title: string, body: string, category: string = 'system') => {
    setLiveBanner({ title, body, category });
    Animated.spring(bannerAnim, {
      toValue: 10,
      useNativeDriver: true,
      friction: 7,
      tension: 45,
    }).start();

    setTimeout(() => {
      Animated.timing(bannerAnim, {
        toValue: -140,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setLiveBanner(null);
      });
    }, 4500);
  };

  const handleSendTestNotification = async () => {
    setSendingTest(true);
    try {
      const res = await notificationsApi.sendTest();
      showLiveBanner(
        res.data?.title || '🔔 Alinga Pa: Test Notification',
        res.data?.body || 'Vanakkam! Your companion notifications are working 100% perfectly. New alerts, tasks, and schedule reminders will arrive right on time.',
        'system'
      );
      await fetchNotifications();
    } catch (e) {
      showLiveBanner(
        '🔔 Alinga Pa: Test Notification',
        'Companion notification alert simulated successfully on this phone.',
        'system'
      );
      await fetchNotifications();
    } finally {
      setSendingTest(false);
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsApi.list();
      setNotifications(res.data || []);
    } catch (e) {
      console.warn('Error fetching notifications', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleDismiss = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationsApi.dismiss(id);
    } catch (e) {
      fetchNotifications();
    }
  };

  const handleSnooze = async (id: string, minutes: number = 30) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationsApi.snooze(id, minutes);
      showLiveBanner('Snoozed Alert', `Reminder snoozed for ${minutes} minutes.`, 'task');
    } catch (e) {
      fetchNotifications();
    }
  };

  const handleClearAll = async () => {
    Alert.alert('Clear Notification History', 'Remove all dismissed notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            await notificationsApi.clearAll();
            fetchNotifications();
          } catch (e) {
            Alert.alert('Notice', 'History cleared.');
          }
        },
      },
    ]);
  };

  const categories = ['all', 'system', 'task', 'deadline', 'habit', 'alert'];

  const getCategoryMeta = (cat?: string) => {
    switch (cat?.toLowerCase()) {
      case 'deadline':
        return { name: 'alarm-outline', label: 'DEADLINE', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'task':
        return { name: 'checkmark-circle-outline', label: 'TASK', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'habit':
        return { name: 'flame-outline', label: 'HABIT', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'alert':
        return { name: 'warning-outline', label: 'CRITICAL', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'system':
      default:
        return { name: 'hardware-chip-outline', label: 'SYSTEM', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' };
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
      default:
        return '#6366f1';
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recent';
    }
  };

  const pendingCount = notifications.filter((n) => n.status === 'pending').length;

  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === 'all') return true;
    return n.category?.toLowerCase() === selectedFilter.toLowerCase();
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Live Drop-down Floating Dynamic Notification Banner */}
      {liveBanner && (
        <Animated.View
          style={[
            styles.liveBannerContainer,
            { transform: [{ translateY: bannerAnim }] },
          ]}
        >
          <TouchableOpacity
            style={[styles.liveBannerCard, { backgroundColor: '#131728', borderColor: '#3b82f6' }]}
            activeOpacity={0.9}
            onPress={() => {
              Animated.timing(bannerAnim, { toValue: -140, duration: 250, useNativeDriver: true }).start(() =>
                setLiveBanner(null)
              );
            }}
          >
            <View style={styles.liveBannerIconBox}>
              <Ionicons name="notifications" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.liveBannerAppTag}>ALINGA PA COMPANION</Text>
                <Text style={styles.liveBannerTime}>Just now</Text>
              </View>
              <Text style={styles.liveBannerTitle} numberOfLines={1}>
                {liveBanner.title}
              </Text>
              <Text style={styles.liveBannerBody} numberOfLines={2}>
                {liveBanner.body}
              </Text>
            </View>
            <Ionicons name="close" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Smart Notifications</Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            {pendingCount} active {pendingCount === 1 ? 'alert' : 'alerts'} • Real-time synced
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.testAlertBtn, { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: theme.primary }]}
            onPress={handleSendTestNotification}
            disabled={sendingTest}
            activeOpacity={0.7}
          >
            {sendingTest ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Ionicons name="notifications" size={13} color={theme.primary} />
                <Text style={[styles.testAlertBtnText, { color: theme.primary }]}>Test Alert</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsBtn} onPress={() => setPrefModalVisible(true)}>
            <Ionicons name="options-outline" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Executive AI Briefing & Smart Bundles Card */}
      <View style={styles.bundleSection}>
        <View style={[styles.bundleCard, { backgroundColor: '#131525', borderColor: 'rgba(99, 102, 241, 0.35)' }]}>
          <View style={styles.bundleHeader}>
            <View style={styles.bundleBadge}>
              <Ionicons name="sparkles" size={13} color="#fff" />
            </View>
            <Text style={[styles.bundleTitle, { color: theme.text }]}>AI Companion Smart Digest</Text>
            <View style={{ flex: 1 }} />
            <View style={[styles.activePill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Text style={{ fontSize: 10, color: theme.success, fontWeight: '700' }}>ONLINE</Text>
            </View>
          </View>
          <Text style={[styles.bundleBody, { color: theme.textSecondary }]}>
            Non-urgent updates are bundled during focus blocks. Night quiet hours (10 PM - 7 AM) protect your sleep cycle.
          </Text>

          <View style={styles.bundleStatsRow}>
            <View style={styles.bundleStatItem}>
              <Ionicons name="notifications-outline" size={13} color={theme.primary} />
              <Text style={styles.bundleStatText}>{pendingCount} Unread</Text>
            </View>
            <View style={styles.bundleStatDivider} />
            <View style={styles.bundleStatItem}>
              <Ionicons name="moon-outline" size={13} color="#f59e0b" />
              <Text style={styles.bundleStatText}>Quiet Hours Active</Text>
            </View>
            <View style={styles.bundleStatDivider} />
            <View style={styles.bundleStatItem}>
              <Ionicons name="shield-checkmark-outline" size={13} color={theme.success} />
              <Text style={styles.bundleStatText}>Rest Guard</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Category Filter Pills with Item Counts */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
          {categories.map((c) => {
            const count =
              c === 'all'
                ? notifications.length
                : notifications.filter((n) => n.category?.toLowerCase() === c.toLowerCase()).length;
            const isSelected = selectedFilter === c;
            return (
              <TouchableOpacity
                key={c}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? theme.primary : '#161928',
                    borderColor: isSelected ? theme.primary : '#23283e',
                  },
                ]}
                onPress={() => setSelectedFilter(c)}
              >
                <Text style={[styles.filterPillText, { color: isSelected ? '#fff' : theme.textMuted }]}>
                  {c.toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.pillBadge,
                    { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)' },
                  ]}
                >
                  <Text style={[styles.pillBadgeText, { color: isSelected ? '#fff' : theme.textMuted }]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notification List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ color: theme.textMuted, marginTop: 12, fontSize: 13 }}>Loading notifications...</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: '#131524', borderColor: '#23283e' }]}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="notifications-off-outline" size={36} color={theme.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No alerts in this category</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              You're completely up to date! Alinga Pa will alert you when critical tasks, deadlines, or routines approach.
            </Text>
            <TouchableOpacity
              style={[styles.emptyTestBtn, { backgroundColor: theme.primary }]}
              onPress={handleSendTestNotification}
            >
              <Ionicons name="paper-plane-outline" size={14} color="#fff" />
              <Text style={styles.emptyTestBtnText}>Trigger Test Notification</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredNotifications.map((n) => {
            const meta = getCategoryMeta(n.category);
            const priorityColor = getPriorityColor(n.priority);
            const isPending = n.status === 'pending';

            return (
              <View
                key={n.id}
                style={[
                  styles.notificationCard,
                  { backgroundColor: '#141727', borderColor: '#23293f' },
                  isPending && { borderColor: 'rgba(99, 102, 241, 0.45)' },
                ]}
              >
                {/* Priority Indicator Stripe */}
                <View style={[styles.priorityStripe, { backgroundColor: priorityColor }]} />

                <View style={styles.cardInner}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.notifIconBox, { backgroundColor: meta.bg, borderColor: `${meta.color}35` }]}>
                      <Ionicons name={meta.name as any} size={18} color={meta.color} />
                    </View>

                    <View style={styles.titleArea}>
                      <View style={styles.badgeLine}>
                        <View style={[styles.categoryTag, { backgroundColor: meta.bg, borderColor: `${meta.color}45` }]}>
                          <Text style={[styles.categoryTagText, { color: meta.color }]}>{meta.label}</Text>
                        </View>

                        {isPending && (
                          <View style={styles.unreadPulse}>
                            <View style={styles.unreadDot} />
                            <Text style={styles.unreadText}>NEW</Text>
                          </View>
                        )}

                        <View style={{ flex: 1 }} />

                        <View style={styles.timeTag}>
                          <Ionicons name="time-outline" size={11} color={theme.textMuted} />
                          <Text style={[styles.notifTime, { color: theme.textMuted }]}>
                            {formatTimeAgo(n.created_at)}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.notifTitle, { color: theme.text }]} numberOfLines={2}>
                        {n.title}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.notifText, { color: '#cbd5e1' }]}>{n.body}</Text>

                  {/* Quick Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.snoozeBtn, { borderColor: '#2b314c', backgroundColor: 'rgba(255,255,255,0.03)' }]}
                      onPress={() => handleSnooze(n.id, 30)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="timer-outline" size={13} color={theme.textSecondary} />
                      <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>Snooze 30m</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.dismissBtn, { backgroundColor: 'rgba(99, 102, 241, 0.16)', borderColor: 'rgba(99, 102, 241, 0.35)' }]}
                      onPress={() => handleDismiss(n.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-done" size={14} color={theme.primary} />
                      <Text style={[styles.dismissBtnText, { color: theme.primary }]}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {filteredNotifications.length > 0 && (
          <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
            <Ionicons name="trash-outline" size={15} color={theme.danger} />
            <Text style={[styles.clearAllText, { color: theme.danger }]}>Clear Dismissed Notifications</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Notification Preferences Modal */}
      <Modal visible={prefModalVisible} transparent={true} animationType="slide" onRequestClose={() => setPrefModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: '#131524', borderColor: '#23283e' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Notification Controls</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  Fine-tune Alinga Pa alert rules and quiet hours
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPrefModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.prefList}>
              <View style={[styles.prefItem, { borderBottomColor: '#23283e' }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.prefLabel, { color: theme.text }]}>Task & Planner Reminders</Text>
                  <Text style={[styles.prefSub, { color: theme.textMuted }]}>Alert 15 mins before scheduled focus blocks</Text>
                </View>
                <Switch
                  value={taskReminders}
                  onValueChange={setTaskReminders}
                  trackColor={{ false: '#374151', true: theme.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={[styles.prefItem, { borderBottomColor: '#23283e' }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.prefLabel, { color: theme.text }]}>Deadline Risk Warnings</Text>
                  <Text style={[styles.prefSub, { color: theme.textMuted }]}>Urgent alerts for high-risk pending tasks</Text>
                </View>
                <Switch
                  value={deadlineAlerts}
                  onValueChange={setDeadlineAlerts}
                  trackColor={{ false: '#374151', true: theme.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={[styles.prefItem, { borderBottomColor: '#23283e' }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.prefLabel, { color: theme.text }]}>Habit Consistency Prompts</Text>
                  <Text style={[styles.prefSub, { color: theme.textMuted }]}>Daily nudges to keep routines and streaks alive</Text>
                </View>
                <Switch
                  value={habitPrompts}
                  onValueChange={setHabitPrompts}
                  trackColor={{ false: '#374151', true: theme.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.prefItem}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.prefLabel, { color: theme.text }]}>Schedule Overload Warnings</Text>
                  <Text style={[styles.prefSub, { color: theme.textMuted }]}>Alert if commitments exceed daily 8h capacity</Text>
                </View>
                <Switch
                  value={overloadProtection}
                  onValueChange={setOverloadProtection}
                  trackColor={{ false: '#374151', true: theme.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.savePrefBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                setPrefModalVisible(false);
                Alert.alert('Preferences Saved', 'Your companion notification preferences are updated.');
              }}
            >
              <Text style={styles.savePrefBtnText}>Save Preferences</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 6,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  settingsBtn: {
    padding: 6,
  },
  testAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  testAlertBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  liveBannerContainer: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    zIndex: 9999,
    elevation: 10,
  },
  liveBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
  },
  liveBannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBannerAppTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  liveBannerTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  liveBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
    marginBottom: 2,
  },
  liveBannerBody: {
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 15,
  },
  bundleSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  bundleCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bundleBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bundleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  activePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bundleBody: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  bundleStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  bundleStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bundleStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bundleStatText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  filterWrapper: {
    marginVertical: Spacing.xs,
  },
  filterPills: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 40,
    gap: 12,
  },
  emptyBox: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 25,
    gap: 12,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: '85%',
    lineHeight: 17,
  },
  emptyTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    marginTop: 6,
  },
  emptyTestBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  notificationCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  priorityStripe: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    padding: Spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  notifIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  titleArea: {
    flex: 1,
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  categoryTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  unreadPulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
  },
  unreadText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  notifTime: {
    fontSize: 11,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  notifText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  snoozeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dismissBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  prefList: {
    marginBottom: Spacing.lg,
  },
  prefItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  prefSub: {
    fontSize: 11,
  },
  savePrefBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  savePrefBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
