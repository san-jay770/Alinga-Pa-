import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Automatically detect host IP from Expo Metro bundler or fallback
const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }

  // If running on phone via Expo Go, dynamically use the laptop IP serving the app
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost') {
      return `http://${ip}:8000`;
    }
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  return 'http://172.22.82.37:8000';
};

export const API_BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT token into requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('alinga_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Failed to retrieve token from storage', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Gracefully handle 401 unauthorized & expired tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem('alinga_token');
      } catch {
        // ignore
      }
    }
    return Promise.reject(error);
  }
);

// Auth Endpoints
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/api/auth/login', data),
  register: (data: { email: string; username: string; full_name: string; password: string }) =>
    api.post('/api/auth/register', data),
  socialLogin: (data: { provider: string; email?: string; name?: string }) =>
    api.post('/api/auth/social-login', data),
  me: () => api.get('/api/auth/me'),
  updateMe: (data: any) => api.put('/api/auth/me', data),
};

// Dashboard & Stats
export const dashboardApi = {
  stats: () => api.get('/api/dashboard/stats'),
  todayAgenda: () => api.get('/api/dashboard/today-agenda'),
  weeklyInsights: () => api.get('/api/dashboard/weekly-insights'),
};

// Tasks Endpoints
export const tasksApi = {
  list: (params?: any) => api.get('/api/tasks/', { params }),
  create: (data: any) => api.post('/api/tasks/', data),
  update: (id: string, data: any) => api.put(`/api/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/api/tasks/${id}`),
  complete: (id: string) => api.post(`/api/tasks/${id}/complete`),
};

// AI Assistant Endpoints
export const aiApi = {
  chat: (data: {
    message: string;
    history?: Array<{ role: string; content: string }>;
    language?: string;
    attachment?: any;
  }) => api.post('/api/ai/chat', data),
  voiceChat: (formData: FormData) =>
    api.post('/api/ai/voice-chat', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }),
  executeAction: (data: {
    action_type: string;
    title: string;
    priority?: string;
    category?: string;
    estimated_minutes?: number;
    time?: string;
    task_id?: string;
  }) => api.post('/api/ai/execute-action', data),
  planDay: (data: any) => api.post('/api/ai/plan-day', data),
  autoPlanDay: (targetDate?: string) =>
    api.post('/api/ai/auto-plan-day', null, { params: { target_date: targetDate } }),
  recoverMissedTasks: () => api.post('/api/ai/recover-missed-tasks'),
  applyRecovery: (items: any[]) => api.post('/api/ai/apply-recovery', { items }),
  breakdownGoal: (data: any) => api.post('/api/ai/breakdown-goal', data),
  decisionHelp: (data: any) => api.post('/api/ai/decision-help', data),
  suggestActions: (context: string) => api.post('/api/ai/suggest-actions', null, { params: { context } }),
  status: () => api.get('/api/ai/status'),
  saveKey: (data: { provider: string; api_key: string }) => api.post('/api/ai/save-key', data),
};

// Habits Endpoints
export const habitsApi = {
  list: () => api.get('/api/habits/'),
  create: (data: any) => api.post('/api/habits/', data),
  log: (id: string, data?: any) => api.post(`/api/habits/${id}/log`, data || {}),
  delete: (id: string) => api.delete(`/api/habits/${id}`),
  today: () => api.get('/api/habits/today'),
};

// Goals Endpoints
export const goalsApi = {
  list: (params?: any) => api.get('/api/goals/', { params }),
  create: (data: any) => api.post('/api/goals/', data),
  update: (id: string, data: any) => api.patch(`/api/goals/${id}`, data),
  delete: (id: string) => api.delete(`/api/goals/${id}`),
  addMilestone: (id: string, data: any) => api.post(`/api/goals/${id}/milestones`, data),
  updateMilestone: (id: string, milestoneId: string, data: any) =>
    api.patch(`/api/goals/${id}/milestones/${milestoneId}`, data),
  breakdown: (data: { goal_title: string; goal_description?: string; days_available?: number }) =>
    api.post('/api/ai/breakdown-goal', data, { timeout: 25000 }),
};

// Personal Knowledge & Memory Vault
export const knowledgeApi = {
  listMemories: (params?: any) => api.get('/api/knowledge/memories', { params }),
  createMemory: (data: { content: string; category?: string; tags?: string }) =>
    api.post('/api/knowledge/memories', data),
  deleteMemory: (id: string) => api.delete(`/api/knowledge/memories/${id}`),
  search: (q: string) => api.get('/api/knowledge/search', { params: { q } }),
};

// Events & Calendar Endpoints
export const eventsApi = {
  list: (params?: any) => api.get('/api/events/', { params }),
  create: (data: any) => api.post('/api/events/', data),
  update: (id: string, data: any) => api.put(`/api/events/${id}`, data),
  delete: (id: string) => api.delete(`/api/events/${id}`),
  conflicts: () => api.get('/api/events/conflicts'),
  freeSlots: (params?: any) => api.get('/api/events/free-slots', { params }),
};

// Notifications Endpoints
export const notificationsApi = {
  list: (params?: any) => api.get('/api/notifications/', { params }),
  dismiss: (id: string) => api.post(`/api/notifications/${id}/dismiss`),
  snooze: (id: string, minutes: number = 30) =>
    api.post(`/api/notifications/${id}/snooze`, null, { params: { minutes } }),
  clearAll: () => api.delete('/api/notifications/clear-all'),
  pendingCount: () => api.get('/api/notifications/pending-count'),
  sendTest: () => api.post('/api/notifications/send-test'),
};

// Finance Endpoints
export const financeApi = {
  summary: () => api.get('/api/finance/summary'),
  listBills: (status?: string) => api.get('/api/finance/bills', { params: { status } }),
  createBill: (data: any) => api.post('/api/finance/bills', data),
  updateBill: (id: string, data: any) => api.put(`/api/finance/bills/${id}`, data),
  deleteBill: (id: string) => api.delete(`/api/finance/bills/${id}`),
  payBill: (id: string) => api.post(`/api/finance/bills/${id}/pay`),
  listExpenses: (limit: number = 50) => api.get('/api/finance/expenses', { params: { limit } }),
  createExpense: (data: any) => api.post('/api/finance/expenses', data),
  deleteExpense: (id: string) => api.delete(`/api/finance/expenses/${id}`),
  listSubscriptions: () => api.get('/api/finance/subscriptions'),
  createSubscription: (data: any) => api.post('/api/finance/subscriptions', data),
  deleteSubscription: (id: string) => api.delete(`/api/finance/subscriptions/${id}`),
};

// Document Vault & Life Events Endpoints
export const vaultApi = {
  listDocuments: (params?: { category?: string; search?: string }) =>
    api.get('/api/vault/documents', { params }),
  createDocument: (data: any) => api.post('/api/vault/documents', data),
  deleteDocument: (id: string) => api.delete(`/api/vault/documents/${id}`),
  expiringDocs: (days: number = 45) => api.get('/api/vault/expiring', { params: { days } }),
  listLifeEvents: () => api.get('/api/vault/life-events'),
  createLifeEvent: (data: any) => api.post('/api/vault/life-events', data),
  deleteLifeEvent: (id: string) => api.delete(`/api/vault/life-events/${id}`),
};

// Focus Session & Pomodoro Endpoints
export const focusApi = {
  list: (limit: number = 20) => api.get('/api/focus/', { params: { limit } }),
  startSession: (data: { duration_minutes: number; break_minutes?: number; task_id?: string; notes?: string }) =>
    api.post('/api/focus/', data),
  completeSession: (id: string) => api.post(`/api/focus/${id}/complete`),
  stats: () => api.get('/api/focus/stats'),
};

// Privacy, Security & Cross-Device Endpoints
export const privacyApi = {
  exportData: () => api.get('/api/privacy/export'),
  securityAudit: () => api.get('/api/privacy/security-audit'),
  toggleAiSharing: (enabled?: boolean) =>
    api.post('/api/privacy/toggle-ai-sharing', null, { params: enabled !== undefined ? { enabled } : {} }),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/api/privacy/change-password', data),
  listDevices: () => api.get('/api/privacy/devices'),
  registerDevice: (data: { device_name: string; device_type?: string; ip_address?: string }) =>
    api.post('/api/privacy/devices', data),
  revokeOtherDevices: () => api.post('/api/privacy/revoke-other-devices'),
  purgeCategory: (category: string) => api.post('/api/privacy/purge-category', { category }),
  deleteAccount: (data: { password: string; confirmation: string }) =>
    api.post('/api/privacy/delete-account', data),
};
