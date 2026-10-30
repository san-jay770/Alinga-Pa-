import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { tasksApi } from '../services/api';
import { useRouter } from 'expo-router';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  due_date?: string;
  estimated_minutes?: number;
  risk_score?: number;
  completed_at?: string;
}

export default function TasksScreen() {
  const router = useRouter();
  const theme = Colors.dark;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // all | pending | completed
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('work');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newMinutes, setNewMinutes] = useState('30');
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await tasksApi.list();
      setTasks(res.data || []);
    } catch (err: any) {
      console.warn('Error fetching tasks', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  // Toggle complete
  const toggleTaskStatus = async (task: Task) => {
    const isCompleted = task.status === 'done';
    const nextStatus = isCompleted ? 'todo' : 'done';

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus, risk_score: nextStatus === 'done' ? 0 : t.risk_score } : t))
    );

    try {
      if (nextStatus === 'done') {
        await tasksApi.complete(task.id);
      } else {
        await tasksApi.update(task.id, { status: 'todo' });
      }
    } catch (err) {
      // Revert if error
      fetchTasks();
      Alert.alert('Sync Error', 'Failed to update task status on server.');
    }
  };

  // Delete task
  const confirmDelete = (task: Task) => {
    Alert.alert('Delete Task', `Are you sure you want to delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
          try {
            await tasksApi.delete(task.id);
          } catch (e) {
            fetchTasks();
            Alert.alert('Error', 'Could not delete task from server.');
          }
        },
      },
    ]);
  };

  // Open Create/Edit Modal
  const openModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setNewTitle(task.title);
      setNewDescription(task.description || '');
      setNewCategory(task.category || 'work');
      setNewPriority(task.priority || 'medium');
      setNewMinutes((task.estimated_minutes || 30).toString());
    } else {
      setEditingTask(null);
      setNewTitle('');
      setNewDescription('');
      setNewCategory('work');
      setNewPriority('medium');
      setNewMinutes('30');
    }
    setModalVisible(true);
  };

  // Handle Save
  const handleSaveTask = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a name for your task.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory,
        priority: newPriority,
        estimated_minutes: parseInt(newMinutes, 10) || 30,
      };

      if (editingTask) {
        const res = await tasksApi.update(editingTask.id, payload);
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? res.data : t)));
      } else {
        const res = await tasksApi.create(payload);
        setTasks((prev) => [res.data, ...prev]);
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Save Failed', err.response?.data?.detail || 'Could not save task.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      selectedStatus === 'all'
        ? true
        : selectedStatus === 'completed'
        ? task.status === 'done'
        : task.status !== 'done';

    const matchesCategory =
      selectedCategory === 'all' || task.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = ['all', 'work', 'personal', 'health', 'study', 'finance'];
  const priorities: Array<'low' | 'medium' | 'high' | 'urgent'> = ['low', 'medium', 'high', 'urgent'];

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent':
        return theme.danger;
      case 'high':
        return theme.warning;
      case 'medium':
        return theme.primary;
      default:
        return theme.textMuted;
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Task Management</Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            {tasks.filter((t) => t.status !== 'done').length} pending • {tasks.filter((t) => t.status === 'done').length} completed
          </Text>
        </View>
        <TouchableOpacity style={[styles.addIconBtn, { backgroundColor: theme.primary }]} onPress={() => openModal()}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search tasks, categories..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.statusFilters}>
        {(['all', 'pending', 'completed'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.statusTab,
              selectedStatus === tab && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
            ]}
            onPress={() => setSelectedStatus(tab)}
          >
            <Text
              style={[
                styles.statusTabText,
                { color: selectedStatus === tab ? theme.primary : theme.textMuted },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryPillsScroll}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryPill,
              { backgroundColor: selectedCategory === cat ? theme.primary : theme.card, borderColor: theme.cardBorder },
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.categoryPillText,
                { color: selectedCategory === cat ? '#fff' : theme.textSecondary },
              ]}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tasks List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : filteredTasks.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="folder-open-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No tasks found</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              {searchQuery ? 'Try matching another keyword or filter.' : 'Tap "+" above to add your first priority!'}
            </Text>
          </View>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === 'done';
            const priorityColor = getPriorityColor(task.priority);

            return (
              <View
                key={task.id}
                style={[
                  styles.taskItem,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                  isDone && { opacity: 0.7 },
                ]}
              >
                {/* Checkbox */}
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    isDone
                      ? { backgroundColor: theme.success, borderColor: theme.success }
                      : { borderColor: theme.border },
                  ]}
                  onPress={() => toggleTaskStatus(task)}
                >
                  {isDone && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>

                {/* Content */}
                <TouchableOpacity
                  style={styles.taskTextContent}
                  onPress={() => openModal(task)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.taskItemTitle,
                      { color: theme.text },
                      isDone && styles.taskTitleDone,
                    ]}
                  >
                    {task.title}
                  </Text>
                  {task.description ? (
                    <Text
                      style={[styles.taskItemDesc, { color: theme.textSecondary }]}
                      numberOfLines={1}
                    >
                      {task.description}
                    </Text>
                  ) : null}

                  <View style={styles.taskMetaRow}>
                    <View style={[styles.badge, { backgroundColor: `${priorityColor}22` }]}>
                      <View style={[styles.dot, { backgroundColor: priorityColor }]} />
                      <Text style={[styles.badgeText, { color: priorityColor }]}>
                        {task.priority.toUpperCase()}
                      </Text>
                    </View>

                    {task.category && (
                      <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                        <Text style={[styles.badgeText, { color: theme.textMuted }]}>
                          {task.category}
                        </Text>
                      </View>
                    )}

                    <Text style={[styles.metaText, { color: theme.textMuted }]}>
                      ⏱ {task.estimated_minutes ?? 30}m
                    </Text>

                    {typeof task.risk_score === 'number' && task.risk_score > 0.4 && !isDone && (
                      <View style={[styles.riskBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                        <Ionicons name="alert-circle" size={12} color={theme.danger} />
                        <Text style={[styles.riskText, { color: theme.danger }]}>High Risk</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Actions */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => confirmDelete(task)}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Title Input */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Task Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="e.g., Complete Quarterly Report"
                placeholderTextColor={theme.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              {/* Description Input */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description (Optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
                ]}
                placeholder="Add subtasks, links or important notes..."
                placeholderTextColor={theme.textMuted}
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
                numberOfLines={3}
              />

              {/* Priority Selection */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Priority Level</Text>
              <View style={styles.choiceRow}>
                {priorities.map((p) => {
                  const pColor = getPriorityColor(p);
                  const active = newPriority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.choicePill,
                        { borderColor: active ? pColor : theme.border },
                        active && { backgroundColor: `${pColor}25` },
                      ]}
                      onPress={() => setNewPriority(p)}
                    >
                      <Text style={[styles.choiceText, { color: active ? pColor : theme.textMuted }]}>
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Category Selection */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
              <View style={styles.choiceRow}>
                {['work', 'personal', 'health', 'study', 'finance'].map((c) => {
                  const active = newCategory === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.choicePill,
                        { borderColor: active ? theme.primary : theme.border },
                        active && { backgroundColor: theme.primaryLight },
                      ]}
                      onPress={() => setNewCategory(c)}
                    >
                      <Text style={[styles.choiceText, { color: active ? theme.primary : theme.textMuted }]}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Estimated Minutes */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Estimated Duration (Minutes)</Text>
              <View style={styles.choiceRow}>
                {['15', '30', '45', '60', '90'].map((mins) => {
                  const active = newMinutes === mins;
                  return (
                    <TouchableOpacity
                      key={mins}
                      style={[
                        styles.choicePill,
                        { borderColor: active ? theme.primary : theme.border },
                        active && { backgroundColor: theme.primaryLight },
                      ]}
                      onPress={() => setNewMinutes(mins)}
                    >
                      <Text style={[styles.choiceText, { color: active ? theme.primary : theme.textMuted }]}>
                        {mins}m
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveTask}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingTask ? 'Update Task' : 'Save Task'}
                  </Text>
                )}
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
  searchSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  statusFilters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: 8,
  },
  statusTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryPillsScroll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
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
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTextContent: {
    flex: 1,
  },
  taskItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  taskItemDesc: {
    fontSize: 12,
    marginBottom: 6,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 11,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  riskText: {
    fontSize: 10,
    fontWeight: '700',
  },
  deleteBtn: {
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
    fontSize: 18,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choicePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  choiceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
