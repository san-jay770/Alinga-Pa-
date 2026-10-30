import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { eventsApi } from '../services/api';
import { useRouter } from 'expo-router';

interface CalendarEventItem {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type: string;
  location?: string;
  is_all_day?: boolean;
}

export default function CalendarScreen() {
  const router = useRouter();
  const theme = Colors.dark;

  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [conflicts, setConflicts] = useState<any[]>([]);

  // Create Event Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [submitting, setSubmitting] = useState(false);

  // Generate 14-day date strip
  const dates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i - 2); // 2 days ago to 11 days ahead
    return {
      full: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      isToday: d.toDateString() === new Date().toDateString(),
    };
  });

  const fetchEvents = useCallback(async () => {
    try {
      const [eventsRes, conflictsRes] = await Promise.allSettled([
        eventsApi.list(),
        eventsApi.conflicts(),
      ]);
      if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value.data || []);
      if (conflictsRes.status === 'fulfilled') setConflicts(conflictsRes.value.data?.conflicts || []);
    } catch (e) {
      console.warn('Error fetching calendar events', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleCreateEvent = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter event title');
      return;
    }

    setSubmitting(true);
    try {
      const startIso = `${selectedDate}T${startTime}:00Z`;
      const endIso = `${selectedDate}T${endTime}:00Z`;

      const res = await eventsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        event_type: eventType,
        location: location.trim() || undefined,
        start_time: startIso,
        end_time: endIso,
      });

      setEvents((prev) => [...prev, res.data]);
      setModalVisible(false);
      setTitle('');
      setDescription('');
      setLocation('');
      Alert.alert('Event Added', 'Scheduled on your calendar.');
      fetchEvents();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to save event. Verify end time is after start time.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = (id: string, eventTitle: string) => {
    Alert.alert('Delete Event', `Remove "${eventTitle}" from your schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setEvents((prev) => prev.filter((e) => e.id !== id));
          try {
            await eventsApi.delete(id);
          } catch (e) {
            fetchEvents();
          }
        },
      },
    ]);
  };

  // Filter events by selected date and type
  const filteredEvents = events.filter((e) => {
    const matchesDate = e.start_time.startsWith(selectedDate);
    const matchesType = selectedType === 'all' || e.event_type === selectedType;
    return matchesDate && matchesType;
  });

  const eventTypes = ['all', 'meeting', 'deep_work', 'personal', 'travel', 'health'];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return '#3b82f6';
      case 'deep_work':
        return '#8b5cf6';
      case 'personal':
        return '#10b981';
      case 'travel':
        return '#f59e0b';
      case 'health':
        return '#ec4899';
      default:
        return theme.primary;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Calendar & Schedule</Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            {events.length} total events • {conflicts.length} collision warnings
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addIconBtn, { backgroundColor: theme.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Date Carousel Strip */}
      <View style={styles.dateStripContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
          {dates.map((d) => {
            const isSelected = selectedDate === d.full;
            return (
              <TouchableOpacity
                key={d.full}
                style={[
                  styles.dateBox,
                  { backgroundColor: isSelected ? theme.primary : theme.card, borderColor: theme.cardBorder },
                  d.isToday && !isSelected && { borderColor: theme.primary },
                ]}
                onPress={() => setSelectedDate(d.full)}
              >
                <Text
                  style={[
                    styles.dayNameText,
                    { color: isSelected ? '#fff' : theme.textMuted },
                    d.isToday && !isSelected && { color: theme.primary },
                  ]}
                >
                  {d.dayName}
                </Text>
                <Text
                  style={[
                    styles.dayNumberText,
                    { color: isSelected ? '#fff' : theme.text },
                    d.isToday && !isSelected && { color: theme.primary },
                  ]}
                >
                  {d.dayNumber}
                </Text>
                {d.isToday && (
                  <View style={[styles.todayIndicator, { backgroundColor: isSelected ? '#fff' : theme.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Conflicts Alert Card if any */}
      {conflicts.length > 0 && (
        <View style={[styles.conflictBanner, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: theme.dangerLight }]}>
          <Ionicons name="warning" size={20} color={theme.danger} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.conflictTitle, { color: theme.danger }]}>
              {conflicts.length} Schedule Conflict Detected
            </Text>
            <Text style={[styles.conflictDesc, { color: theme.textSecondary }]}>
              "{conflicts[0].event_a_title}" overlaps with "{conflicts[0].event_b_title}".
            </Text>
          </View>
        </View>
      )}

      {/* Category Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
        {eventTypes.map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.filterPill,
              { backgroundColor: selectedType === t ? theme.primary : theme.card, borderColor: theme.cardBorder },
            ]}
            onPress={() => setSelectedType(t)}
          >
            <Text style={[styles.filterPillText, { color: selectedType === t ? '#fff' : theme.textMuted }]}>
              {t.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Events List for Selected Date */}
      <ScrollView
        contentContainerStyle={styles.eventList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.dateSectionLabel, { color: theme.textSecondary }]}>
          Schedule for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : filteredEvents.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="calendar-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No events scheduled</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              Your calendar is completely open. Tap "+" to schedule a meeting or focus session.
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: theme.primary }]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyAddBtnText}>Schedule Event</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredEvents.map((event) => {
            const color = getTypeColor(event.event_type);
            const startTimeStr = new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endTimeStr = new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <View
                key={event.id}
                style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderLeftColor: color }]}
              >
                <View style={styles.eventTimeCol}>
                  <Text style={[styles.eventTimeText, { color: theme.text }]}>{startTimeStr}</Text>
                  <Text style={[styles.eventTimeSub, { color: theme.textMuted }]}>{endTimeStr}</Text>
                </View>

                <View style={styles.eventBodyCol}>
                  <View style={styles.eventTopRow}>
                    <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: `${color}20` }]}>
                      <Text style={[styles.typeBadgeText, { color }]}>{event.event_type.replace('_', ' ')}</Text>
                    </View>
                  </View>

                  {event.description ? (
                    <Text style={[styles.eventDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                      {event.description}
                    </Text>
                  ) : null}

                  {event.location ? (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={13} color={theme.textMuted} />
                      <Text style={[styles.locationText, { color: theme.textMuted }]}>{event.location}</Text>
                    </View>
                  ) : null}
                </View>

                <TouchableOpacity style={styles.delEventBtn} onPress={() => handleDeleteEvent(event.id, event.title)}>
                  <Ionicons name="trash-outline" size={16} color={theme.danger} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Schedule Event Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Calendar Event</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Event Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="e.g. Project Review Meeting"
                placeholderTextColor={theme.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Event Type</Text>
              <View style={styles.modalPills}>
                {['meeting', 'deep_work', 'personal', 'travel', 'health'].map((t) => {
                  const active = eventType === t;
                  const c = getTypeColor(t);
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.modalPill,
                        { borderColor: active ? c : theme.border },
                        active && { backgroundColor: `${c}22` },
                      ]}
                      onPress={() => setEventType(t)}
                    >
                      <Text style={[styles.modalPillText, { color: active ? c : theme.textMuted }]}>
                        {t.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Time Inputs */}
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Start Time (HH:MM)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                    placeholder="09:00"
                    placeholderTextColor={theme.textMuted}
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>End Time (HH:MM)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                    placeholder="10:00"
                    placeholderTextColor={theme.textMuted}
                    value={endTime}
                    onChangeText={setEndTime}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Location / Link</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="Google Meet, Office Room B, etc."
                placeholderTextColor={theme.textMuted}
                value={location}
                onChangeText={setLocation}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Notes / Agenda</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
                ]}
                placeholder="Key discussion points or items..."
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleCreateEvent}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Event</Text>}
              </TouchableOpacity>
            </ScrollView>
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
  addIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateStripContainer: {
    paddingVertical: Spacing.sm,
  },
  dateStrip: {
    paddingHorizontal: Spacing.md,
    gap: 10,
  },
  dateBox: {
    width: 52,
    height: 70,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayNumberText: {
    fontSize: 18,
    fontWeight: '800',
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 10,
  },
  conflictTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  conflictDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  filterPills: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventList: {
    padding: Spacing.md,
    paddingBottom: 40,
    gap: 12,
  },
  dateSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyBox: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 20,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: '85%',
  },
  emptyAddBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: 6,
  },
  emptyAddBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 12,
  },
  eventTimeCol: {
    width: 65,
    alignItems: 'center',
  },
  eventTimeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  eventTimeSub: {
    fontSize: 11,
    marginTop: 2,
  },
  eventBodyCol: {
    flex: 1,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eventDesc: {
    fontSize: 12,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
  },
  delEventBtn: {
    padding: 6,
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
    maxHeight: '85%',
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
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    height: 70,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  modalPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

