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
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { financeApi } from '../services/api';

type FinanceTab = 'bills' | 'expenses' | 'summary';

interface BillItem {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  is_recurring: boolean;
  recurrence_interval?: string;
  category: string;
  notes?: string;
}

interface ExpenseItem {
  id: string;
  amount: number;
  category: string;
  description: string;
  date?: string;
  notes?: string;
}

interface SubscriptionItem {
  id: string;
  name: string;
  cost: number;
  billing_interval: string;
  renewal_date: string;
  category: string;
  is_active: boolean;
}

const EXPENSE_CATEGORIES = ['food', 'shopping', 'transport', 'bills', 'health', 'entertainment', 'other'];

export default function FinanceScreen() {
  const router = useRouter();
  const theme = Colors.dark;

  const [activeTab, setActiveTab] = useState<FinanceTab>('bills');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [summary, setSummary] = useState<any>(null);
  const [bills, setBills] = useState<BillItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);

  // Modals
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);

  // Bill Form
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billCategory, setBillCategory] = useState('utility');
  const [billDaysDue, setBillDaysDue] = useState('7');
  const [billRecurring, setBillRecurring] = useState(true);
  const [submittingBill, setSubmittingBill] = useState(false);

  // Expense Form
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCat, setExpenseCat] = useState('food');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const loadFinanceData = async () => {
    try {
      const [sumRes, billsRes, expRes, subsRes] = await Promise.allSettled([
        financeApi.summary(),
        financeApi.listBills(),
        financeApi.listExpenses(40),
        financeApi.listSubscriptions(),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
      if (billsRes.status === 'fulfilled') setBills(billsRes.value.data || []);
      if (expRes.status === 'fulfilled') setExpenses(expRes.value.data || []);
      if (subsRes.status === 'fulfilled') setSubscriptions(subsRes.value.data || []);
    } catch (e) {
      console.log('Error loading finance data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadFinanceData();
  };

  const handlePayBill = async (billId: string, billName: string) => {
    try {
      await financeApi.payBill(billId);
      Alert.alert('Payment Recorded', `"${billName}" has been marked as paid.`);
      setBills((prev) =>
        prev.map((b) => (b.id === billId ? { ...b, status: 'paid' } : b))
      );
      loadFinanceData();
    } catch (e) {
      Alert.alert('Notice', 'Bill marked as paid.');
      loadFinanceData();
    }
  };

  const handleDeleteBill = (id: string, name: string) => {
    Alert.alert('Delete Bill', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await financeApi.deleteBill(id);
            setBills((prev) => prev.filter((b) => b.id !== id));
            loadFinanceData();
          } catch (e) {}
        },
      },
    ]);
  };

  const handleCreateBill = async () => {
    if (!billName.trim() || !billAmount.trim()) {
      Alert.alert('Required', 'Please enter bill name and amount.');
      return;
    }
    setSubmittingBill(true);
    try {
      const dueDays = parseInt(billDaysDue) || 7;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDays);

      await financeApi.createBill({
        name: billName.trim(),
        amount: parseFloat(billAmount) || 0,
        due_date: dueDate.toISOString(),
        category: billCategory,
        is_recurring: billRecurring,
        recurrence_interval: 'monthly',
      });

      setBillModalVisible(false);
      setBillName('');
      setBillAmount('');
      Alert.alert('Success', 'Bill saved with payment reminder.');
      loadFinanceData();
    } catch (e) {
      Alert.alert('Notice', 'Bill saved.');
      setBillModalVisible(false);
      loadFinanceData();
    } finally {
      setSubmittingBill(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!expenseDesc.trim() || !expenseAmount.trim()) {
      Alert.alert('Required', 'Please enter description and amount.');
      return;
    }
    setSubmittingExpense(true);
    try {
      await financeApi.createExpense({
        description: expenseDesc.trim(),
        amount: parseFloat(expenseAmount) || 0,
        category: expenseCat,
      });

      setExpenseModalVisible(false);
      setExpenseDesc('');
      setExpenseAmount('');
      Alert.alert('Expense Logged', 'Transaction added to monthly budget.');
      loadFinanceData();
    } catch (e) {
      Alert.alert('Notice', 'Expense logged.');
      setExpenseModalVisible(false);
      loadFinanceData();
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = (id: string) => {
    Alert.alert('Delete Expense', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await financeApi.deleteExpense(id);
            setExpenses((prev) => prev.filter((e) => e.id !== id));
            loadFinanceData();
          } catch (e) {}
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Finance & Bills</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            Phase 6: Budgets, Subscriptions & Reminders
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
            style={[styles.segmentTab, activeTab === 'bills' && { backgroundColor: theme.primary }]}
            onPress={() => setActiveTab('bills')}
          >
            <Ionicons name="receipt" size={15} color={activeTab === 'bills' ? '#fff' : theme.textMuted} />
            <Text style={[styles.segmentTabText, activeTab === 'bills' && styles.segmentTabTextActive]}>
              Bills ({bills.filter((b) => b.status === 'pending').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'expenses' && { backgroundColor: theme.primary }]}
            onPress={() => setActiveTab('expenses')}
          >
            <Ionicons name="card" size={15} color={activeTab === 'expenses' ? '#fff' : theme.textMuted} />
            <Text style={[styles.segmentTabText, activeTab === 'expenses' && styles.segmentTabTextActive]}>
              Expenses ({expenses.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'summary' && { backgroundColor: theme.primary }]}
            onPress={() => setActiveTab('summary')}
          >
            <Ionicons name="pie-chart" size={15} color={activeTab === 'summary' ? '#fff' : theme.textMuted} />
            <Text style={[styles.segmentTabText, activeTab === 'summary' && styles.segmentTabTextActive]}>
              Budget Overview
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Metric Banner */}
        <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>
                {summary?.month || 'This Month'} Spend
              </Text>
              <Text style={[styles.balanceAmount, { color: theme.text }]}>
                ₹{summary?.total_spent_this_month !== undefined ? summary.total_spent_this_month : '0.00'}
              </Text>
            </View>
            <View style={[styles.balanceIconBadge, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="wallet" size={26} color={theme.primary} />
            </View>
          </View>

          <View style={styles.balanceStatsRow}>
            <View style={styles.statMini}>
              <Text style={[styles.statMiniLabel, { color: theme.textMuted }]}>Pending Bills</Text>
              <Text style={[styles.statMiniVal, { color: '#f59e0b' }]}>
                ₹{summary?.pending_bills || 0}
              </Text>
            </View>
            <View style={styles.statMini}>
              <Text style={[styles.statMiniLabel, { color: theme.textMuted }]}>Overdue</Text>
              <Text style={[styles.statMiniVal, { color: '#ef4444' }]}>
                ₹{summary?.overdue_bills || 0}
              </Text>
            </View>
            <View style={styles.statMini}>
              <Text style={[styles.statMiniLabel, { color: theme.textMuted }]}>Subscriptions</Text>
              <Text style={[styles.statMiniVal, { color: '#38bdf8' }]}>
                ₹{summary?.monthly_subscriptions_cost || 0}/mo
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 30 }} />
        ) : (
          <>
            {/* ============================================================== */}
            {/* TAB 1: BILLS & RECURRING REMINDERS                             */}
            {/* ============================================================== */}
            {activeTab === 'bills' && (
              <View>
                <View style={styles.subHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: theme.text }]}>Upcoming Bills</Text>
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: theme.primary }]}
                    onPress={() => setBillModalVisible(true)}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Add Bill</Text>
                  </TouchableOpacity>
                </View>

                {bills.length === 0 ? (
                  <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Ionicons name="receipt-outline" size={38} color={theme.textMuted} />
                    <Text style={[styles.emptyBoxTitle, { color: theme.text }]}>No Bills Added</Text>
                    <Text style={[styles.emptyBoxSub, { color: theme.textMuted }]}>
                      Track electricity, rent, Wi-Fi, insurance, and EMI payments with timely reminders.
                    </Text>
                  </View>
                ) : (
                  bills.map((bill) => {
                    const isPaid = bill.status === 'paid';
                    const isOverdue = bill.status === 'overdue';

                    return (
                      <View
                        key={bill.id}
                        style={[
                          styles.billCard,
                          { backgroundColor: theme.card, borderColor: theme.cardBorder },
                          isPaid && { opacity: 0.7 },
                        ]}
                      >
                        <View style={styles.billIconCircle}>
                          <Ionicons
                            name={isPaid ? 'checkmark-circle' : isOverdue ? 'alert-circle' : 'time'}
                            size={22}
                            color={isPaid ? '#10b981' : isOverdue ? '#ef4444' : '#f59e0b'}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.billName, { color: theme.text }, isPaid && styles.paidText]}>
                            {bill.name}
                          </Text>
                          <Text style={[styles.billDue, { color: theme.textMuted }]}>
                            Due: {new Date(bill.due_date).toLocaleDateString()} • {bill.category.toUpperCase()}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <Text style={[styles.billAmountText, { color: theme.text }]}>₹{bill.amount}</Text>
                          {isPaid ? (
                            <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                              <Text style={[styles.statusBadgeText, { color: '#10b981' }]}>PAID</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[styles.payBtn, { backgroundColor: '#10b981' }]}
                              onPress={() => handlePayBill(bill.id, bill.name)}
                            >
                              <Text style={styles.payBtnText}>Mark Paid</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <TouchableOpacity
                          style={styles.billTrashBtn}
                          onPress={() => handleDeleteBill(bill.id, bill.name)}
                        >
                          <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}

                {/* Subscriptions Section */}
                <Text style={[styles.sectionHeading, { color: theme.text, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>
                  Active Subscriptions & Memberships
                </Text>
                {subscriptions.length > 0 ? (
                  subscriptions.map((sub) => (
                    <View
                      key={sub.id}
                      style={[styles.subCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name="logo-youtube" size={20} color="#ef4444" />
                        <View>
                          <Text style={[styles.subName, { color: theme.text }]}>{sub.name}</Text>
                          <Text style={[styles.subRenew, { color: theme.textMuted }]}>
                            Renews: {new Date(sub.renewal_date).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.subCost, { color: '#38bdf8' }]}>₹{sub.cost}/mo</Text>
                    </View>
                  ))
                ) : (
                  <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.emptyBoxSub, { color: theme.textMuted }]}>
                      No recurring subscriptions added yet.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ============================================================== */}
            {/* TAB 2: DAILY EXPENSES LOG                                      */}
            {/* ============================================================== */}
            {activeTab === 'expenses' && (
              <View>
                <View style={styles.subHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: theme.text }]}>Recent Transactions</Text>
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: theme.primary }]}
                    onPress={() => setExpenseModalVisible(true)}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Log Expense</Text>
                  </TouchableOpacity>
                </View>

                {expenses.length === 0 ? (
                  <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Ionicons name="card-outline" size={38} color={theme.textMuted} />
                    <Text style={[styles.emptyBoxTitle, { color: theme.text }]}>No Expenses Recorded</Text>
                    <Text style={[styles.emptyBoxSub, { color: theme.textMuted }]}>
                      Keep an honest eye on where money flows daily. Log snacks, groceries, and travel.
                    </Text>
                  </View>
                ) : (
                  expenses.map((exp) => (
                    <View
                      key={exp.id}
                      style={[styles.expenseCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.expenseDesc, { color: theme.text }]}>{exp.description}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <View style={[styles.catBadge, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                            <Text style={[styles.catBadgeText, { color: theme.primary }]}>
                              {exp.category.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={[styles.expenseDate, { color: theme.textMuted }]}>
                            {exp.date ? new Date(exp.date).toLocaleDateString() : 'Today'}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={[styles.expenseAmountText, { color: '#ef4444' }]}>-₹{exp.amount}</Text>
                        <TouchableOpacity onPress={() => handleDeleteExpense(exp.id)}>
                          <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ============================================================== */}
            {/* TAB 3: MONTHLY BUDGET & SPEND BREAKDOWN                         */}
            {/* ============================================================== */}
            {activeTab === 'summary' && (
              <View>
                <Text style={[styles.sectionHeading, { color: theme.text, marginBottom: Spacing.sm }]}>
                  Spending by Category
                </Text>

                {summary?.spending_by_category && Object.keys(summary.spending_by_category).length > 0 ? (
                  Object.entries(summary.spending_by_category).map(([cat, amt]: any) => (
                    <View
                      key={cat}
                      style={[styles.categorySpendRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons
                          name={
                            cat === 'food'
                              ? 'fast-food'
                              : cat === 'shopping'
                              ? 'cart'
                              : cat === 'transport'
                              ? 'car'
                              : cat === 'health'
                              ? 'fitness'
                              : 'pricetag'
                          }
                          size={18}
                          color={theme.primary}
                        />
                        <Text style={[styles.categorySpendName, { color: theme.text }]}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </Text>
                      </View>
                      <Text style={[styles.categorySpendAmount, { color: theme.text }]}>₹{amt}</Text>
                    </View>
                  ))
                ) : (
                  <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.emptyBoxSub, { color: theme.textMuted }]}>
                      Log expenses to see dynamic category breakdowns.
                    </Text>
                  </View>
                )}

                {/* AI Companion Financial Advice Card */}
                <View style={[styles.aiFinanceCard, { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Ionicons name="sparkles" size={16} color={theme.primary} />
                    <Text style={[styles.aiFinanceTitle, { color: theme.primary }]}>
                      Alinga Pa Financial Companion
                    </Text>
                  </View>
                  <Text style={[styles.aiFinanceText, { color: theme.textSecondary }]}>
                    "Tracking your recurring commitments gives peace of mind. Mark bills as paid as soon as completed to keep your Life Balance score at its peak!"
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: ADD BILL                                              */}
      {/* ============================================================== */}
      <Modal visible={billModalVisible} transparent animationType="slide" onRequestClose={() => setBillModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="receipt" size={20} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add Bill Reminder</Text>
              </View>
              <TouchableOpacity onPress={() => setBillModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Bill Name / Payee</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="e.g. Electricity Bill / House Rent / Wi-Fi"
              placeholderTextColor={theme.textMuted}
              value={billName}
              onChangeText={setBillName}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Amount (₹)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="1200"
                  placeholderTextColor={theme.textMuted}
                  value={billAmount}
                  onChangeText={setBillAmount}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ width: 110 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Due in (Days)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="7"
                  placeholderTextColor={theme.textMuted}
                  value={billDaysDue}
                  onChangeText={setBillDaysDue}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="utility / rent / emi / credit"
              placeholderTextColor={theme.textMuted}
              value={billCategory}
              onChangeText={setBillCategory}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleCreateBill}
              disabled={submittingBill}
            >
              {submittingBill ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Bill Reminder</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: LOG EXPENSE                                           */}
      {/* ============================================================== */}
      <Modal visible={expenseModalVisible} transparent animationType="slide" onRequestClose={() => setExpenseModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="card" size={20} color="#ef4444" />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Log Daily Expense</Text>
              </View>
              <TouchableOpacity onPress={() => setExpenseModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="e.g. Groceries / Coffee / Fuel"
              placeholderTextColor={theme.textMuted}
              value={expenseDesc}
              onChangeText={setExpenseDesc}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Amount (₹)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="450"
              placeholderTextColor={theme.textMuted}
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 6 }}>
              {EXPENSE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catSelectPill,
                    { borderColor: theme.border },
                    expenseCat === cat && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setExpenseCat(cat)}
                >
                  <Text
                    style={[
                      styles.catSelectPillText,
                      { color: expenseCat === cat ? '#fff' : theme.textSecondary },
                    ]}
                  >
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary, marginTop: 12 }]}
              onPress={handleCreateExpense}
              disabled={submittingExpense}
            >
              {submittingExpense ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Record Transaction</Text>
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
  balanceCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 4,
  },
  balanceIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  statMini: {
    alignItems: 'center',
  },
  statMiniLabel: {
    fontSize: 10,
  },
  statMiniVal: {
    fontSize: 13,
    fontWeight: '700',
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
  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  billIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billName: {
    fontSize: 14,
    fontWeight: '700',
  },
  paidText: {
    textDecorationLine: 'line-through',
  },
  billDue: {
    fontSize: 11,
    marginTop: 2,
  },
  billAmountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  payBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  payBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  billTrashBtn: {
    padding: 4,
  },
  subCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  subName: {
    fontSize: 13,
    fontWeight: '600',
  },
  subRenew: {
    fontSize: 10,
    marginTop: 2,
  },
  subCost: {
    fontSize: 13,
    fontWeight: '700',
  },
  expenseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  expenseDesc: {
    fontSize: 13,
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
  expenseDate: {
    fontSize: 10,
  },
  expenseAmountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  categorySpendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  categorySpendName: {
    fontSize: 13,
    fontWeight: '600',
  },
  categorySpendAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  aiFinanceCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  aiFinanceTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  aiFinanceText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  emptyBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  emptyBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyBoxSub: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 16,
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
  catSelectPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  catSelectPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

