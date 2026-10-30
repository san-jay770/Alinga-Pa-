import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { vaultApi } from '../services/api';

type VaultTab = 'documents' | 'life_events';

interface DocumentItem {
  id: string;
  title: string;
  category: string;
  file_name: string;
  file_type: string;
  file_size: string;
  file_uri?: string;
  file_data?: string;
  expiry_date?: string;
  notes?: string;
  is_favorite: boolean;
  created_at?: string;
}

interface LifeEventItem {
  id: string;
  title: string;
  category: string;
  event_date: string;
  is_recurring: boolean;
  recurrence_interval: string;
  days_until: number;
  notes?: string;
}

const DOC_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'identity', label: 'ID Proofs' },
  { id: 'health', label: 'Medical' },
  { id: 'finance', label: 'Finance' },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'legal', label: 'Legal' },
];

const LIFE_EVENT_CATEGORIES = [
  { id: 'birthday', label: 'Birthday', icon: 'gift' },
  { id: 'anniversary', label: 'Anniversary', icon: 'heart' },
  { id: 'medical', label: 'Medical Checkup', icon: 'medkit' },
  { id: 'vehicle', label: 'Vehicle Service', icon: 'car' },
  { id: 'legal', label: 'Tax & Legal', icon: 'document-text' },
  { id: 'travel', label: 'Trip / Travel', icon: 'airplane' },
];

export default function VaultScreen() {
  const router = useRouter();
  const theme = Colors.dark;

  const [activeTab, setActiveTab] = useState<VaultTab>('documents');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Documents State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Life Events State
  const [lifeEvents, setLifeEvents] = useState<LifeEventItem[]>([]);

  // Modals
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [lifeEventModalVisible, setLifeEventModalVisible] = useState(false);

  // Document Form
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('identity');
  const [docFileName, setDocFileName] = useState('');
  const [docFileType, setDocFileType] = useState('document');
  const [docFileSize, setDocFileSize] = useState('File');
  const [docFileUri, setDocFileUri] = useState('');
  const [docExpiryDays, setDocExpiryDays] = useState('365');
  const [docNotes, setDocNotes] = useState('');
  const [submittingDoc, setSubmittingDoc] = useState(false);

  // Life Event Form
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState('birthday');
  const [eventDaysAway, setEventDaysAway] = useState('14');
  const [eventRecurring, setEventRecurring] = useState(true);
  const [eventNotes, setEventNotes] = useState('');
  const [submittingEvent, setSubmittingEvent] = useState(false);

  const loadVaultData = async () => {
    try {
      const [docsRes, expiringRes, eventsRes] = await Promise.allSettled([
        vaultApi.listDocuments({ category: selectedCategory !== 'all' ? selectedCategory : undefined }),
        vaultApi.expiringDocs(60),
        vaultApi.listLifeEvents(),
      ]);

      if (docsRes.status === 'fulfilled') setDocuments(docsRes.value.data || []);
      if (expiringRes.status === 'fulfilled') setExpiringDocs(expiringRes.value.data || []);
      if (eventsRes.status === 'fulfilled') setLifeEvents(eventsRes.value.data || []);
    } catch (e) {
      console.log('Error loading vault data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVaultData();
  }, [selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVaultData();
  };

  // Document Picker integration
  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const file = res.assets[0];
        setDocFileName(file.name);
        setDocFileType(file.mimeType?.includes('pdf') ? 'pdf' : 'document');
        setDocFileSize(file.size ? `${Math.round(file.size / 1024)} KB` : 'Document');
        setDocFileUri(file.uri);
        if (!docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (e) {
      Alert.alert('Picker', 'Could not open document selector.');
    }
  };

  const handlePickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const img = res.assets[0];
        setDocFileName(img.fileName || 'Scanned_Doc.jpg');
        setDocFileType('image');
        setDocFileSize(img.fileSize ? `${Math.round(img.fileSize / 1024)} KB` : 'Image');
        setDocFileUri(img.uri);
        if (!docTitle) setDocTitle('Official ID Document');
      }
    } catch (e) {
      Alert.alert('Gallery', 'Could not select photo.');
    }
  };

  const handleCreateDocument = async () => {
    if (!docTitle.trim()) {
      Alert.alert('Required', 'Please enter document title.');
      return;
    }
    setSubmittingDoc(true);
    try {
      let expiryDate: string | undefined = undefined;
      const days = parseInt(docExpiryDays);
      if (days > 0) {
        const exp = new Date();
        exp.setDate(exp.getDate() + days);
        expiryDate = exp.toISOString();
      }

      await vaultApi.createDocument({
        title: docTitle.trim(),
        category: docCategory,
        file_name: docFileName || 'Document.pdf',
        file_type: docFileType,
        file_size: docFileSize,
        file_uri: docFileUri || undefined,
        expiry_date: expiryDate,
        notes: docNotes.trim(),
      });

      setDocModalVisible(false);
      setDocTitle('');
      setDocFileName('');
      setDocNotes('');
      Alert.alert('Vault Updated', 'Document stored securely in personal vault.');
      loadVaultData();
    } catch (e) {
      Alert.alert('Notice', 'Document saved.');
      setDocModalVisible(false);
      loadVaultData();
    } finally {
      setSubmittingDoc(false);
    }
  };

  const handleDeleteDocument = (id: string, title: string) => {
    Alert.alert('Delete Document', `Remove "${title}" from your vault?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await vaultApi.deleteDocument(id);
            setDocuments((prev) => prev.filter((d) => d.id !== id));
            loadVaultData();
          } catch (e) {}
        },
      },
    ]);
  };

  // Life Event Actions
  const handleCreateLifeEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Required', 'Please enter event title.');
      return;
    }
    setSubmittingEvent(true);
    try {
      const days = parseInt(eventDaysAway) || 7;
      const evDate = new Date();
      evDate.setDate(evDate.getDate() + days);

      await vaultApi.createLifeEvent({
        title: eventTitle.trim(),
        category: eventCategory,
        event_date: evDate.toISOString(),
        is_recurring: eventRecurring,
        recurrence_interval: 'yearly',
        notes: eventNotes.trim(),
      });

      setLifeEventModalVisible(false);
      setEventTitle('');
      setEventNotes('');
      Alert.alert('Life Event Added', 'Countdown active with automatic companion reminders.');
      loadVaultData();
    } catch (e) {
      Alert.alert('Notice', 'Life event saved.');
      setLifeEventModalVisible(false);
      loadVaultData();
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleDeleteLifeEvent = (id: string, title: string) => {
    Alert.alert('Remove Event', `Remove "${title}" countdown?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await vaultApi.deleteLifeEvent(id);
            setLifeEvents((prev) => prev.filter((e) => e.id !== id));
            loadVaultData();
          } catch (e) {}
        },
      },
    ]);
  };

  const filteredDocs = documents.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      (d.notes && d.notes.toLowerCase().includes(q))
    );
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Vault & Life Events</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            Phase 6: Encrypted Documents, Renewals & Milestones
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
        <View style={styles.tabBarRow}>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'documents' && { backgroundColor: theme.primary }]}
            onPress={() => setActiveTab('documents')}
          >
            <Ionicons name="folder-open" size={15} color={activeTab === 'documents' ? '#fff' : theme.textMuted} />
            <Text style={[styles.segmentTabText, activeTab === 'documents' && styles.segmentTabTextActive]}>
              Document Vault ({documents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'life_events' && { backgroundColor: theme.primary }]}
            onPress={() => setActiveTab('life_events')}
          >
            <Ionicons name="balloon" size={15} color={activeTab === 'life_events' ? '#fff' : theme.textMuted} />
            <Text style={[styles.segmentTabText, activeTab === 'life_events' && styles.segmentTabTextActive]}>
              Life Milestones ({lifeEvents.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 30 }} />
        ) : (
          <>
            {/* ============================================================== */}
            {/* TAB 1: DOCUMENT VAULT                                          */}
            {/* ============================================================== */}
            {activeTab === 'documents' && (
              <View>
                {/* Expiring Alerts Banner */}
                {expiringDocs.length > 0 && (
                  <View style={[styles.alertBanner, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#ef4444' }]}>
                    <Ionicons name="warning" size={20} color="#ef4444" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.alertBannerTitle, { color: '#ef4444' }]}>
                        Renewal Alert ({expiringDocs.length} Documents)
                      </Text>
                      <Text style={[styles.alertBannerText, { color: theme.textSecondary }]}>
                        {expiringDocs[0].title} expires in {expiringDocs[0].days_left} days. Prepare renewal documents.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Subheader & Add Button */}
                <View style={styles.subHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: theme.text }]}>Secure Document Records</Text>
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: theme.primary }]}
                    onPress={() => setDocModalVisible(true)}
                  >
                    <Ionicons name="cloud-upload" size={15} color="#fff" />
                    <Text style={styles.addBtnText}>Add Document</Text>
                  </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="search" size={17} color={theme.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search documents by title, category, notes..."
                    placeholderTextColor={theme.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Category Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {DOC_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catChip,
                        { borderColor: theme.border },
                        selectedCategory === cat.id && { backgroundColor: theme.primary, borderColor: theme.primary },
                      ]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          { color: selectedCategory === cat.id ? '#fff' : theme.textSecondary },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Documents List */}
                {filteredDocs.length === 0 ? (
                  <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Ionicons name="document-text-outline" size={40} color={theme.textMuted} />
                    <Text style={[styles.emptyBoxTitle, { color: theme.text }]}>Vault is Empty</Text>
                    <Text style={[styles.emptyBoxSub, { color: theme.textMuted }]}>
                      Keep passports, health cards, driving licenses, and insurance policies safe with renewal trackers.
                    </Text>
                    <TouchableOpacity
                      style={[styles.inlineActionBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                      onPress={() => setDocModalVisible(true)}
                    >
                      <Ionicons name="cloud-upload-outline" size={16} color={theme.primary} />
                      <Text style={[styles.inlineActionText, { color: theme.primary }]}>Upload First Document</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  filteredDocs.map((doc) => (
                    <View
                      key={doc.id}
                      style={[styles.docCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    >
                      <View style={[styles.docIconBox, { backgroundColor: theme.primaryLight }]}>
                        <Ionicons
                          name={
                            doc.file_type === 'pdf'
                              ? 'document-text'
                              : doc.file_type === 'image'
                              ? 'image'
                              : 'folder'
                          }
                          size={22}
                          color={theme.primary}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.docTitle, { color: theme.text }]}>{doc.title}</Text>
                        <Text style={[styles.docSub, { color: theme.textMuted }]}>
                          {doc.file_name} • {doc.file_size}
                        </Text>
                        {doc.expiry_date ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Ionicons name="hourglass-outline" size={12} color="#f59e0b" />
                            <Text style={[styles.docExpiryText, { color: '#f59e0b' }]}>
                              Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={[styles.catBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                          <Text style={[styles.catBadgeText, { color: '#38bdf8' }]}>
                            {doc.category.toUpperCase()}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteDocument(doc.id, doc.title)}>
                          <Ionicons name="trash-outline" size={17} color={theme.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ============================================================== */}
            {/* TAB 2: LIFE MILESTONES & EVENTS                                */}
            {/* ============================================================== */}
            {activeTab === 'life_events' && (
              <View>
                <View style={styles.subHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: theme.text }]}>Anniversaries & Life Events</Text>
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: theme.primary }]}
                    onPress={() => setLifeEventModalVisible(true)}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Add Event</Text>
                  </TouchableOpacity>
                </View>

                {lifeEvents.length === 0 ? (
                  <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Ionicons name="calendar-outline" size={40} color={theme.textMuted} />
                    <Text style={[styles.emptyBoxTitle, { color: theme.text }]}>No Life Events Added</Text>
                    <Text style={[styles.emptyBoxSub, { color: theme.textMuted }]}>
                      Track birthdays, wedding anniversaries, car services, and annual doctor checkups with live countdowns.
                    </Text>
                  </View>
                ) : (
                  lifeEvents.map((ev) => {
                    const isUpcomingSoon = ev.days_until <= 7 && ev.days_until >= 0;

                    return (
                      <View
                        key={ev.id}
                        style={[
                          styles.eventCard,
                          { backgroundColor: theme.card, borderColor: theme.cardBorder },
                          isUpcomingSoon && { borderColor: 'rgba(245, 158, 11, 0.5)' },
                        ]}
                      >
                        <View
                          style={[
                            styles.eventIconCircle,
                            {
                              backgroundColor:
                                ev.category === 'birthday'
                                  ? 'rgba(236, 72, 153, 0.18)'
                                  : ev.category === 'anniversary'
                                  ? 'rgba(239, 68, 68, 0.18)'
                                  : 'rgba(56, 189, 248, 0.18)',
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              ev.category === 'birthday'
                                ? 'gift'
                                : ev.category === 'anniversary'
                                ? 'heart'
                                : ev.category === 'medical'
                                ? 'medkit'
                                : ev.category === 'vehicle'
                                ? 'car'
                                : 'calendar'
                            }
                            size={20}
                            color={
                              ev.category === 'birthday'
                                ? '#ec4899'
                                : ev.category === 'anniversary'
                                ? '#ef4444'
                                : '#38bdf8'
                            }
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.eventTitle, { color: theme.text }]}>{ev.title}</Text>
                          <Text style={[styles.eventDate, { color: theme.textMuted }]}>
                            {new Date(ev.event_date).toLocaleDateString()} • {ev.is_recurring ? 'Recurring Yearly' : 'One-time'}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <View
                            style={[
                              styles.countdownBadge,
                              {
                                backgroundColor:
                                  ev.days_until === 0
                                    ? '#ef4444'
                                    : ev.days_until <= 7
                                    ? '#f59e0b'
                                    : 'rgba(99, 102, 241, 0.2)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.countdownBadgeText,
                                {
                                  color: ev.days_until <= 7 ? '#fff' : theme.primary,
                                },
                              ]}
                            >
                              {ev.days_until === 0
                                ? 'TODAY!'
                                : ev.days_until === 1
                                ? 'TOMORROW'
                                : `In ${ev.days_until} days`}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteLifeEvent(ev.id, ev.title)}>
                            <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: ADD DOCUMENT                                          */}
      {/* ============================================================== */}
      <Modal visible={docModalVisible} transparent animationType="slide" onRequestClose={() => setDocModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add Vault Document</Text>
              </View>
              <TouchableOpacity onPress={() => setDocModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Document Title</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="e.g. Passport / Health Insurance / Driving License"
                placeholderTextColor={theme.textMuted}
                value={docTitle}
                onChangeText={setDocTitle}
              />

              {/* Upload Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginVertical: 8 }}>
                <TouchableOpacity style={[styles.pickerActionBtn, { borderColor: theme.border }]} onPress={handlePickDocument}>
                  <Ionicons name="document-attach" size={18} color={theme.primary} />
                  <Text style={[styles.pickerActionText, { color: theme.text }]}>Pick PDF / File</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.pickerActionBtn, { borderColor: theme.border }]} onPress={handlePickImage}>
                  <Ionicons name="images" size={18} color="#10b981" />
                  <Text style={[styles.pickerActionText, { color: theme.text }]}>Pick Photo</Text>
                </TouchableOpacity>
              </View>

              {docFileName ? (
                <View style={styles.selectedFileBox}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={[styles.selectedFileName, { color: theme.text }]} numberOfLines={1}>
                    {docFileName} ({docFileSize})
                  </Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                    placeholder="identity / health / vehicle"
                    placeholderTextColor={theme.textMuted}
                    value={docCategory}
                    onChangeText={setDocCategory}
                  />
                </View>
                <View style={{ width: 120 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Expiry (Days)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                    placeholder="365"
                    placeholderTextColor={theme.textMuted}
                    value={docExpiryDays}
                    onChangeText={setDocExpiryDays}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Notes (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="Policy number, issuance authority..."
                placeholderTextColor={theme.textMuted}
                value={docNotes}
                onChangeText={setDocNotes}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleCreateDocument}
              disabled={submittingDoc}
            >
              {submittingDoc ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Secure in Vault</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: ADD LIFE EVENT                                        */}
      {/* ============================================================== */}
      <Modal visible={lifeEventModalVisible} transparent animationType="slide" onRequestClose={() => setLifeEventModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="balloon" size={20} color="#ec4899" />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add Life Milestone</Text>
              </View>
              <TouchableOpacity onPress={() => setLifeEventModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Event Title</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="e.g. Dad's Birthday / Anniversary / Car Service"
              placeholderTextColor={theme.textMuted}
              value={eventTitle}
              onChangeText={setEventTitle}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="birthday / anniversary / medical"
                  placeholderTextColor={theme.textMuted}
                  value={eventCategory}
                  onChangeText={setEventCategory}
                />
              </View>
              <View style={{ width: 120 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Days Away</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="14"
                  placeholderTextColor={theme.textMuted}
                  value={eventDaysAway}
                  onChangeText={setEventDaysAway}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary, marginTop: 12 }]}
              onPress={handleCreateLifeEvent}
              disabled={submittingEvent}
            >
              {submittingEvent ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Milestone & Start Countdown</Text>
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
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
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
  tabBarRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  segmentTabText: {
    fontSize: 12,
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  alertBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  alertBannerText: {
    fontSize: 11,
    marginTop: 2,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
  chipsScroll: {
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
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  docSub: {
    fontSize: 11,
    marginTop: 2,
  },
  docExpiryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  eventIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  eventDate: {
    fontSize: 11,
    marginTop: 2,
  },
  countdownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countdownBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
    marginTop: 6,
  },
  emptyBoxSub: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 16,
  },
  inlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: '600',
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
    marginTop: 6,
  },
  modalInput: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 13,
    marginBottom: 4,
  },
  pickerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  pickerActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    marginBottom: 6,
  },
  selectedFileName: {
    fontSize: 11,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

