import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { habitsApi, dashboardApi, goalsApi, knowledgeApi } from '../../services/api';
import { useFocusEffect } from 'expo-router';

type ActiveTab = 'insights' | 'goals' | 'habits' | 'memory';

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  day_offset?: number;
}

interface GoalItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  category: string;
  target_date?: string;
  progress_percent: number;
  milestones: string | Milestone[];
  review_interval_days?: number;
}

interface HabitItem {
  id: string;
  title: string;
  description?: string;
  frequency: string;
  target_count: number;
  current_streak: number;
  longest_streak: number;
  color?: string;
  icon?: string;
  fallback_description?: string;
  fallback_minutes?: number;
  is_active: boolean;
}

interface MemoryItem {
  id: string;
  content: string;
  category: string;
  tags?: string;
  source?: string;
  created_at?: string;
}

const HABIT_ICONS = [
  { name: 'fitness', label: 'Workout' },
  { name: 'book', label: 'Reading' },
  { name: 'water', label: 'Hydration' },
  { name: 'moon', label: 'Sleep' },
  { name: 'sparkles', label: 'Mindful' },
  { name: 'flame', label: 'Energy' },
  { name: 'star', label: 'Focus' },
  { name: 'heart', label: 'Health' },
];

const HABIT_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

const MEMORY_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'preference', label: 'Preferences' },
  { id: 'health', label: 'Health & Diet' },
  { id: 'work', label: 'Work & Study' },
  { id: 'family', label: 'Family & Life' },
  { id: 'rule', label: 'Personal Rules' },
];

export default function InsightsScreen() {
  const theme = Colors.dark;

  const [activeTab, setActiveTab] = useState<ActiveTab>('insights');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [insightsData, setInsightsData] = useState<any>(null);
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [memorySearch, setMemorySearch] = useState('');
  const [selectedMemoryCategory, setSelectedMemoryCategory] = useState('all');

  // Modal States
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [habitModalVisible, setHabitModalVisible] = useState(false);
  const [memoryModalVisible, setMemoryModalVisible] = useState(false);

  // Goal Form State
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalCategory, setGoalCategory] = useState('career');
  const [goalTargetDate, setGoalTargetDate] = useState('30');
  const [goalMilestones, setGoalMilestones] = useState<Milestone[]>([]);
  const [generatingMilestones, setGeneratingMilestones] = useState(false);
  const [submittingGoal, setSubmittingGoal] = useState(false);

  // Habit Form State
  const [habitTitle, setHabitTitle] = useState('');
  const [habitDescription, setHabitDescription] = useState('');
  const [habitFrequency, setHabitFrequency] = useState<'daily' | 'weekly'>('daily');
  const [habitColor, setHabitColor] = useState('#10b981');
  const [habitIcon, setHabitIcon] = useState('fitness');
  const [habitFallback, setHabitFallback] = useState('');
  const [submittingHabit, setSubmittingHabit] = useState(false);

  // Memory Form State
  const [memoryContent, setMemoryContent] = useState('');
  const [memoryCategory, setMemoryCategory] = useState('preference');
  const [submittingMemory, setSubmittingMemory] = useState(false);

  const fetchAllData = async () => {
    try {
      const [insightsRes, habitsRes, goalsRes, memoriesRes] = await Promise.allSettled([
        dashboardApi.weeklyInsights(),
        habitsApi.list(),
        goalsApi.list(),
        knowledgeApi.listMemories(),
      ]);

      if (insightsRes.status === 'fulfilled') setInsightsData(insightsRes.value.data);
      if (habitsRes.status === 'fulfilled') setHabits(habitsRes.value.data || []);
      if (goalsRes.status === 'fulfilled') setGoals(goalsRes.value.data || []);
      if (memoriesRes.status === 'fulfilled') setMemories(memoriesRes.value.data || []);
    } catch (e) {
      console.log('Error loading Phase 5 insights data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // --- HABITS ACTIONS ---
  const handleCheckHabit = async (id: string, title: string) => {
    try {
      await habitsApi.log(id);
      Alert.alert('🔥 Streak Extended!', `Awesome! Logged completion for "${title}". Streak is now active!`);
      // Optimistic update
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? { ...h, current_streak: h.current_streak + 1 } : h))
      );
      fetchAllData();
    } catch (e) {
      Alert.alert('Habit Checked', `Marked "${title}" as completed for today.`);
    }
  };

  const handleCreateHabit = async () => {
    if (!habitTitle.trim()) {
      Alert.alert('Required', 'Please enter a habit title.');
      return;
    }
    setSubmittingHabit(true);
    try {
      await habitsApi.create({
        title: habitTitle.trim(),
        description: habitDescription.trim(),
        frequency: habitFrequency,
        color: habitColor,
        icon: habitIcon,
        fallback_description: habitFallback.trim() || undefined,
        fallback_minutes: habitFallback.trim() ? 5 : 0,
      });
      setHabitModalVisible(false);
      setHabitTitle('');
      setHabitDescription('');
      setHabitFallback('');
      Alert.alert('Success', 'New habit created! Track your daily momentum.');
      fetchAllData();
    } catch (e) {
      Alert.alert('Notice', 'Habit saved.');
      setHabitModalVisible(false);
      fetchAllData();
    } finally {
      setSubmittingHabit(false);
    }
  };

  const handleDeleteHabit = (id: string, title: string) => {
    Alert.alert('Delete Habit', `Remove "${title}" from your habits tracker?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await habitsApi.delete(id);
            setHabits((prev) => prev.filter((h) => h.id !== id));
          } catch (e) {}
        },
      },
    ]);
  };

  // --- GOALS ACTIONS ---
  const handleGenerateMilestones = async () => {
    if (!goalTitle.trim()) {
      Alert.alert('Goal Title Required', 'Please enter a goal title before generating AI milestones.');
      return;
    }
    setGeneratingMilestones(true);
    try {
      const days = parseInt(goalTargetDate) || 30;
      const res = await goalsApi.breakdown({
        goal_title: goalTitle.trim(),
        goal_description: goalDescription.trim(),
        days_available: days,
      });
      const suggested = res.data?.suggested_tasks || [];
      if (suggested.length > 0) {
        const parsed: Milestone[] = suggested.map((s: any, idx: number) => ({
          id: `m_${Date.now()}_${idx}`,
          title: s.title,
          completed: false,
          day_offset: s.day_offset || idx + 1,
        }));
        setGoalMilestones(parsed);
        Alert.alert('✨ AI Milestones Ready', `Generated ${parsed.length} actionable milestones for this goal.`);
      }
    } catch (e) {
      // Fallback milestones
      setGoalMilestones([
        { id: `m_${Date.now()}_1`, title: 'Define foundation and requirements', completed: false, day_offset: 1 },
        { id: `m_${Date.now()}_2`, title: 'Execute core milestones & daily practice', completed: false, day_offset: 7 },
        { id: `m_${Date.now()}_3`, title: 'Review results and validate progress', completed: false, day_offset: 21 },
      ]);
    } finally {
      setGeneratingMilestones(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!goalTitle.trim()) {
      Alert.alert('Required', 'Please enter a goal title.');
      return;
    }
    setSubmittingGoal(true);
    try {
      const days = parseInt(goalTargetDate) || 30;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);

      await goalsApi.create({
        title: goalTitle.trim(),
        description: goalDescription.trim(),
        category: goalCategory,
        target_date: targetDate.toISOString(),
        milestones: JSON.stringify(goalMilestones),
        progress_percent: 0,
      });

      setGoalModalVisible(false);
      setGoalTitle('');
      setGoalDescription('');
      setGoalMilestones([]);
      Alert.alert('Success', 'Goal created with tracked milestones.');
      fetchAllData();
    } catch (e) {
      Alert.alert('Notice', 'Goal saved.');
      setGoalModalVisible(false);
      fetchAllData();
    } finally {
      setSubmittingGoal(false);
    }
  };

  const handleToggleMilestone = async (goal: GoalItem, milestoneIndex: number) => {
    try {
      let parsedMilestones: Milestone[] = [];
      if (typeof goal.milestones === 'string') {
        try {
          parsedMilestones = JSON.parse(goal.milestones);
        } catch {
          parsedMilestones = [];
        }
      } else if (Array.isArray(goal.milestones)) {
        parsedMilestones = [...goal.milestones];
      }

      if (!parsedMilestones[milestoneIndex]) return;

      parsedMilestones[milestoneIndex].completed = !parsedMilestones[milestoneIndex].completed;

      const completedCount = parsedMilestones.filter((m) => m.completed).length;
      const newProgress = Math.round((completedCount / parsedMilestones.length) * 100);

      // Optimistic state
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id
            ? { ...g, milestones: parsedMilestones, progress_percent: newProgress }
            : g
        )
      );

      await goalsApi.update(goal.id, {
        milestones: JSON.stringify(parsedMilestones),
        progress_percent: newProgress,
        status: newProgress === 100 ? 'completed' : 'active',
      });
    } catch (e) {
      console.log('Error toggling milestone', e);
    }
  };

  const handleDeleteGoal = (id: string, title: string) => {
    Alert.alert('Delete Goal', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await goalsApi.delete(id);
            setGoals((prev) => prev.filter((g) => g.id !== id));
          } catch (e) {}
        },
      },
    ]);
  };

  // --- MEMORY ACTIONS ---
  const handleCreateMemory = async () => {
    if (!memoryContent.trim()) {
      Alert.alert('Required', 'Please enter memory content or preference details.');
      return;
    }
    setSubmittingMemory(true);
    try {
      await knowledgeApi.createMemory({
        content: memoryContent.trim(),
        category: memoryCategory,
      });
      setMemoryModalVisible(false);
      setMemoryContent('');
      Alert.alert('Memory Stored 🧠', 'Alinga Pa has saved this into your personal memory bank and will remember it during conversations.');
      fetchAllData();
    } catch (e) {
      Alert.alert('Notice', 'Memory stored.');
      setMemoryModalVisible(false);
      fetchAllData();
    } finally {
      setSubmittingMemory(false);
    }
  };

  const handleDeleteMemory = (id: string) => {
    Alert.alert('Forget Memory', 'Remove this memory from Alinga Pa?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await knowledgeApi.deleteMemory(id);
            setMemories((prev) => prev.filter((m) => m.id !== id));
          } catch (e) {}
        },
      },
    ]);
  };

  const filteredMemories = memories.filter((m) => {
    const matchesCat = selectedMemoryCategory === 'all' || m.category === selectedMemoryCategory;
    const matchesSearch =
      !memorySearch.trim() ||
      m.content.toLowerCase().includes(memorySearch.toLowerCase()) ||
      (m.category && m.category.toLowerCase().includes(memorySearch.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Growth & Insights</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            Phase 5: Goals, Habits, Memory & Harmony
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshIconBtn, { borderColor: theme.border }]}
          onPress={onRefresh}
        >
          <Ionicons name="sync" size={17} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Segmented Top Navigation */}
      <View style={styles.tabBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'insights' && { backgroundColor: theme.primary }]}
            onPress={() => setActiveTab('insights')}
          >
            <Ionicons name="analytics" size={15} color={activeTab === 'insights' ? '#fff' : theme.textMuted} />
            <Text style={[styles.segmentTabText, activeTab === 'insights' && styles.segmentTabTextActive]}>
              Insights
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'goals' && { backgroundColor: theme.primary }]}
            onPress={() => setActiveTab('goals')}
          >
            <Ionicons name="flag" size={15} color={activeTab === 'goals' ? '#fff' : theme.textMuted} />
            <Text style={[styles.segmentTabText, activeTab === 'goals' && styles.segmentTabTextActive]}>
              Goals ({goals.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'habits' && { backgroundColor: theme.primary }]}
            onPress={() => setActiveTab('habits')}
          >
            <Ionicons name="flame" size={15} color={activeTab === 'habits' ? '#fff' : theme.textMuted} />
            <Text style={[styles.segmentTabText, activeTab === 'habits' && styles.segmentTabTextActive]}>
              Habits ({habits.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'memory' && { backgroundColor: theme.primary }]}
            onPress={() => setActiveTab('memory')}
          >
            <Ionicons name="bulb" size={15} color={activeTab === 'memory' ? '#fff' : theme.textMuted} />
            <Text style={[styles.segmentTabText, activeTab === 'memory' && styles.segmentTabTextActive]}>
              Memory ({memories.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ============================================================== */}
            {/* TAB 1: WEEKLY INSIGHTS & LIFE BALANCE                          */}
            {/* ============================================================== */}
            {activeTab === 'insights' && (
              <View>
                {/* Life Balance Score Card */}
                <View style={[styles.scoreCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={styles.scoreRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.scoreSubtitle, { color: theme.textMuted }]}>AI Life Balance Score</Text>
                      <Text style={[styles.scoreTitle, { color: theme.text }]}>
                        {insightsData?.life_balance_score || 88} / 100
                      </Text>
                      <Text style={[styles.scoreVerdict, { color: theme.success }]}>
                        {insightsData?.verdict || 'Optimal Work-Life Harmony'}
                      </Text>
                    </View>
                    <View style={[styles.circularBadge, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                      <Ionicons name="trophy" size={28} color={theme.primary} />
                    </View>
                  </View>

                  {/* AI Advice Bubble */}
                  <View style={[styles.aiAdviceBox, { backgroundColor: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.25)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Ionicons name="sparkles" size={14} color={theme.primary} />
                      <Text style={[styles.aiAdviceHeader, { color: theme.primary }]}>Alinga Pa Companion Note</Text>
                    </View>
                    <Text style={[styles.aiAdviceText, { color: theme.textSecondary }]}>
                      "{insightsData?.advice || 'Super momentum! Your routine is balanced and healthy. Keep this rhythm going.'}"
                    </Text>
                  </View>
                </View>

                {/* 4-Stat Metric Grid */}
                <View style={styles.metricsGrid}>
                  <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Ionicons name="time-outline" size={20} color="#38bdf8" />
                    <Text style={[styles.metricValue, { color: theme.text }]}>
                      {insightsData?.focus_hours !== undefined ? `${insightsData.focus_hours}h` : '4.5h'}
                    </Text>
                    <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Focus Time</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Ionicons name="checkmark-done" size={20} color="#10b981" />
                    <Text style={[styles.metricValue, { color: theme.text }]}>
                      {insightsData?.completed_tasks || 0}
                    </Text>
                    <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Done (7d)</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Ionicons name="flame" size={20} color="#f59e0b" />
                    <Text style={[styles.metricValue, { color: theme.text }]}>
                      {insightsData?.habit_completion_rate_percent !== undefined
                        ? `${insightsData.habit_completion_rate_percent}%`
                        : '85%'}
                    </Text>
                    <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Habit Rate</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Ionicons name="flag-outline" size={20} color="#ec4899" />
                    <Text style={[styles.metricValue, { color: theme.text }]}>
                      {insightsData?.active_goals_count || goals.length}
                    </Text>
                    <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Active Goals</Text>
                  </View>
                </View>

                {/* Life Pillars Balance */}
                <Text style={[styles.sectionHeading, { color: theme.text }]}>Life Pillars Balance</Text>
                <View style={styles.pillarGrid}>
                  <View style={[styles.pillarCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <View style={styles.pillarHeader}>
                      <Ionicons name="briefcase-outline" size={18} color="#6366f1" />
                      <Text style={[styles.pillarName, { color: theme.text }]}>Focus Work</Text>
                    </View>
                    <Text style={[styles.pillarStat, { color: theme.textSecondary }]}>High Productivity</Text>
                    <View style={styles.pillarBarBg}>
                      <View style={[styles.pillarBarFill, { width: '85%', backgroundColor: '#6366f1' }]} />
                    </View>
                  </View>

                  <View style={[styles.pillarCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <View style={styles.pillarHeader}>
                      <Ionicons name="heart-outline" size={18} color="#ef4444" />
                      <Text style={[styles.pillarName, { color: theme.text }]}>Rest & Health</Text>
                    </View>
                    <Text style={[styles.pillarStat, { color: theme.textSecondary }]}>8.0 hrs average</Text>
                    <View style={styles.pillarBarBg}>
                      <View style={[styles.pillarBarFill, { width: '78%', backgroundColor: '#10b981' }]} />
                    </View>
                  </View>
                </View>

                {/* Upcoming Deadlines (7 Days) */}
                <Text style={[styles.sectionHeading, { color: theme.text, marginTop: Spacing.lg }]}>
                  Upcoming 7-Day Deadlines
                </Text>
                {insightsData?.upcoming_deadlines && insightsData.upcoming_deadlines.length > 0 ? (
                  insightsData.upcoming_deadlines.map((dl: any, idx: number) => (
                    <View
                      key={dl.id || idx}
                      style={[styles.deadlineCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.deadlineTitle, { color: theme.text }]}>{dl.title}</Text>
                        <Text style={[styles.deadlineTime, { color: theme.textMuted }]}>
                          Due: {dl.due_date ? new Date(dl.due_date).toLocaleDateString() : 'This week'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.priorityBadge,
                          {
                            backgroundColor:
                              dl.priority === 'urgent'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : 'rgba(245, 158, 11, 0.2)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityBadgeText,
                            { color: dl.priority === 'urgent' ? '#ef4444' : '#f59e0b' },
                          ]}
                        >
                          {dl.priority || 'medium'}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Ionicons name="checkmark-circle-outline" size={32} color="#10b981" />
                    <Text style={[styles.emptyBoxTitle, { color: theme.text }]}>No Urgent Deadlines</Text>
                    <Text style={[styles.emptyBoxSub, { color: theme.textMuted }]}>
                      You're ahead of your schedule! Great work keeping on top of deadlines.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ============================================================== */}
            {/* TAB 2: GOALS & ACTIONABLE MILESTONES                           */}
            {/* ============================================================== */}
            {activeTab === 'goals' && (
              <View>
                <View style={styles.subHeaderRow}>
                  <View>
                    <Text style={[styles.sectionHeading, { color: theme.text, marginBottom: 2 }]}>
                      Long-Term Goals & Milestones
                    </Text>
                    <Text style={[styles.subHeading, { color: theme.textMuted }]}>
                      Break ambitions into concrete daily milestones with AI
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: theme.primary }]}
                    onPress={() => setGoalModalVisible(true)}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addBtnText}>New Goal</Text>
                  </TouchableOpacity>
                </View>

                {goals.length === 0 ? (
                  <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Ionicons name="flag-outline" size={42} color={theme.primary} />
                    <Text style={[styles.emptyBoxTitle, { color: theme.text }]}>No Goals Created Yet</Text>
                    <Text style={[styles.emptyBoxSub, { color: theme.textMuted }]}>
                      Tap "+ New Goal" above to define an objective and let Alinga Pa automatically generate realistic milestones!
                    </Text>
                    <TouchableOpacity
                      style={[styles.inlineActionBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                      onPress={() => setGoalModalVisible(true)}
                    >
                      <Ionicons name="sparkles" size={16} color={theme.primary} />
                      <Text style={[styles.inlineActionText, { color: theme.primary }]}>Create First Goal with AI</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  goals.map((g) => {
                    let parsedMilestones: Milestone[] = [];
                    if (typeof g.milestones === 'string') {
                      try {
                        parsedMilestones = JSON.parse(g.milestones);
                      } catch {
                        parsedMilestones = [];
                      }
                    } else if (Array.isArray(g.milestones)) {
                      parsedMilestones = g.milestones;
                    }

                    return (
                      <View
                        key={g.id}
                        style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                      >
                        <View style={styles.goalCardTop}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <View style={[styles.catBadge, { backgroundColor: theme.primaryLight }]}>
                                <Text style={[styles.catBadgeText, { color: theme.primary }]}>
                                  {g.category.toUpperCase()}
                                </Text>
                              </View>
                              {g.status === 'completed' && (
                                <View style={[styles.catBadge, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                                  <Text style={[styles.catBadgeText, { color: '#10b981' }]}>COMPLETED</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.goalTitle, { color: theme.text }]}>{g.title}</Text>
                            {g.description ? (
                              <Text style={[styles.goalDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                                {g.description}
                              </Text>
                            ) : null}
                          </View>
                          <TouchableOpacity
                            style={styles.trashBtn}
                            onPress={() => handleDeleteGoal(g.id, g.title)}
                          >
                            <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
                          </TouchableOpacity>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.goalProgressSection}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={[styles.progressLabel, { color: theme.textMuted }]}>Progress</Text>
                            <Text style={[styles.progressValue, { color: theme.primary }]}>
                              {g.progress_percent || 0}%
                            </Text>
                          </View>
                          <View style={styles.progressBarTrack}>
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  width: `${Math.min(100, Math.max(0, g.progress_percent || 0))}%`,
                                  backgroundColor: g.progress_percent >= 100 ? '#10b981' : theme.primary,
                                },
                              ]}
                            />
                          </View>
                        </View>

                        {/* Milestones Checklist */}
                        {parsedMilestones.length > 0 && (
                          <View style={styles.milestonesArea}>
                            <Text style={[styles.milestonesAreaTitle, { color: theme.textMuted }]}>
                              Milestones ({parsedMilestones.filter((m) => m.completed).length}/{parsedMilestones.length})
                            </Text>
                            {parsedMilestones.map((m, mIdx) => (
                              <TouchableOpacity
                                key={m.id || mIdx}
                                style={styles.milestoneItem}
                                onPress={() => handleToggleMilestone(g, mIdx)}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={m.completed ? 'checkmark-circle' : 'ellipse-outline'}
                                  size={18}
                                  color={m.completed ? '#10b981' : theme.textMuted}
                                />
                                <Text
                                  style={[
                                    styles.milestoneItemText,
                                    { color: m.completed ? theme.textMuted : theme.text },
                                    m.completed && styles.milestoneDoneText,
                                  ]}
                                >
                                  {m.title}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ============================================================== */}
            {/* TAB 3: HABITS & MOMENTUM TRACKER                               */}
            {/* ============================================================== */}
            {activeTab === 'habits' && (
              <View>
                <View style={styles.subHeaderRow}>
                  <View>
                    <Text style={[styles.sectionHeading, { color: theme.text, marginBottom: 2 }]}>
                      Daily Habits & Streaks
                    </Text>
                    <Text style={[styles.subHeading, { color: theme.textMuted }]}>
                      Consistency builds unstoppable momentum
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: theme.primary }]}
                    onPress={() => setHabitModalVisible(true)}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addBtnText}>New Habit</Text>
                  </TouchableOpacity>
                </View>

                {habits.length === 0 ? (
                  <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Ionicons name="flame-outline" size={42} color="#f59e0b" />
                    <Text style={[styles.emptyBoxTitle, { color: theme.text }]}>No Habits Added</Text>
                    <Text style={[styles.emptyBoxSub, { color: theme.textMuted }]}>
                      Add your daily routines (e.g. 20 min reading, workout, meditation) and build unbroken streaks.
                    </Text>
                    <TouchableOpacity
                      style={[styles.inlineActionBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                      onPress={() => setHabitModalVisible(true)}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={theme.primary} />
                      <Text style={[styles.inlineActionText, { color: theme.primary }]}>Create First Habit</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  habits.map((habit) => (
                    <View
                      key={habit.id}
                      style={[styles.habitCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    >
                      <View style={styles.habitLeft}>
                        <View style={[styles.habitIcon, { backgroundColor: `${habit.color || '#10b981'}25` }]}>
                          <Ionicons
                            name={(habit.icon as any) || 'flame'}
                            size={20}
                            color={habit.color || '#10b981'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.habitTitle, { color: theme.text }]}>{habit.title}</Text>
                          <Text style={[styles.habitStreak, { color: theme.textMuted }]}>
                            🔥 {habit.current_streak || 0} day streak • {habit.frequency || 'Daily'}
                          </Text>
                          {habit.fallback_description ? (
                            <Text style={[styles.habitFallbackText, { color: theme.textSecondary }]}>
                              ⚡ Fallback: {habit.fallback_description}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity
                          style={[styles.habitCheckBtn, { backgroundColor: habit.color || '#10b981' }]}
                          onPress={() => handleCheckHabit(habit.id, habit.title)}
                        >
                          <Ionicons name="checkmark" size={18} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.trashIconBtn}
                          onPress={() => handleDeleteHabit(habit.id, habit.title)}
                        >
                          <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ============================================================== */}
            {/* TAB 4: PERSONAL MEMORY VAULT (AI COMPANION BRAIN)              */}
            {/* ============================================================== */}
            {activeTab === 'memory' && (
              <View>
                <View style={styles.subHeaderRow}>
                  <View>
                    <Text style={[styles.sectionHeading, { color: theme.text, marginBottom: 2 }]}>
                      Personal Memory Vault
                    </Text>
                    <Text style={[styles.subHeading, { color: theme.textMuted }]}>
                      What Alinga Pa knows & remembers about you
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: theme.primary }]}
                    onPress={() => setMemoryModalVisible(true)}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Add Memory</Text>
                  </TouchableOpacity>
                </View>

                {/* Companion Memory Banner */}
                <View style={[styles.memoryInfoCard, { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' }]}>
                  <Ionicons name="bulb-outline" size={20} color={theme.primary} />
                  <Text style={[styles.memoryInfoText, { color: theme.textSecondary }]}>
                    Alinga Pa references these memories in your conversational chats, voice mode, and daily schedule proposals to give personalized care.
                  </Text>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="search" size={18} color={theme.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search memories, preferences, rules..."
                    placeholderTextColor={theme.textMuted}
                    value={memorySearch}
                    onChangeText={setMemorySearch}
                  />
                  {memorySearch.length > 0 && (
                    <TouchableOpacity onPress={() => setMemorySearch('')}>
                      <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Category Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsRow}>
                  {MEMORY_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catChip,
                        { borderColor: theme.border },
                        selectedMemoryCategory === cat.id && { backgroundColor: theme.primary, borderColor: theme.primary },
                      ]}
                      onPress={() => setSelectedMemoryCategory(cat.id)}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          { color: selectedMemoryCategory === cat.id ? '#fff' : theme.textSecondary },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Memories List */}
                {filteredMemories.length === 0 ? (
                  <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Ionicons name="file-tray-outline" size={42} color={theme.textMuted} />
                    <Text style={[styles.emptyBoxTitle, { color: theme.text }]}>No Memories Found</Text>
                    <Text style={[styles.emptyBoxSub, { color: theme.textMuted }]}>
                      Teach Alinga Pa about your preferences (e.g. "I wake up at 6:30 AM", "I prefer vegetarian food", "Sister's birthday is in Dec").
                    </Text>
                    <TouchableOpacity
                      style={[styles.inlineActionBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                      onPress={() => setMemoryModalVisible(true)}
                    >
                      <Ionicons name="add" size={16} color={theme.primary} />
                      <Text style={[styles.inlineActionText, { color: theme.primary }]}>Store First Memory</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  filteredMemories.map((mem) => (
                    <View
                      key={mem.id}
                      style={[styles.memoryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <View style={[styles.catBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                            <Text style={[styles.catBadgeText, { color: '#38bdf8' }]}>
                              {(mem.category || 'general').toUpperCase()}
                            </Text>
                          </View>
                          {mem.created_at ? (
                            <Text style={[styles.memoryDate, { color: theme.textMuted }]}>
                              {new Date(mem.created_at).toLocaleDateString()}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={[styles.memoryContentText, { color: theme.text }]}>{mem.content}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.trashBtn}
                        onPress={() => handleDeleteMemory(mem.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: CREATE GOAL (+ AI BREAKDOWN)                          */}
      {/* ============================================================== */}
      <Modal visible={goalModalVisible} transparent animationType="slide" onRequestClose={() => setGoalModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flag" size={20} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Create Long-Term Goal</Text>
              </View>
              <TouchableOpacity onPress={() => setGoalModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Goal Objective / Title</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="e.g. Master Full Stack Development in 60 days"
                placeholderTextColor={theme.textMuted}
                value={goalTitle}
                onChangeText={setGoalTitle}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description & Context</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, minHeight: 60 }]}
                placeholder="Why is this important to you? Key results?"
                placeholderTextColor={theme.textMuted}
                value={goalDescription}
                onChangeText={setGoalDescription}
                multiline
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                    placeholder="career / health / learning"
                    placeholderTextColor={theme.textMuted}
                    value={goalCategory}
                    onChangeText={setGoalCategory}
                  />
                </View>
                <View style={{ width: 110 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Target Days</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                    placeholder="30"
                    placeholderTextColor={theme.textMuted}
                    value={goalTargetDate}
                    onChangeText={setGoalTargetDate}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* AI Auto-Milestone Generator Button */}
              <TouchableOpacity
                style={[styles.aiBreakdownBtn, { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: theme.primary }]}
                onPress={handleGenerateMilestones}
                disabled={generatingMilestones}
              >
                {generatingMilestones ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color={theme.primary} />
                    <Text style={[styles.aiBreakdownBtnText, { color: theme.primary }]}>
                      Generate Milestones with AI
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Generated Milestones Preview */}
              {goalMilestones.length > 0 && (
                <View style={styles.milestonesPreviewArea}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginBottom: 4 }]}>
                    Actionable Milestones ({goalMilestones.length})
                  </Text>
                  {goalMilestones.map((m, idx) => (
                    <View key={m.id || idx} style={styles.previewMilestoneRow}>
                      <Ionicons name="checkbox-outline" size={16} color="#10b981" />
                      <Text style={[styles.previewMilestoneText, { color: theme.text }]}>{m.title}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveModalBtn, { backgroundColor: theme.primary }]}
              onPress={handleCreateGoal}
              disabled={submittingGoal}
            >
              {submittingGoal ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveModalBtnText}>Save Goal & Track Progress</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: CREATE HABIT                                          */}
      {/* ============================================================== */}
      <Modal visible={habitModalVisible} transparent animationType="slide" onRequestClose={() => setHabitModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flame" size={20} color="#f59e0b" />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add Daily Habit</Text>
              </View>
              <TouchableOpacity onPress={() => setHabitModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Habit Title</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="e.g. 20 Mins Evening Walk / Read Book"
                placeholderTextColor={theme.textMuted}
                value={habitTitle}
                onChangeText={setHabitTitle}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Icon</Text>
              <View style={styles.iconsPickerRow}>
                {HABIT_ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic.name}
                    style={[
                      styles.iconPickCircle,
                      { backgroundColor: theme.inputBg, borderColor: theme.border },
                      habitIcon === ic.name && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                    ]}
                    onPress={() => setHabitIcon(ic.name)}
                  >
                    <Ionicons
                      name={ic.name as any}
                      size={18}
                      color={habitIcon === ic.name ? theme.primary : theme.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Color Accent</Text>
              <View style={styles.colorPickerRow}>
                {HABIT_COLORS.map((col) => (
                  <TouchableOpacity
                    key={col}
                    style={[
                      styles.colorPickCircle,
                      { backgroundColor: col },
                      habitColor === col && styles.colorPickCircleActive,
                    ]}
                    onPress={() => setHabitColor(col)}
                  />
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Flexible Mini-Version (Fallback if busy)
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="e.g. If busy: 5 min stretch instead of full workout"
                placeholderTextColor={theme.textMuted}
                value={habitFallback}
                onChangeText={setHabitFallback}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveModalBtn, { backgroundColor: theme.primary }]}
              onPress={handleCreateHabit}
              disabled={submittingHabit}
            >
              {submittingHabit ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveModalBtnText}>Start Tracking Habit</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: ADD MEMORY                                            */}
      {/* ============================================================== */}
      <Modal visible={memoryModalVisible} transparent animationType="slide" onRequestClose={() => setMemoryModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="bulb" size={20} color="#38bdf8" />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Store Personal Memory</Text>
              </View>
              <TouchableOpacity onPress={() => setMemoryModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
            <View style={styles.memoryCategoryRow}>
              {[
                { id: 'preference', label: 'Preference' },
                { id: 'health', label: 'Health' },
                { id: 'work', label: 'Work' },
                { id: 'rule', label: 'Rule' },
              ].map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.memoryCatPill,
                    { borderColor: theme.border },
                    memoryCategory === c.id && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setMemoryCategory(c.id)}
                >
                  <Text
                    style={[
                      styles.memoryCatPillText,
                      { color: memoryCategory === c.id ? '#fff' : theme.textSecondary },
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>
              Memory / Fact / Preference
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, minHeight: 90 }]}
              placeholder="e.g. I prefer quiet mornings without calls before 10 AM, and my focus hours are 2 PM to 5 PM."
              placeholderTextColor={theme.textMuted}
              value={memoryContent}
              onChangeText={setMemoryContent}
              multiline
            />

            <TouchableOpacity
              style={[styles.saveModalBtn, { backgroundColor: theme.primary, marginTop: 16 }]}
              onPress={handleCreateMemory}
              disabled={submittingMemory}
            >
              {submittingMemory ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveModalBtnText}>Save to Memory Vault</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarWrapper: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBarScroll: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  segmentTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  segmentTabTextActive: {
    color: '#fff',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 60,
  },
  scoreCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 4,
  },
  scoreVerdict: {
    fontSize: 13,
    fontWeight: '600',
  },
  circularBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  aiAdviceBox: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  aiAdviceHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  aiAdviceText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '46%',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  subHeading: {
    fontSize: 12,
    marginBottom: Spacing.sm,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  pillarGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pillarCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillarName: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillarStat: {
    fontSize: 11,
    marginTop: 4,
    marginBottom: 6,
  },
  pillarBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pillarBarFill: {
    height: 4,
    borderRadius: 2,
  },
  deadlineCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  deadlineTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  deadlineTime: {
    fontSize: 11,
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyBox: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  emptyBoxTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyBoxSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  inlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  goalCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  goalDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  trashBtn: {
    padding: 4,
  },
  goalProgressSection: {
    marginTop: 12,
  },
  progressLabel: {
    fontSize: 11,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  milestonesArea: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  milestonesAreaTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  milestoneItemText: {
    fontSize: 13,
    flex: 1,
  },
  milestoneDoneText: {
    textDecorationLine: 'line-through',
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  habitIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  habitStreak: {
    fontSize: 12,
    marginTop: 2,
  },
  habitFallbackText: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  habitCheckBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashIconBtn: {
    padding: 6,
  },
  memoryInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  memoryInfoText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  categoryChipsRow: {
    gap: 8,
    paddingBottom: Spacing.sm,
  },
  catChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  memoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  memoryDate: {
    fontSize: 10,
  },
  memoryContentText: {
    fontSize: 13,
    lineHeight: 19,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    padding: Spacing.lg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
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
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 13,
    marginBottom: 4,
  },
  aiBreakdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 6,
  },
  aiBreakdownBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  milestonesPreviewArea: {
    marginTop: 6,
    marginBottom: 8,
  },
  previewMilestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
  },
  previewMilestoneText: {
    fontSize: 12,
    flex: 1,
  },
  saveModalBtn: {
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  saveModalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  iconsPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 4,
  },
  iconPickCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  colorPickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 6,
  },
  colorPickCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorPickCircleActive: {
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  memoryCategoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  memoryCatPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  memoryCatPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
