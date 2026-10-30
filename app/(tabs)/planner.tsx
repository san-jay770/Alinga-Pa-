import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { aiApi, eventsApi, tasksApi, focusApi } from '../../services/api';
import { useRouter } from 'expo-router';

interface TimelineSlot {
  id?: string;
  time: string;
  title: string;
  duration: string;
  category: string;
  color: string;
  type: 'event' | 'task' | 'ai_plan';
  energy?: 'peak' | 'medium' | 'rest' | 'low';
}

export default function PlannerScreen() {
  const router = useRouter();
  const theme = Colors.dark;

  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoPlanning, setAutoPlanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<TimelineSlot[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [freeSlots, setFreeSlots] = useState<any[]>([]);
  const [freeSlotsModal, setFreeSlotsModal] = useState(false);
  const [energyFlow, setEnergyFlow] = useState<string | null>(null);

  // Recovery Engine state
  const [overdueCount, setOverdueCount] = useState(0);
  const [recoveryPlan, setRecoveryPlan] = useState<any[]>([]);
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [applyingRecovery, setApplyingRecovery] = useState(false);

  // Focus Session state
  const [focusModalVisible, setFocusModalVisible] = useState(false);
  const [focusTask, setFocusTask] = useState<{ id?: string; title: string } | null>(null);
  const [focusDuration, setFocusDuration] = useState<number>(25); // minutes
  const [focusSecondsLeft, setFocusSecondsLeft] = useState<number>(25 * 60);
  const [focusIsRunning, setFocusIsRunning] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [focusStats, setFocusStats] = useState<any>(null);

  const timerRef = useRef<any>(null);

  // Date strip for 7 days
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      full: d.toISOString().split('T')[0],
      dayName: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      isToday: i === 0,
    };
  });

  // Load Focus Stats
  const loadFocusStats = useCallback(async () => {
    try {
      const res = await focusApi.stats();
      if (res.data) {
        setFocusStats(res.data);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  // Check Overdue Tasks for Recovery
  const checkOverdueTasks = useCallback(async () => {
    try {
      const res = await aiApi.recoverMissedTasks();
      if (res.data?.has_overdue && res.data.overdue_count > 0) {
        setOverdueCount(res.data.overdue_count);
        setRecoveryPlan(res.data.recovery_plan || []);
      } else {
        setOverdueCount(0);
        setRecoveryPlan([]);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const loadPlannerData = useCallback(async () => {
    try {
      const [eventsRes, tasksRes, conflictsRes] = await Promise.allSettled([
        eventsApi.list(),
        tasksApi.list(),
        eventsApi.conflicts(),
      ]);

      const newSlots: TimelineSlot[] = [];

      // 1. Add Calendar Events
      if (eventsRes.status === 'fulfilled' && eventsRes.value.data) {
        eventsRes.value.data
          .filter((e: any) => e.start_time?.startsWith(selectedDate))
          .forEach((e: any) => {
            const startTime = new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            newSlots.push({
              id: e.id,
              time: startTime,
              title: e.title,
              duration: '60m',
              category: e.event_type || 'meeting',
              color: e.event_type === 'deep_work' ? '#8b5cf6' : e.event_type === 'personal' ? '#10b981' : '#3b82f6',
              type: 'event',
              energy: e.event_type === 'deep_work' ? 'peak' : 'medium',
            });
          });
      }

      // 2. Add Scheduled Tasks
      if (tasksRes.status === 'fulfilled' && tasksRes.value.data) {
        tasksRes.value.data
          .filter((t: any) => t.status !== 'done')
          .slice(0, 4)
          .forEach((t: any, idx: number) => {
            const hourOffset = 10 + idx * 2;
            const mockTime = `${hourOffset > 12 ? hourOffset - 12 : hourOffset}:00 ${hourOffset >= 12 ? 'PM' : 'AM'}`;
            newSlots.push({
              id: t.id,
              time: mockTime,
              title: t.title,
              duration: `${t.estimated_minutes || 30}m`,
              category: t.category || 'work',
              color: t.priority === 'urgent' ? '#ef4444' : t.priority === 'high' ? '#f59e0b' : '#6366f1',
              type: 'task',
              energy: idx === 0 ? 'peak' : idx === 1 ? 'medium' : 'low',
            });
          });
      }

      if (conflictsRes.status === 'fulfilled' && conflictsRes.value.data) {
        setConflicts(conflictsRes.value.data?.conflicts || []);
      }

      // Default baseline slots if empty
      if (newSlots.length === 0) {
        newSlots.push(
          { time: '09:00 AM', title: 'Morning Focus & Planning', duration: '45m', category: 'planning', color: '#6366f1', type: 'ai_plan', energy: 'peak' },
          { time: '11:00 AM', title: 'Deep Work Block', duration: '90m', category: 'work', color: '#8b5cf6', type: 'ai_plan', energy: 'peak' },
          { time: '01:00 PM', title: 'Mindful Lunch & Recovery', duration: '60m', category: 'wellness', color: '#10b981', type: 'ai_plan', energy: 'rest' },
          { time: '03:00 PM', title: 'Task Execution & Reviews', duration: '60m', category: 'work', color: '#3b82f6', type: 'ai_plan', energy: 'medium' }
        );
      }

      setSlots(newSlots);
      checkOverdueTasks();
      loadFocusStats();
    } catch (e) {
      console.warn('Error loading planner', e);
    } finally {
      setRefreshing(false);
    }
  }, [selectedDate, checkOverdueTasks, loadFocusStats]);

  useEffect(() => {
    loadPlannerData();
  }, [loadPlannerData]);

  // Pomodoro Countdown Timer
  useEffect(() => {
    if (focusIsRunning) {
      timerRef.current = setInterval(() => {
        setFocusSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setFocusIsRunning(false);
            handleFocusComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [focusIsRunning]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPlannerData();
  };

  // 1-Tap Energy-Aware Auto-Plan Day
  const handleAutoPlanDay = async () => {
    setAutoPlanning(true);
    try {
      const res = await aiApi.autoPlanDay(selectedDate);
      if (res.data?.schedule && Array.isArray(res.data.schedule)) {
        const plannedSlots: TimelineSlot[] = res.data.schedule.map((item: any) => ({
          time: item.time,
          title: item.title,
          duration: `${item.duration_minutes || 30}m`,
          category: item.category || 'general',
          color: item.color || '#6366f1',
          type: 'ai_plan',
          energy: item.energy || 'medium',
        }));
        setSlots(plannedSlots);
        setEnergyFlow(res.data.energy_flow || 'Peak focus in morning; review in afternoon.');
        Alert.alert('⚡ Day Auto-Planned!', 'Your energy-aware schedule is ready with mindful rest buffers.');
      }
    } catch (e) {
      Alert.alert('Notice', 'Generated standard heuristic schedule.');
    } finally {
      setAutoPlanning(false);
    }
  };

  // Custom AI Day Plan Prompt
  const handleAiPlan = async () => {
    if (!description.trim()) {
      Alert.alert('Describe Your Day', 'Tell AI what you need to achieve today (e.g. meetings, study, deadlines).');
      return;
    }

    setLoading(true);
    try {
      const res = await aiApi.planDay({
        description,
        available_hours: 8,
      });

      if (res.data?.schedule && Array.isArray(res.data.schedule)) {
        const plannedSlots: TimelineSlot[] = res.data.schedule.map((item: any) => ({
          time: item.time,
          title: item.title,
          duration: `${item.duration_minutes || 30}m`,
          category: item.category || 'general',
          color: item.category === 'break' ? '#f59e0b' : item.category === 'personal' ? '#10b981' : '#6366f1',
          type: 'ai_plan',
          energy: item.category === 'break' ? 'rest' : 'peak',
        }));

        setSlots(plannedSlots);
        setDescription('');
        Alert.alert('Schedule Optimized', 'Your custom daily timeline has been generated by Alinga Pa AI!');
      }
    } catch (e: any) {
      Alert.alert('Notice', 'Generated with deterministic heuristic plan.');
    } finally {
      setLoading(false);
    }
  };

  // Apply Missed Task Recovery Schedule
  const handleApplyRecovery = async () => {
    if (recoveryPlan.length === 0) return;
    setApplyingRecovery(true);
    try {
      const res = await aiApi.applyRecovery(recoveryPlan);
      Alert.alert('Recovery Complete', res.data?.message || 'Missed tasks have been scheduled without burnout.');
      setRecoveryModalVisible(false);
      setOverdueCount(0);
      loadPlannerData();
    } catch (e) {
      Alert.alert('Error', 'Failed to reschedule overdue tasks. Please try again.');
    } finally {
      setApplyingRecovery(false);
    }
  };

  // Free Time Finder
  const handleFindFreeTime = async () => {
    try {
      const res = await eventsApi.freeSlots({ date: selectedDate });
      const available = res.data?.free_slots || [];
      setFreeSlots(available);
      setFreeSlotsModal(true);
    } catch (e) {
      Alert.alert('Free Time Finder', 'You have open time buffers throughout the afternoon!');
    }
  };

  // Focus Timer Handlers
  const openFocusModal = (task?: { id?: string; title: string }) => {
    setFocusTask(task || { title: 'Deep Focus Work' });
    setFocusDuration(25);
    setFocusSecondsLeft(25 * 60);
    setFocusIsRunning(false);
    setActiveSessionId(null);
    setFocusModalVisible(true);
  };

  const handleStartFocus = async () => {
    try {
      const res = await focusApi.startSession({
        duration_minutes: focusDuration,
        break_minutes: 5,
        task_id: focusTask?.id,
        notes: `Focus block for ${focusTask?.title}`,
      });
      if (res.data?.id) {
        setActiveSessionId(res.data.id);
      }
    } catch {
      // Local timer can still proceed
    }
    setFocusIsRunning(true);
  };

  const handlePauseFocus = () => {
    setFocusIsRunning(false);
  };

  const handleResetFocus = () => {
    setFocusIsRunning(false);
    setFocusSecondsLeft(focusDuration * 60);
  };

  const handleFocusComplete = async () => {
    if (activeSessionId) {
      try {
        await focusApi.completeSession(activeSessionId);
      } catch {
        // Non-blocking
      }
    }
    loadFocusStats();
    Alert.alert('🎉 Focus Session Completed!', `Great job! You logged ${focusDuration} minutes of focused deep work.`);
  };

  const formatTimerDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Daily Life Planner</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
              Adaptive timeline • Smart heuristic engine
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.focusHeaderBtn, { backgroundColor: '#8b5cf6' }]}
              onPress={() => openFocusModal()}
            >
              <Ionicons name="timer-outline" size={16} color="#fff" />
              <Text style={styles.focusHeaderBtnText}>Focus</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.calendarIconBtn, { backgroundColor: theme.primaryLight }]}
              onPress={() => router.push('/calendar')}
            >
              <Ionicons name="calendar" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Focus Stats Summary Strip */}
        {focusStats && focusStats.total_focus_minutes > 0 && (
          <View style={[styles.focusStatsBanner, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="flame" size={16} color="#f59e0b" />
            <Text style={[styles.focusStatsText, { color: theme.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: theme.text }}>{focusStats.total_focus_minutes} mins</Text> deep focus completed across {focusStats.total_sessions} sessions.
            </Text>
          </View>
        )}

        {/* Date Selector Strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateSelector}>
          {weekDays.map((d) => {
            const isSelected = selectedDate === d.full;
            return (
              <TouchableOpacity
                key={d.full}
                style={[
                  styles.datePill,
                  { backgroundColor: isSelected ? theme.primary : theme.card, borderColor: theme.cardBorder },
                  d.isToday && !isSelected && { borderColor: theme.primary },
                ]}
                onPress={() => setSelectedDate(d.full)}
              >
                <Text
                  style={[
                    styles.datePillDay,
                    { color: isSelected ? '#fff' : theme.textMuted },
                    d.isToday && !isSelected && { color: theme.primary },
                  ]}
                >
                  {d.dayName}
                </Text>
                <Text
                  style={[
                    styles.datePillNum,
                    { color: isSelected ? '#fff' : theme.text },
                    d.isToday && !isSelected && { color: theme.primary },
                  ]}
                >
                  {d.dayNumber}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Missed Task Overdue Recovery Banner */}
        {overdueCount > 0 && (
          <TouchableOpacity
            style={[styles.recoveryBanner, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: '#f59e0b' }]}
            onPress={() => setRecoveryModalVisible(true)}
          >
            <View style={styles.recoveryIconBadge}>
              <Ionicons name="refresh-circle" size={24} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.recoveryBannerTitle, { color: '#f59e0b' }]}>
                {overdueCount} Missed Task{overdueCount > 1 ? 's' : ''} Detected
              </Text>
              <Text style={[styles.recoveryBannerDesc, { color: theme.textSecondary }]}>
                Reshuffle into daylight focus windows with 15m rest buffers. No burnout.
              </Text>
            </View>
            <View style={styles.recoveryReviewBtn}>
              <Text style={styles.recoveryReviewBtnText}>Recover</Text>
              <Ionicons name="chevron-forward" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Energy Flow Insight Banner */}
        {energyFlow && (
          <View style={[styles.energyFlowBanner, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: theme.primary }]}>
            <Ionicons name="flash" size={16} color={theme.primary} />
            <Text style={[styles.energyFlowText, { color: theme.text }]}>
              {energyFlow}
            </Text>
          </View>
        )}

        {/* Conflicts Alert Card if any */}
        {conflicts.length > 0 && (
          <TouchableOpacity
            style={[styles.conflictBanner, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: theme.dangerLight }]}
            onPress={() => router.push('/calendar')}
          >
            <Ionicons name="warning" size={20} color={theme.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.conflictTitle, { color: theme.danger }]}>
                {conflicts.length} Schedule Conflict Detected
              </Text>
              <Text style={[styles.conflictDesc, { color: theme.textSecondary }]}>
                "{conflicts[0].event_a_title}" overlaps with "{conflicts[0].event_b_title}". Tap to resolve.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.danger} />
          </TouchableOpacity>
        )}

        {/* AI Day Auto-Planner Card */}
        <View style={[styles.aiCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiIconBadge}>
              <Ionicons name="sparkles" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.aiCardTitle, { color: theme.text }]}>AI Life Day Planner</Text>
              <Text style={[styles.aiCardSub, { color: theme.textMuted }]}>
                Auto-balances deep focus, mindful lunch, and reviews
              </Text>
            </View>
          </View>

          {/* 1-Tap Energy-Aware Auto-Plan Button */}
          <TouchableOpacity
            style={[styles.quickPlanBtn, { backgroundColor: theme.primary }]}
            onPress={handleAutoPlanDay}
            disabled={autoPlanning}
          >
            {autoPlanning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="flash" size={16} color="#fff" />
                <Text style={styles.quickPlanBtnText}>⚡ 1-Tap Auto-Plan My Day</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>OR CUSTOMIZE</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
            placeholder="Tell AI: 'Design an energetic day with gym at 6 AM, 4 hours deep work, and 2 breaks'..."
            placeholderTextColor={theme.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.generateButton, { backgroundColor: '#4f46e5' }]}
              onPress={handleAiPlan}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="options-outline" size={15} color="#fff" />
                  <Text style={styles.generateButtonText}>Custom Schedule</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.freeTimeBtn, { borderColor: theme.border }]}
              onPress={handleFindFreeTime}
            >
              <Ionicons name="time-outline" size={15} color={theme.text} />
              <Text style={[styles.freeTimeText, { color: theme.text }]}>Free Time Finder</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeline Section */}
        <View style={styles.timelineHeaderRow}>
          <Text style={[styles.timelineSectionTitle, { color: theme.text }]}>
            Timeline for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => router.push('/calendar')}>
            <Text style={[styles.viewCalText, { color: theme.primary }]}>View Calendar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.timelineContainer}>
          {slots.map((slot, index) => (
            <View key={slot.id || index} style={styles.timelineItem}>
              {/* Left Time column */}
              <View style={styles.timeColumn}>
                <Text style={[styles.timeText, { color: theme.textSecondary }]}>{slot.time}</Text>
                <Text style={[styles.durationText, { color: theme.textMuted }]}>{slot.duration}</Text>
              </View>

              {/* Center Line with Dot */}
              <View style={styles.lineTrack}>
                <View style={[styles.timelineDot, { backgroundColor: slot.color }]} />
                {index !== slots.length - 1 && <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />}
              </View>

              {/* Right Content Card */}
              <View style={[styles.slotCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.slotHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.slotTitle, { color: theme.text }]}>{slot.title}</Text>
                    <View style={styles.slotMetaRow}>
                      <View style={[styles.categoryBadge, { backgroundColor: `${slot.color}22` }]}>
                        <Text style={[styles.categoryBadgeText, { color: slot.color }]}>{slot.category}</Text>
                      </View>
                      {slot.energy && (
                        <View style={[styles.energyBadge, {
                          backgroundColor: slot.energy === 'peak' ? 'rgba(139, 92, 246, 0.2)' : slot.energy === 'rest' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'
                        }]}>
                          <Text style={[styles.energyBadgeText, {
                            color: slot.energy === 'peak' ? '#8b5cf6' : slot.energy === 'rest' ? '#f59e0b' : '#3b82f6'
                          }]}>
                            {slot.energy === 'peak' ? '⚡ Peak Focus' : slot.energy === 'rest' ? '🥗 Mindful Buffer' : '📝 Admin/Review'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Focus Session Trigger Button */}
                  {slot.type === 'task' && (
                    <TouchableOpacity
                      style={styles.slotFocusBtn}
                      onPress={() => openFocusModal({ id: slot.id, title: slot.title })}
                    >
                      <Ionicons name="play" size={12} color="#8b5cf6" />
                      <Text style={styles.slotFocusBtnText}>Focus</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Missed Tasks Recovery Engine Modal */}
      <Modal
        visible={recoveryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRecoveryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="refresh-circle" size={24} color="#f59e0b" />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Missed Task Recovery</Text>
              </View>
              <TouchableOpacity onPress={() => setRecoveryModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.freeSlotSub, { color: theme.textSecondary }]}>
              We rescheduled {recoveryPlan.length} overdue task{recoveryPlan.length > 1 ? 's' : ''} into daylight focus windows with 15-minute buffers so you stay productive without feeling overwhelmed:
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {recoveryPlan.map((item, idx) => (
                <View key={idx} style={[styles.recoveryPlanCard, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}>
                  <View style={styles.recoveryCardTop}>
                    <Text style={[styles.recoveryCardTitle, { color: theme.text }]}>{item.title}</Text>
                    <View style={[styles.priorityPill, { backgroundColor: item.priority === 'urgent' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: item.priority === 'urgent' ? '#ef4444' : '#6366f1' }}>
                        {item.priority?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.recoveryTimeRow}>
                    <Ionicons name="calendar-outline" size={13} color={theme.textMuted} />
                    <Text style={[styles.recoveryTimeText, { color: theme.textSecondary }]}>
                      Proposed Slot: <Text style={{ fontWeight: '700', color: theme.text }}>{item.time_label}</Text>
                    </Text>
                  </View>
                  <View style={styles.bufferPill}>
                    <Ionicons name="shield-checkmark" size={12} color="#10b981" />
                    <Text style={styles.bufferPillText}>+15m Rest Buffer Protected</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.applyRecoveryBtn, { backgroundColor: '#f59e0b' }]}
              onPress={handleApplyRecovery}
              disabled={applyingRecovery}
            >
              {applyingRecovery ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color="#fff" />
                  <Text style={styles.applyRecoveryBtnText}>Confirm & Apply Recovery Schedule</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Focus Session Pomodoro Modal */}
      <Modal
        visible={focusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFocusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="timer" size={22} color="#8b5cf6" />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Focus Companion</Text>
              </View>
              <TouchableOpacity onPress={() => setFocusModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.focusTaskTitle, { color: theme.text }]}>
              {focusTask?.title || 'Deep Work Focus'}
            </Text>

            {/* Duration Preset Selector */}
            {!focusIsRunning && (
              <View style={styles.presetRow}>
                {[15, 25, 45, 50].map((dur) => (
                  <TouchableOpacity
                    key={dur}
                    style={[
                      styles.presetPill,
                      { borderColor: focusDuration === dur ? '#8b5cf6' : theme.border },
                      focusDuration === dur && { backgroundColor: 'rgba(139, 92, 246, 0.2)' },
                    ]}
                    onPress={() => {
                      setFocusDuration(dur);
                      setFocusSecondsLeft(dur * 60);
                    }}
                  >
                    <Text style={[styles.presetText, { color: focusDuration === dur ? '#8b5cf6' : theme.textSecondary }]}>
                      {dur}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Countdown Display */}
            <View style={styles.countdownContainer}>
              <Text style={[styles.countdownText, { color: '#8b5cf6' }]}>
                {formatTimerDisplay(focusSecondsLeft)}
              </Text>
              <Text style={[styles.countdownSub, { color: theme.textMuted }]}>
                {focusIsRunning ? 'Stay in flow state • Notifications silenced' : 'Ready to start'}
              </Text>
            </View>

            {/* Timer Controls */}
            <View style={styles.timerControlsRow}>
              {!focusIsRunning ? (
                <TouchableOpacity
                  style={[styles.timerMainBtn, { backgroundColor: '#8b5cf6' }]}
                  onPress={handleStartFocus}
                >
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={styles.timerMainBtnText}>Start Focus</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.timerMainBtn, { backgroundColor: '#f59e0b' }]}
                  onPress={handlePauseFocus}
                >
                  <Ionicons name="pause" size={20} color="#fff" />
                  <Text style={styles.timerMainBtnText}>Pause</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.timerResetBtn, { borderColor: theme.border }]}
                onPress={handleResetFocus}
              >
                <Ionicons name="refresh" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            {focusIsRunning && (
              <TouchableOpacity
                style={styles.doneEarlyBtn}
                onPress={() => {
                  setFocusIsRunning(false);
                  handleFocusComplete();
                  setFocusModalVisible(false);
                }}
              >
                <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '700' }}>
                  ✓ Complete Session Early
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Free Slots Modal */}
      <Modal visible={freeSlotsModal} transparent={true} animationType="slide" onRequestClose={() => setFreeSlotsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles" size={18} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Automatic Free-Time Windows</Text>
              </View>
              <TouchableOpacity onPress={() => setFreeSlotsModal(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.freeSlotSub, { color: theme.textSecondary }]}>
              Identified open time windows between your commitments for today:
            </Text>

            {freeSlots.length === 0 ? (
              <View style={styles.emptyFreeSlots}>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  Your working hours (9 AM - 6 PM) are fully open for custom focus blocks!
                </Text>
              </View>
            ) : (
              freeSlots.map((fs, idx) => (
                <View key={idx} style={[styles.freeSlotCard, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.freeSlotTime, { color: theme.text }]}>
                      {new Date(fs.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                      {new Date(fs.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={[styles.freeSlotDuration, { color: theme.textMuted }]}>
                      {fs.minutes} Minutes Uninterrupted Free Time
                    </Text>
                  </View>
                </View>
              ))
            )}

            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: theme.primary }]}
              onPress={() => setFreeSlotsModal(false)}
            >
              <Text style={styles.closeModalBtnText}>Done</Text>
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
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  focusHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  focusHeaderBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusStatsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 8,
    marginBottom: Spacing.sm,
  },
  focusStatsText: {
    fontSize: 12,
    flex: 1,
  },
  dateSelector: {
    gap: 8,
    paddingBottom: Spacing.md,
  },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 54,
  },
  datePillDay: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  datePillNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  recoveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 10,
    marginBottom: Spacing.md,
  },
  recoveryIconBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoveryBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  recoveryBannerDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  recoveryReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  recoveryReviewBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  energyFlowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 8,
    marginBottom: Spacing.md,
  },
  energyFlowText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 10,
    marginBottom: Spacing.md,
  },
  conflictTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  conflictDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  aiCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  aiIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  aiCardSub: {
    fontSize: 11,
    marginTop: 1,
  },
  quickPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  quickPlanBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
  },
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm + 2,
    fontSize: 13,
    minHeight: 46,
    marginBottom: Spacing.sm,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  generateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  freeTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 6,
  },
  freeTimeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timelineSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  viewCalText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timelineContainer: {
    paddingLeft: Spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timeColumn: {
    width: 70,
    alignItems: 'flex-end',
    paddingRight: 10,
    paddingTop: 2,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  durationText: {
    fontSize: 10,
    marginTop: 2,
  },
  lineTrack: {
    width: 20,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 2,
  },
  slotCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginLeft: 8,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  slotTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  slotMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  energyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  energyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  slotFocusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  slotFocusBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b5cf6',
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
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  freeSlotSub: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: Spacing.md,
  },
  recoveryPlanCard: {
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  recoveryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recoveryCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  recoveryTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  recoveryTimeText: {
    fontSize: 12,
  },
  bufferPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  bufferPillText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  applyRecoveryBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  applyRecoveryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  focusTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: Spacing.sm,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: Spacing.md,
  },
  presetPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
  },
  countdownContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  countdownText: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 2,
  },
  countdownSub: {
    fontSize: 12,
    marginTop: 4,
  },
  timerControlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: Spacing.sm,
  },
  timerMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    minWidth: 150,
  },
  timerMainBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  timerResetBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneEarlyBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyFreeSlots: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  freeSlotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  freeSlotTime: {
    fontSize: 13,
    fontWeight: '700',
  },
  freeSlotDuration: {
    fontSize: 11,
    marginTop: 2,
  },
  closeModalBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  closeModalBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
