import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi, tasksApi, notificationsApi } from '../../services/api';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = Colors.dark;

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  const syncLocalAvatar = async () => {
    try {
      const saved = await AsyncStorage.getItem('custom_avatar_uri');
      if (saved) setLocalAvatar(saved);
    } catch (e) {}
  };

  useFocusEffect(
    React.useCallback(() => {
      syncLocalAvatar();
      notificationsApi.pendingCount().then((res) => {
        if (res.data?.pending !== undefined) setUnreadNotifications(res.data.pending);
      }).catch(() => {});
    }, [])
  );

  // Quick Task Modal
  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [quickCategory, setQuickCategory] = useState('work');
  const [submittingQuick, setSubmittingQuick] = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, tasksRes, notifRes] = await Promise.allSettled([
        dashboardApi.stats(),
        tasksApi.list({ limit: 10 }),
        notificationsApi.pendingCount(),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value.data || []);
      if (notifRes.status === 'fulfilled') setUnreadNotifications(notifRes.value.data?.pending || 0);
    } catch (e) {
      console.log('Error loading dashboard', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const toggleTaskStatus = async (task: any) => {
    const isCompleted = task.status === 'done';
    const nextStatus = isCompleted ? 'todo' : 'done';

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );
    setStats((prev: any) => ({
      ...prev,
      pending_tasks: Math.max(0, (prev?.pending_tasks ?? 1) + (nextStatus === 'done' ? -1 : 1)),
    }));

    try {
      if (nextStatus === 'done') {
        await tasksApi.complete(task.id);
      } else {
        await tasksApi.update(task.id, { status: 'todo' });
      }
    } catch (e) {
      loadData();
    }
  };

  const handleCreateQuickTask = async () => {
    if (!quickTitle.trim()) {
      Alert.alert('Required', 'Please enter a task title');
      return;
    }

    setSubmittingQuick(true);
    try {
      const res = await tasksApi.create({
        title: quickTitle.trim(),
        priority: quickPriority,
        category: quickCategory,
        estimated_minutes: 30,
      });
      setTasks((prev) => [res.data, ...prev]);
      setStats((prev: any) => ({
        ...prev,
        pending_tasks: (prev?.pending_tasks ?? 0) + 1,
      }));
      setQuickTitle('');
      setQuickModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to create task');
    } finally {
      setSubmittingQuick(false);
    }
  };

  const pendingCount = tasks.filter((t) => t.status !== 'done').length;
  const activeAvatar = localAvatar || user?.avatar_url;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.headerBrandLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={[styles.greetingText, { color: theme.textMuted }]}>{getGreeting()}</Text>
              <Text style={[styles.userName, { color: theme.text }]}>
                {user?.full_name || user?.username || 'Companion'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              style={[styles.bellButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              onPress={() => router.push('/notifications')}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.text} />
              {unreadNotifications > 0 && (
                <View style={[styles.bellBadge, { backgroundColor: theme.danger }]}>
                  <Text style={styles.bellBadgeText}>{unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.avatarButton, { backgroundColor: user?.avatar_color || theme.primary }]}
              onPress={() => router.push('/(tabs)/profile')}
            >
              {activeAvatar ? (
                <Image source={{ uri: activeAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {(user?.full_name || user?.username || 'A').charAt(0).toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tagline / AI Assistant Banner */}
        <View style={[styles.aiBanner, { backgroundColor: theme.primaryLight, borderColor: theme.cardBorder }]}>
          <View style={styles.aiBannerHeader}>
            <View style={styles.aiIconBadge}>
              <Ionicons name="sparkles" size={16} color="#fff" />
            </View>
            <Text style={[styles.aiBannerTitle, { color: theme.text }]}>Alinga Pa AI Companion</Text>
          </View>
          <Text style={[styles.aiBannerSub, { color: theme.textSecondary }]}>
            {pendingCount === 0
              ? '"Your Life, Our Care. You are completely caught up! Have a relaxing day."'
              : `"Your Life, Our Care. You have ${pendingCount} active priorities today. Ready to focus?"`}
          </Text>
          <TouchableOpacity
            style={[styles.aiBannerButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/(tabs)/ai')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#fff" />
            <Text style={styles.aiBannerButtonText}>Talk with AI</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => router.push('/tasks')}
          >
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Ionicons name="checkbox-outline" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats?.pending_tasks ?? pendingCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Pending Tasks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => router.push('/(tabs)/insights')}
          >
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="flame-outline" size={20} color={theme.success} />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats?.habit_streak ?? 1} Days</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Active Streak</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => router.push('/(tabs)/planner')}
          >
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="hourglass-outline" size={20} color={theme.warning} />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats?.focus_minutes ?? 45}m</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Focus Mode</Text>
          </TouchableOpacity>
        </View>

        {/* Life Hub Quick Shortcuts */}
        <View style={styles.hubShortcutsRow}>
          <TouchableOpacity style={[styles.hubChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={() => router.push('/tasks')}>
            <Ionicons name="checkbox-outline" size={15} color={theme.primary} />
            <Text style={[styles.hubChipText, { color: theme.text }]}>Tasks</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.hubChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={() => router.push('/calendar')}>
            <Ionicons name="calendar-outline" size={15} color="#38bdf8" />
            <Text style={[styles.hubChipText, { color: theme.text }]}>Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.hubChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={() => router.push('/finance')}>
            <Ionicons name="card-outline" size={15} color="#10b981" />
            <Text style={[styles.hubChipText, { color: theme.text }]}>Finance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.hubChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={() => router.push('/vault')}>
            <Ionicons name="shield-checkmark-outline" size={15} color="#f59e0b" />
            <Text style={[styles.hubChipText, { color: theme.text }]}>Vault</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Today's Priorities */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Priorities</Text>
            {pendingCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.countBadgeText, { color: theme.primary }]}>{pendingCount}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => setQuickModalVisible(true)}>
              <Text style={[styles.sectionAction, { color: theme.primary }]}>+ Add</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/tasks')}>
              <Text style={[styles.sectionAction, { color: theme.textSecondary }]}>Manage All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
        ) : tasks.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="checkmark-done-circle-outline" size={36} color={theme.success} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>All clear for today!</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Tap the "+ Add" button or ask the AI assistant to plan your day.
            </Text>
          </View>
        ) : (
          tasks.slice(0, 5).map((task, idx) => {
            const isDone = task.status === 'done';
            return (
              <View
                key={task.id || idx}
                style={[
                  styles.taskCard,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                  isDone && { opacity: 0.65 },
                ]}
              >
                {/* Interactive Checkbox */}
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    isDone
                      ? { backgroundColor: theme.success, borderColor: theme.success }
                      : { borderColor: theme.border },
                  ]}
                  onPress={() => toggleTaskStatus(task)}
                >
                  {isDone && <Ionicons name="checkmark" size={12} color="#fff" />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.taskMiddle}
                  onPress={() => router.push('/tasks')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.taskTitle,
                      { color: theme.text },
                      isDone && styles.taskTitleDone,
                    ]}
                  >
                    {task.title}
                  </Text>
                  <Text style={[styles.taskMeta, { color: theme.textMuted }]}>
                    {task.estimated_minutes ? `${task.estimated_minutes} min` : '30 min'} •{' '}
                    {task.category || 'personal'}
                  </Text>
                </TouchableOpacity>

                <View
                  style={[
                    styles.priorityDot,
                    {
                      backgroundColor:
                        task.priority === 'urgent'
                          ? theme.danger
                          : task.priority === 'high'
                          ? theme.warning
                          : theme.primary,
                    },
                  ]}
                />
              </View>
            );
          })
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}
            onPress={() => setQuickModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>New Task</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.secondary, borderColor: theme.border, borderWidth: 1 }]}
            onPress={() => router.push('/(tabs)/planner')}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.text} />
            <Text style={[styles.actionBtnText, { color: theme.text }]}>Planner</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Quick Task Modal */}
      <Modal
        visible={quickModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setQuickModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Quick Add Priority</Text>
              <TouchableOpacity onPress={() => setQuickModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="What do you need to accomplish?"
              placeholderTextColor={theme.textMuted}
              value={quickTitle}
              onChangeText={setQuickTitle}
              autoFocus
            />

            {/* Priority selection */}
            <Text style={[styles.modalLabel, { color: theme.textMuted }]}>Priority</Text>
            <View style={styles.modalPills}>
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
                const active = quickPriority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.modalPill,
                      { borderColor: active ? theme.primary : theme.border },
                      active && { backgroundColor: theme.primaryLight },
                    ]}
                    onPress={() => setQuickPriority(p)}
                  >
                    <Text style={[styles.modalPillText, { color: active ? theme.primary : theme.textMuted }]}>
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Category selection */}
            <Text style={[styles.modalLabel, { color: theme.textMuted }]}>Category</Text>
            <View style={styles.modalPills}>
              {['work', 'personal', 'health', 'study'].map((c) => {
                const active = quickCategory === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.modalPill,
                      { borderColor: active ? theme.primary : theme.border },
                      active && { backgroundColor: theme.primaryLight },
                    ]}
                    onPress={() => setQuickCategory(c)}
                  >
                    <Text style={[styles.modalPillText, { color: active ? theme.primary : theme.textMuted }]}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
              onPress={handleCreateQuickTask}
              disabled={submittingQuick}
            >
              {submittingQuick ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSaveText}>Create Task</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerBrandLogo: {
    width: 38,
    height: 38,
  },
  greetingText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  aiBanner: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  aiBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  aiBannerSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  aiBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  aiBannerButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  hubShortcutsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  hubChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  hubChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskMiddle: {
    flex: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  taskMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
  modalInput: {
    height: 46,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 6,
  },
  modalPills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  modalPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalSaveBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
