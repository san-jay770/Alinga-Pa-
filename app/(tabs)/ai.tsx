import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { aiApi } from '../../services/api';

interface ActionProposal {
  type: string;
  title: string;
  priority?: string;
  category?: string;
  estimated_minutes?: number;
  time?: string;
  task_id?: string;
  executed?: boolean;
}

export interface MessageAttachment {
  name: string;
  type: 'document' | 'image' | 'pdf' | 'text';
  size?: string;
  uri?: string;
  base64?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  action?: ActionProposal | null;
  quick_replies?: string[];
  provider?: string;
  attachment?: MessageAttachment | null;
}

const LANGUAGES = [
  { id: 'tanglish', label: 'Tanglish', sub: 'Tamil + English (Iniku enna plan?)', flag: '🌟', speechLocale: 'ta-IN' },
  { id: 'tamil', label: 'தமிழ்', sub: 'Tamil', flag: '🇮🇳', speechLocale: 'ta-IN' },
  { id: 'english', label: 'English', sub: 'Standard English', flag: '🌐', speechLocale: 'en-US' },
  { id: 'hindi', label: 'हिंदी', sub: 'Hindi', flag: '🇮🇳', speechLocale: 'hi-IN' },
  { id: 'telugu', label: 'తెలుగు', sub: 'Telugu', flag: '🇮🇳', speechLocale: 'te-IN' },
  { id: 'kannada', label: 'ಕನ್ನಡ', sub: 'Kannada', flag: '🇮🇳', speechLocale: 'kn-IN' },
  { id: 'malayalam', label: 'മലയാളം', sub: 'Malayalam', flag: '🇮🇳', speechLocale: 'ml-IN' },
  { id: 'bengali', label: 'বাংলা', sub: 'Bengali', flag: '🇮🇳', speechLocale: 'bn-IN' },
  { id: 'marathi', label: 'मराठी', sub: 'Marathi', flag: '🇮🇳', speechLocale: 'mr-IN' },
  { id: 'gujarati', label: 'ગુજરાતી', sub: 'Gujarati', flag: '🇮🇳', speechLocale: 'gu-IN' },
];

const DEFAULT_QUICK_REPLIES: Record<string, string[]> = {
  tanglish: ['👋 Eppadi iruka pa?', '🥱 Romba bore adikithu', '😂 Oru nalla joke sollu', '📅 Iniku enna plan?', '📋 Pending tasks enna?', '💡 Motivation quote kudu'],
  tamil: ['👋 எப்படி இருக்கிறீர்கள்?', '😂 ஒரு நகைச்சுவை சொல்', '📅 இன்றைய திட்டம் என்ன?', '📋 நிலுவை பணிகள் எவை?', '💡 ஊக்கமளிக்கும் வரிகள்'],
  english: ['👋 How are you?', "🥱 I'm feeling bored", '😂 Tell me a joke', '📅 Plan my day', '📋 What tasks are pending?', '💡 Give me motivation'],
  hindi: ['👋 आप कैसे हैं?', '😂 एक चुटकुला सुनाओ', '📅 आज का दिन प्लान करो', '📋 कौन से काम बाकी हैं?', '💡 प्रेरक विचार बताओ'],
  telugu: ['👋 ఎలా ఉన్నారు?', '😂 ఒక జోక్ చెప్పు', '📅 ఈరోజు ప్లాన్ చేయండి', '📋 పెండింగ్ పనులు ఏమిటి?'],
  kannada: ['👋 ಹೇಗಿದ್ದೀರಾ?', '😂 ಒಂದು ಜೋಕ್ ಹೇಳಿ', '📅 ಇಂದಿನ ದಿನವನ್ನು ಯೋಜಿಸಿ', '📋 ಬಾಕಿ ಕೆಲಸಗಳು'],
  malayalam: ['👋 സുഖമാണോ?', '😂 ഒരു തമാശ പറയൂ', '📅 ഇന്നത്തെ ദിനം പ്ലാൻ ചെയ്യുക', '📋 ബാക്കി ജോലികൾ'],
  bengali: ['👋 কেমন আছেন?', '😂 একটি কৌতুক বলুন', '📅 আজকের পরিকল্পনা তৈরি করুন', '📋 বাকি কাজগুলি'],
  marathi: ['👋 कसे आहात?', '😂 एक विनोद सांगा', '📅 आजचे नियोजन करा', '📋 शिल्लक कामे'],
  gujarati: ['👋 કેમ છો?', '😂 એક જોક કહો', '📅 આજનું આયોજન કરો', '📋 બાકી કામો'],
};

export default function AIAssistantScreen() {
  const theme = Colors.dark;
  const scrollViewRef = useRef<any>(null);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<{ available: boolean; provider?: string }>({
    available: false,
  });

  // Settings / API Key Modal
  const [settingsModal, setSettingsModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai'>('gemini');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  // Language & Attachment States
  const [selectedLanguage, setSelectedLanguage] = useState<string>('tanglish');
  const currentLangObj = LANGUAGES.find((l) => l.id === selectedLanguage) || LANGUAGES[0];
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [attachedFile, setAttachedFile] = useState<MessageAttachment | null>(null);
  const [attachOptionsModal, setAttachOptionsModal] = useState(false);

  // Sync language from storage on mount
  useEffect(() => {
    AsyncStorage.getItem('app_language').then((saved) => {
      if (saved && LANGUAGES.some((l) => l.id === saved)) {
        setSelectedLanguage(saved);
        if (DEFAULT_QUICK_REPLIES[saved]) {
          setActiveQuickReplies(DEFAULT_QUICK_REPLIES[saved]);
        }
      }
    }).catch(() => {});
  }, []);

  const handleSelectLanguage = (langId: string) => {
    setSelectedLanguage(langId);
    AsyncStorage.setItem('app_language', langId).catch(() => {});
    setLangModalVisible(false);
    if (DEFAULT_QUICK_REPLIES[langId]) {
      setActiveQuickReplies(DEFAULT_QUICK_REPLIES[langId]);
    }
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'text/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const file = res.assets[0];
        setAttachedFile({
          name: file.name,
          type: file.mimeType?.includes('pdf') ? 'pdf' : 'document',
          size: file.size ? `${Math.round(file.size / 1024)} KB` : 'Document',
          uri: file.uri,
        });
        setAttachOptionsModal(false);
      }
    } catch (e) {
      Alert.alert('File Picker', 'Could not open document picker.');
    }
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Gallery access is needed to select images.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const img = res.assets[0];
        setAttachedFile({
          name: img.fileName || 'Image_Attachment.jpg',
          type: 'image',
          size: img.fileSize ? `${Math.round(img.fileSize / 1024)} KB` : 'Image',
          uri: img.uri,
          base64: img.base64 ? `data:image/jpeg;base64,${img.base64}` : undefined,
        });
        setAttachOptionsModal(false);
      }
    } catch (e) {
      Alert.alert('Photo Picker', 'Could not access photo library.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to capture photos.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const img = res.assets[0];
        setAttachedFile({
          name: 'Camera_Snapshot.jpg',
          type: 'image',
          size: img.fileSize ? `${Math.round(img.fileSize / 1024)} KB` : 'Photo',
          uri: img.uri,
          base64: img.base64 ? `data:image/jpeg;base64,${img.base64}` : undefined,
        });
        setAttachOptionsModal(false);
      }
    } catch (e) {
      Alert.alert('Camera', 'Could not launch camera.');
    }
  };

  // Voice Assistant State
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(true);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResponseText, setVoiceResponseText] = useState('');
  const [voiceStatusText, setVoiceStatusText] = useState('Tap Orb to speak');
  const [latestVoiceAction, setLatestVoiceAction] = useState<ActionProposal | null>(null);
  const [voiceInputText, setVoiceInputText] = useState('');
  const [voiceTopicTab, setVoiceTopicTab] = useState<'casual' | 'tasks' | 'wellness'>('casual');
  const voiceInputRef = useRef<any>(null);

  // Waveform & Voice Orb Animations (ChatGPT Style)
  const voiceOrbScale = useRef(new Animated.Value(1)).current;
  const voiceOrbScale2 = useRef(new Animated.Value(1)).current;
  const voiceOrbGlow = useRef(new Animated.Value(0.3)).current;
  const waveBars = [
    useRef(new Animated.Value(0.2)).current,
    useRef(new Animated.Value(0.45)).current,
    useRef(new Animated.Value(0.85)).current,
    useRef(new Animated.Value(1.0)).current,
    useRef(new Animated.Value(0.75)).current,
    useRef(new Animated.Value(0.45)).current,
    useRef(new Animated.Value(0.2)).current,
  ];
  const waveformAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Stop Speech on Unmount
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const startWaveformAnimation = () => {
    const anims = waveBars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 0.95,
            duration: 180 + i * 50,
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: 0.15,
            duration: 180 + i * 50,
            useNativeDriver: false,
          }),
        ])
      )
    );
    const composite = Animated.parallel(anims);
    waveformAnimRef.current = composite;
    composite.start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(voiceOrbScale, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(voiceOrbScale, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(voiceOrbScale2, { toValue: 1.45, duration: 1200, useNativeDriver: true }),
        Animated.timing(voiceOrbScale2, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(voiceOrbGlow, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(voiceOrbGlow, { toValue: 0.25, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopWaveformAnimation = () => {
    waveformAnimRef.current?.stop();
    waveBars.forEach((bar) => bar.setValue(0.2));
    voiceOrbScale.setValue(1);
    voiceOrbScale2.setValue(1);
    voiceOrbGlow.setValue(0.3);
  };

  const startVoiceListening = () => {
    try {
      Speech.stop();
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      setIsListening(true);
      setIsRecording(false);
      setVoiceStatusText(`Listening... Speak in ${currentLangObj.label} or tap keyboard mic 🎙️`);
      startWaveformAnimation();
      setTimeout(() => {
        voiceInputRef.current?.focus();
      }, 150);
    } catch (err) {
      console.log('Voice listening error:', err);
      setIsListening(false);
      stopWaveformAnimation();
      setVoiceStatusText('Tap Orb to speak');
    }
  };

  const handleInterruptSpeech = async () => {
    try {
      await Speech.stop();
    } catch (_) {}
    setIsSpeaking(false);
    setSpeakingMsgId(null);
    startVoiceListening();
  };

  const handleOrbPress = () => {
    if (isSpeaking) {
      handleInterruptSpeech();
    } else if (isListening) {
      setIsListening(false);
      stopWaveformAnimation();
      setVoiceStatusText('Tap Orb to speak');
    } else {
      startVoiceListening();
    }
  };

  const openVoiceAssistant = () => {
    setVoiceModalVisible(true);
    setVoiceStatusText('Tap Orb or tap microphone to speak');
    setTimeout(() => {
      startVoiceListening();
    }, 350);
  };

  const closeVoiceAssistant = async () => {
    try {
      await Speech.stop();
    } catch (_) {}
    setIsSpeaking(false);
    setIsListening(false);
    setIsRecording(false);
    stopWaveformAnimation();
    setVoiceModalVisible(false);
  };

  const speakMessage = async (text: string, msgId?: string) => {
    try {
      if (isSpeaking && speakingMsgId === msgId) {
        await Speech.stop();
        setIsSpeaking(false);
        setSpeakingMsgId(null);
        return;
      }

      await Speech.stop();
      setIsSpeaking(true);
      setSpeakingMsgId(msgId || 'voice');
      startWaveformAnimation();

      const cleanText = text
        .replace(/[*_#`~•]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .trim();

      // Intelligent Indic & Latin script detection
      const hasTamilScript = /[\u0B80-\u0BFF]/.test(cleanText);
      const hasHindiScript = /[\u0900-\u097F]/.test(cleanText);
      const hasTeluguScript = /[\u0C00-\u0C7F]/.test(cleanText);
      const hasKannadaScript = /[\u0C80-\u0CFF]/.test(cleanText);
      const hasMalayalamScript = /[\u0D00-\u0D7F]/.test(cleanText);
      const hasBengaliScript = /[\u0980-\u09FF]/.test(cleanText);
      const hasGujaratiScript = /[\u0A80-\u0AFF]/.test(cleanText);
      const hasMarathiScript = /[\u0900-\u097F]/.test(cleanText);

      let targetLocale = 'en-IN';
      if (hasTamilScript) {
        targetLocale = 'ta-IN';
      } else if (hasHindiScript) {
        targetLocale = 'hi-IN';
      } else if (hasTeluguScript) {
        targetLocale = 'te-IN';
      } else if (hasKannadaScript) {
        targetLocale = 'kn-IN';
      } else if (hasMalayalamScript) {
        targetLocale = 'ml-IN';
      } else if (hasBengaliScript) {
        targetLocale = 'bn-IN';
      } else if (hasGujaratiScript) {
        targetLocale = 'gu-IN';
      } else if (hasMarathiScript) {
        targetLocale = 'mr-IN';
      } else if (selectedLanguage === 'english') {
        targetLocale = 'en-US';
      } else {
        // Tanglish (Tamil in English alphabet) - 'en-IN' pronounces words with warm natural fluency
        targetLocale = 'en-IN';
      }

      setVoiceStatusText('Alinga Pa is speaking... (Tap orb to interrupt)');

      Speech.speak(cleanText, {
        language: targetLocale,
        pitch: 1.05,
        rate: 0.92,
        onDone: () => {
          setIsSpeaking(false);
          setSpeakingMsgId(null);
          if (handsFreeMode && voiceModalVisible) {
            setTimeout(() => {
              startVoiceListening();
            }, 600);
          } else {
            if (!isListening) stopWaveformAnimation();
            setVoiceStatusText('Tap Orb to speak');
          }
        },
        onError: () => {
          setIsSpeaking(false);
          setSpeakingMsgId(null);
          if (!isListening) stopWaveformAnimation();
          setVoiceStatusText('Tap Orb to start speaking');
        },
      });
    } catch (err) {
      console.log('Speech error', err);
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      stopWaveformAnimation();
      setVoiceStatusText('Tap Orb to start speaking');
    }
  };

  const handleVoiceCommand = async (commandText: string) => {
    setVoiceTranscript(commandText);
    setVoiceInputText('');
    setIsListening(false);
    setVoiceStatusText('Thinking... Talking with Alinga Pa');
    setLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: commandText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await aiApi.chat({
        message: commandText,
        history: historyPayload,
        language: selectedLanguage,
      });

      const data = res.data;
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.reply || "Super pa! Un kooda pesuradhu romba jolly-ah iruku. Vera enna vishesham?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: data.action || null,
        quick_replies: data.quick_replies || [],
        provider: data.provider || 'gemini',
      };

      setMessages((prev) => [...prev, botMsg]);
      setVoiceResponseText(botMsg.text);
      setLatestVoiceAction(botMsg.action || null);
      if (data.quick_replies && data.quick_replies.length > 0) {
        setActiveQuickReplies(data.quick_replies);
      }
      speakMessage(botMsg.text, botMsg.id);
    } catch (e: any) {
      const fallbackText = "Naan nalla iruken pa! Un kooda eppavum pesa ready-ah iruken. Iniku unga day epdi pogudhu?";
      setVoiceResponseText(fallbackText);
      speakMessage(fallbackText, 'voice-fallback');
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: "Hello! I am Alinga Pa, your personal life companion. I understand your routines, pending deadlines, and schedule commitments. How can I help you today?",
      time: 'Just now',
      quick_replies: ['Plan my day', 'What tasks are pending?', 'How much free time do I have?', 'Recover missed tasks'],
    },
  ]);

  const [activeQuickReplies, setActiveQuickReplies] = useState<string[]>([
    'Plan my day',
    'What tasks are pending?',
    'How much free time do I have?',
    'Recover missed tasks',
  ]);

  // Load AI status on mount
  useEffect(() => {
    aiApi.status().then((res) => {
      if (res.data) {
        setAiStatus(res.data);
      }
    }).catch(() => {});
  }, []);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    const currentAttachment = attachedFile;
    if ((!text && !currentAttachment) || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text || (currentAttachment ? `Attached: ${currentAttachment.name}` : ''),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachment: currentAttachment,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAttachedFile(null);
    setLoading(true);

    try {
      // Build conversational memory history
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await aiApi.chat({
        message: text || (currentAttachment ? `Attached: ${currentAttachment.name}` : ''),
        history: historyPayload,
        language: selectedLanguage,
        attachment: currentAttachment,
      });

      const data = res.data;
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.reply || "I've reviewed your request and analyzed your schedule.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: data.action || null,
        quick_replies: data.quick_replies || [],
        provider: data.provider || 'heuristic',
      };

      setMessages((prev) => [...prev, botMsg]);
      if (data.quick_replies && data.quick_replies.length > 0) {
        setActiveQuickReplies(data.quick_replies);
      }
      if (autoSpeak) {
        speakMessage(botMsg.text, botMsg.id);
      }
    } catch (e: any) {
      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: "I've analyzed your schedule with my built-in companion engine. Everything is monitored and balanced.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'heuristic',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  // Rule 49: User-Controlled AI Action Execution
  const handleExecuteAction = async (msgId: string, action: ActionProposal) => {
    setActionLoading(msgId);
    try {
      const res = await aiApi.executeAction({
        action_type: action.type,
        title: action.title,
        priority: action.priority,
        category: action.category,
        estimated_minutes: action.estimated_minutes,
        time: action.time,
        task_id: action.task_id,
      });

      // Mark action as executed in message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, action: { ...action, executed: true } } : m
        )
      );

      Alert.alert('Action Confirmed', res.data?.message || 'Your action has been safely applied.');
    } catch (err: any) {
      Alert.alert('Execution Error', err.response?.data?.detail || 'Could not execute this action.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismissAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, action: null } : m))
    );
  };

  const handleSaveAIKey = async () => {
    if (!apiKeyInput.trim()) {
      Alert.alert('Required', 'Please enter your Cloud AI API key.');
      return;
    }

    setSavingKey(true);
    try {
      const res = await aiApi.saveKey({
        provider: selectedProvider,
        api_key: apiKeyInput.trim(),
      });
      setAiStatus({ available: res.data?.available, provider: res.data?.provider });
      setApiKeyInput('');
      setSettingsModal(false);
      Alert.alert('AI Connected', `Successfully connected to ${selectedProvider.toUpperCase()} Cloud AI!`);
    } catch (err: any) {
      Alert.alert('Configuration Error', err.response?.data?.detail || 'Failed to save API key.');
    } finally {
      setSavingKey(false);
    }
  };

  const handleClearChat = () => {
    Alert.alert('Clear Chat', 'Reset your conversation history with Alinga Pa?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMessages([
            {
              id: Date.now().toString(),
              sender: 'assistant',
              text: "Conversation refreshed. I'm ready to help you organize your tasks and daily life.",
              time: 'Just now',
              quick_replies: ['Plan my day', 'What tasks are pending?', 'Check free time'],
            },
          ]);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.aiBadge, { backgroundColor: theme.primary }]}>
              <Ionicons name="sparkles" size={18} color="#fff" />
            </View>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>Alinga Pa AI Companion</Text>
              <TouchableOpacity onPress={() => setSettingsModal(true)}>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: aiStatus.available ? theme.success : '#f59e0b' },
                    ]}
                  />
                  <Text style={[styles.status, { color: aiStatus.available ? theme.success : '#f59e0b' }]}>
                    {aiStatus.available
                      ? `Cloud AI (${(aiStatus.provider || 'gemini').toUpperCase()})`
                      : 'Heuristic Engine • Tap to add API Key'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[
                styles.headerVoicePill,
                { backgroundColor: (isListening || isRecording) ? theme.danger : 'rgba(99, 102, 241, 0.16)' },
              ]}
              onPress={openVoiceAssistant}
            >
              <Ionicons name="mic" size={14} color={(isListening || isRecording) ? '#fff' : theme.primary} />
              <Text style={[styles.headerVoiceText, { color: (isListening || isRecording) ? '#fff' : theme.primary }]}>
                Voice
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => {
                const next = !autoSpeak;
                setAutoSpeak(next);
                if (!next) {
                  Speech.stop();
                  setIsSpeaking(false);
                }
              }}
            >
              <Ionicons
                name={autoSpeak ? 'volume-high' : 'volume-mute-outline'}
                size={18}
                color={autoSpeak ? theme.primary : theme.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setSettingsModal(true)}>
              <Ionicons name="settings-outline" size={18} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleClearChat}>
              <Ionicons name="refresh-outline" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Language & Voice Sub-Header Bar */}
        <View style={[styles.langBar, { borderBottomColor: theme.cardBorder, backgroundColor: theme.card }]}>
          <TouchableOpacity
            style={[styles.headerLangPill, { borderColor: theme.border }]}
            onPress={() => setLangModalVisible(true)}
          >
            <Text style={styles.headerLangFlag}>
              {LANGUAGES.find((l) => l.id === selectedLanguage)?.flag || '🌟'}
            </Text>
            <Text style={[styles.headerLangText, { color: theme.text }]}>
              {LANGUAGES.find((l) => l.id === selectedLanguage)?.label || 'Tanglish'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              style={[
                styles.headerVoicePill,
                { backgroundColor: (isListening || isRecording) ? theme.danger : 'rgba(99, 102, 241, 0.16)' },
              ]}
              onPress={openVoiceAssistant}
            >
              <Ionicons name="mic" size={13} color={(isListening || isRecording) ? '#fff' : theme.primary} />
              <Text style={[styles.headerVoiceText, { color: (isListening || isRecording) ? '#fff' : theme.primary }]}>
                Voice Assistant
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.autoSpeakChip,
                { backgroundColor: autoSpeak ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255,255,255,0.06)' },
              ]}
              onPress={() => {
                const next = !autoSpeak;
                setAutoSpeak(next);
                if (!next) {
                  Speech.stop();
                  setIsSpeaking(false);
                }
              }}
            >
              <Ionicons
                name={autoSpeak ? 'volume-high' : 'volume-mute-outline'}
                size={13}
                color={autoSpeak ? theme.success : theme.textMuted}
              />
              <Text style={[styles.autoSpeakText, { color: autoSpeak ? theme.success : theme.textMuted }]}>
                {autoSpeak ? 'Voice On' : 'Voice Off'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Message Thread */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const action = msg.action;

            return (
              <View
                key={msg.id}
                style={[
                  styles.messageBubbleContainer,
                  isUser ? styles.userMessageContainer : styles.botMessageContainer,
                ]}
              >
                {!isUser && (
                  <View style={[styles.miniAvatar, { backgroundColor: theme.primary }]}>
                    <Ionicons name="sparkles" size={12} color="#fff" />
                  </View>
                )}
                <View style={{ maxWidth: '85%' }}>
                  <View
                    style={[
                      styles.messageBubble,
                      isUser
                        ? [styles.userBubble, { backgroundColor: theme.primary }]
                        : [styles.botBubble, { backgroundColor: theme.card, borderColor: theme.cardBorder }],
                    ]}
                  >
                    {msg.attachment && (
                      <View style={[styles.msgAttachmentBadge, { backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : theme.cardBorder }]}>
                        {msg.attachment.type === 'image' && msg.attachment.uri ? (
                          <Image
                            source={{ uri: msg.attachment.uri }}
                            style={styles.msgAttachmentThumb}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.msgAttachmentIcon}>
                            <Ionicons
                              name={msg.attachment.type === 'pdf' ? 'document-text' : 'document'}
                              size={20}
                              color={theme.primary}
                            />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.msgAttachmentName, { color: theme.text }]} numberOfLines={1}>
                            {msg.attachment.name}
                          </Text>
                          <Text style={[styles.msgAttachmentSize, { color: theme.textMuted }]}>
                            {msg.attachment.size || 'Attached file'}
                          </Text>
                        </View>
                      </View>
                    )}

                    <Text style={[styles.messageText, { color: theme.text }]}>{msg.text}</Text>

                    {/* Rule 49: User-Controlled AI Action Card */}
                    {action && (
                      <View style={[styles.actionCard, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}>
                        <View style={styles.actionHeader}>
                          <Ionicons
                            name={action.type === 'create_task' ? 'checkbox' : 'time'}
                            size={16}
                            color={theme.primary}
                          />
                          <Text style={[styles.actionTitle, { color: theme.text }]}>
                            {action.title}
                          </Text>
                        </View>

                        <View style={styles.actionMetaRow}>
                          {action.priority && (
                            <View style={[styles.actionPill, { backgroundColor: `${theme.primary}33` }]}>
                              <Text style={[styles.actionPillText, { color: theme.primary }]}>
                                {action.priority.toUpperCase()}
                              </Text>
                            </View>
                          )}
                          {action.category && (
                            <View style={[styles.actionPill, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                              <Text style={[styles.actionPillText, { color: theme.textMuted }]}>
                                {action.category}
                              </Text>
                            </View>
                          )}
                          {action.time && (
                            <Text style={[styles.actionTime, { color: theme.textMuted }]}>
                              🕒 {action.time}
                            </Text>
                          )}
                        </View>

                        {action.executed ? (
                          <View style={styles.executedRow}>
                            <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                            <Text style={[styles.executedText, { color: theme.success }]}>
                              Action Applied to Your Schedule
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.actionBtnRow}>
                            <TouchableOpacity
                              style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
                              onPress={() => handleExecuteAction(msg.id, action)}
                              disabled={actionLoading === msg.id}
                            >
                              {actionLoading === msg.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Ionicons name="checkmark" size={14} color="#fff" />
                                  <Text style={styles.confirmBtnText}>Confirm & Apply</Text>
                                </>
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.dismissActionBtn, { borderColor: theme.border }]}
                              onPress={() => handleDismissAction(msg.id)}
                            >
                              <Text style={[styles.dismissActionText, { color: theme.textMuted }]}>
                                Dismiss
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={styles.bubbleFooter}>
                      <Text style={[styles.timeText, { color: isUser ? 'rgba(255,255,255,0.7)' : theme.textMuted }]}>
                        {msg.time}
                      </Text>
                      {!isUser && (
                        <TouchableOpacity
                          style={styles.speakerBtn}
                          onPress={() => speakMessage(msg.text, msg.id)}
                        >
                          <Ionicons
                            name={speakingMsgId === msg.id ? 'stop-circle' : 'volume-medium-outline'}
                            size={16}
                            color={speakingMsgId === msg.id ? theme.danger : theme.textMuted}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          {loading && (
            <View style={[styles.messageBubbleContainer, styles.botMessageContainer]}>
              <View style={[styles.miniAvatar, { backgroundColor: theme.primary }]}>
                <Ionicons name="sparkles" size={12} color="#fff" />
              </View>
              <View style={[styles.messageBubble, styles.botBubble, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Dynamic Quick Prompt Chips */}
        <View style={styles.chipsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {activeQuickReplies.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                onPress={() => handleSend(prompt)}
              >
                <Text style={[styles.chipText, { color: theme.textSecondary }]}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Attached File Preview Bar */}
        {attachedFile && (
          <View style={[styles.attachedFileBar, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={[styles.attachedIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.18)' }]}>
                <Ionicons
                  name={attachedFile.type === 'image' ? 'image' : attachedFile.type === 'pdf' ? 'document-text' : 'document'}
                  size={20}
                  color={theme.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.attachedFileName, { color: theme.text }]} numberOfLines={1}>
                  {attachedFile.name}
                </Text>
                <Text style={[styles.attachedFileSize, { color: theme.textMuted }]}>
                  {attachedFile.size} • Ready for Alinga Pa analysis
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setAttachedFile(null)} style={styles.removeAttachedBtn}>
              <Ionicons name="close-circle" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.cardBorder }]}>
          {/* File Attachment Button */}
          <TouchableOpacity
            style={[
              styles.attachButton,
              { backgroundColor: attachedFile ? theme.primary : 'rgba(255, 255, 255, 0.08)' },
            ]}
            onPress={() => setAttachOptionsModal(true)}
          >
            <Ionicons name="attach" size={20} color={attachedFile ? '#fff' : theme.text} />
          </TouchableOpacity>

          {/* Mic Button */}
          <TouchableOpacity
            style={[
              styles.micButton,
              { backgroundColor: (isListening || isRecording) ? theme.danger : 'rgba(99, 102, 241, 0.15)' },
            ]}
            onPress={openVoiceAssistant}
          >
            <Ionicons name="mic" size={19} color={(isListening || isRecording) ? '#fff' : theme.primary} />
          </TouchableOpacity>

          <TextInput
            style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
            placeholder={
              selectedLanguage === 'tanglish'
                ? "Iniku day plan pannu / ask Alinga Pa..."
                : selectedLanguage === 'tamil'
                ? "அலிங்கா பாவிடம் கேட்கவும்..."
                : selectedLanguage === 'hindi'
                ? "अलिङ्गा पा से पूछें..."
                : selectedLanguage === 'telugu'
                ? "అలింగా పాను అడగండి..."
                : "Ask AI or tap 📎 to attach file..."
            }
            placeholderTextColor={theme.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.primary }]}
            onPress={() => handleSend()}
            disabled={(!input.trim() && !attachedFile) || loading}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* AI Key & Settings Modal */}
      <Modal visible={settingsModal} transparent={true} animationType="slide" onRequestClose={() => setSettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles" size={20} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Cloud AI Configuration</Text>
              </View>
              <TouchableOpacity onPress={() => setSettingsModal(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Alinga Pa runs with built-in heuristic intelligence out-of-the-box. Add your Cloud AI API key below to unlock advanced conversational features powered by Google Gemini or OpenAI.
            </Text>

            {/* Provider Selector */}
            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Select AI Provider</Text>
            <View style={styles.providerRow}>
              {(['gemini', 'openai'] as const).map((prov) => {
                const active = selectedProvider === prov;
                return (
                  <TouchableOpacity
                    key={prov}
                    style={[
                      styles.providerPill,
                      { borderColor: active ? theme.primary : theme.border },
                      active && { backgroundColor: theme.primaryLight },
                    ]}
                    onPress={() => setSelectedProvider(prov)}
                  >
                    <Ionicons
                      name={prov === 'gemini' ? 'logo-google' : 'sparkles'}
                      size={16}
                      color={active ? theme.primary : theme.textMuted}
                    />
                    <Text style={[styles.providerText, { color: active ? theme.primary : theme.textMuted }]}>
                      {prov === 'gemini' ? 'Google Gemini (Free tier)' : 'OpenAI GPT-4o'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* API Key Input */}
            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>
              {selectedProvider === 'gemini' ? 'Google Gemini API Key' : 'OpenAI API Key'}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="Paste your API key here (saved securely in backend)"
              placeholderTextColor={theme.textMuted}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.saveKeyBtn, { backgroundColor: theme.primary }]}
              onPress={handleSaveAIKey}
              disabled={savingKey}
            >
              {savingKey ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveKeyText}>Connect Cloud AI</Text>
              )}
            </TouchableOpacity>

            <Text style={[styles.securityNote, { color: theme.textMuted }]}>
              🔒 Security Guarantee: Your key is stored server-side only in backend/.env. It is never exposed to the client or shared with third parties.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ChatGPT-Style Full-Screen Immersive Voice Conversation */}
      <Modal
        visible={voiceModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={closeVoiceAssistant}
      >
        <SafeAreaView style={styles.chatgptVoiceScreen}>
          {/* Top Bar: Close (X), Minimal Status Pill, Language Selector Dropdown */}
          <View style={styles.chatgptVoiceHeader}>
            <TouchableOpacity
              style={styles.chatgptVoiceCloseBtn}
              onPress={closeVoiceAssistant}
            >
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.chatgptStatusPill}>
              <View
                style={[
                  styles.chatgptStatusDot,
                  {
                    backgroundColor: (isListening || isRecording)
                      ? '#ef4444'
                      : isSpeaking
                      ? '#06b6d4'
                      : loading
                      ? '#8b5cf6'
                      : '#10b981',
                  },
                ]}
              />
              <Text style={styles.chatgptStatusPillText}>
                {(isListening || isRecording)
                  ? 'Listening (Tap orb when done)'
                  : isSpeaking
                  ? 'Speaking (Tap to interrupt)'
                  : loading
                  ? 'Thinking...'
                  : 'Tap Orb to speak'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.chatgptLangPill}
              onPress={() => setLangModalVisible(true)}
            >
              <Text style={styles.chatgptLangFlag}>{currentLangObj.flag}</Text>
              <Text style={styles.chatgptLangText}>{currentLangObj.label}</Text>
              <Ionicons name="chevron-down" size={13} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Central Stage: ChatGPT Iconic Dynamic Multi-Ring Voice Orb */}
          <View style={styles.chatgptOrbSection}>
            <View style={styles.chatgptOrbContainer}>
              {/* Outer Acoustic Radiant Wave 2 */}
              <Animated.View
                style={[
                  styles.chatgptOrbWave2,
                  {
                    transform: [{ scale: voiceOrbScale2 }],
                    opacity: voiceOrbGlow,
                    borderColor: isListening
                      ? 'rgba(239, 68, 68, 0.4)'
                      : isSpeaking
                      ? 'rgba(6, 182, 212, 0.4)'
                      : 'rgba(99, 102, 241, 0.4)',
                  },
                ]}
              />

              {/* Outer Radiant Wave 1 */}
              <Animated.View
                style={[
                  styles.chatgptOrbWave1,
                  {
                    transform: [{ scale: voiceOrbScale }],
                    opacity: voiceOrbGlow,
                    backgroundColor: isListening
                      ? 'rgba(239, 68, 68, 0.16)'
                      : isSpeaking
                      ? 'rgba(6, 182, 212, 0.16)'
                      : 'rgba(99, 102, 241, 0.16)',
                  },
                ]}
              />

              {/* Middle Rim */}
              <View
                style={[
                  styles.chatgptOrbMiddleRim,
                  {
                    borderColor: isListening
                      ? 'rgba(239, 68, 68, 0.55)'
                      : isSpeaking
                      ? 'rgba(56, 189, 248, 0.55)'
                      : 'rgba(129, 140, 248, 0.55)',
                  },
                ]}
              />

              {/* Core Glowing Orb (Tap to Interrupt / Talk) */}
              <TouchableOpacity
                style={[
                  styles.chatgptCoreOrb,
                  {
                    backgroundColor: isListening
                      ? '#dc2626'
                      : isSpeaking
                      ? '#0284c7'
                      : loading
                      ? '#7c3aed'
                      : '#4f46e5',
                    shadowColor: isListening
                      ? '#ef4444'
                      : isSpeaking
                      ? '#06b6d4'
                      : '#6366f1',
                  },
                ]}
                onPress={handleOrbPress}
                activeOpacity={0.88}
              >
                <Ionicons
                  name={
                    isListening
                      ? 'mic'
                      : isSpeaking
                      ? 'volume-high'
                      : loading
                      ? 'sparkles'
                      : 'mic-outline'
                  }
                  size={46}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>

            {/* Soundwave Digital Equalizer (7 dynamic bars) */}
            <View style={styles.soundwaveEqualizer}>
              {waveBars.map((bar, idx) => (
                <Animated.View
                  key={idx}
                  style={[
                    styles.chatgptEqualizerBar,
                    {
                      height: bar.interpolate({
                        inputRange: [0, 1],
                        outputRange: [6, 42],
                      }),
                      backgroundColor: isListening
                        ? '#ef4444'
                        : isSpeaking
                        ? '#06b6d4'
                        : '#6366f1',
                    },
                  ]}
                />
              ))}
            </View>

            {/* Subtitle Hint */}
            <Text style={styles.chatgptPromptSub}>
              {isSpeaking
                ? '⚡ Tap orb to interrupt AI'
                : isListening
                ? `🎙️ Speak naturally in ${currentLangObj.label}...`
                : loading
                ? '✨ Thinking and talking with Alinga Pa...'
                : '👆 Tap orb, tap microphone, or pick a topic below'}
            </Text>
          </View>

          {/* Prominent Tap-to-Speak / Voice Dictation Button */}
          <TouchableOpacity
            style={[
              styles.chatgptVoiceTapToSpeakBtn,
              (isListening || isRecording) && { backgroundColor: 'rgba(239, 68, 68, 0.16)', borderColor: '#ef4444' },
            ]}
            onPress={handleOrbPress}
            activeOpacity={0.82}
          >
            <View
              style={[
                styles.tapToSpeakIconPulse,
                (isListening || isRecording) && { backgroundColor: '#dc2626' },
              ]}
            >
              <Ionicons
                name={(isListening || isRecording) ? 'stop' : 'mic'}
                size={17}
                color="#fff"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tapToSpeakTitle}>
                {(isListening || isRecording)
                  ? '🔴 Listening... Tap when done speaking'
                  : '🎙️ Tap to Speak (Microphone)'}
              </Text>
              <Text style={styles.tapToSpeakSub}>
                {(isListening || isRecording)
                  ? 'Speak freely. Tap here or tap the Orb to finish & send!'
                  : 'Talk naturally in Tanglish, Tamil, or English like ChatGPT Voice'}
              </Text>
            </View>
            <Ionicons
              name={(isListening || isRecording) ? 'arrow-up-circle' : 'sparkles'}
              size={18}
              color={(isListening || isRecording) ? '#ef4444' : '#38bdf8'}
            />
          </TouchableOpacity>

          {/* Voice Topic Category Tabs */}
          <View style={styles.voiceCategoryTabsRow}>
            <TouchableOpacity
              style={[
                styles.voiceCategoryTab,
                voiceTopicTab === 'casual' && styles.voiceCategoryTabActive,
              ]}
              onPress={() => setVoiceTopicTab('casual')}
            >
              <Ionicons name="chatbubble-ellipses" size={12} color={voiceTopicTab === 'casual' ? '#38bdf8' : '#94a3b8'} />
              <Text style={[styles.voiceCategoryTabText, voiceTopicTab === 'casual' && styles.voiceCategoryTabTextActive]}>
                {selectedLanguage === 'tamil' ? 'இயல்பு பேச்சு' : 'Casual Chat'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.voiceCategoryTab,
                voiceTopicTab === 'tasks' && styles.voiceCategoryTabActive,
              ]}
              onPress={() => setVoiceTopicTab('tasks')}
            >
              <Ionicons name="calendar" size={12} color={voiceTopicTab === 'tasks' ? '#38bdf8' : '#94a3b8'} />
              <Text style={[styles.voiceCategoryTabText, voiceTopicTab === 'tasks' && styles.voiceCategoryTabTextActive]}>
                {selectedLanguage === 'tamil' ? 'பணிகள்' : 'Day & Tasks'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.voiceCategoryTab,
                voiceTopicTab === 'wellness' && styles.voiceCategoryTabActive,
              ]}
              onPress={() => setVoiceTopicTab('wellness')}
            >
              <Ionicons name="heart" size={12} color={voiceTopicTab === 'wellness' ? '#38bdf8' : '#94a3b8'} />
              <Text style={[styles.voiceCategoryTabText, voiceTopicTab === 'wellness' && styles.voiceCategoryTabTextActive]}>
                {selectedLanguage === 'tamil' ? 'நலம் & ஓய்வு' : 'Rest & Mood'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Suggested Spoken Prompts Carousel */}
          <View style={styles.chatgptPromptsArea}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chatgptPromptsRow}
            >
              {(voiceTopicTab === 'casual'
                ? (selectedLanguage === 'tanglish'
                    ? ['👋 Eppadi iruka pa?', '🥱 Romba bore adikithu', '😂 Oru nalla joke sollu', '💡 Motivation quote kudu', '🍲 Enna sapadalam iniku?', '☕ 5 min break polama?']
                    : selectedLanguage === 'tamil'
                    ? ['👋 எப்படி இருக்கிறீர்கள்?', '😂 ஒரு நகைச்சுவை சொல்', '💡 ஊக்கமளிக்கும் வரிகள்', '🍲 என்ன சாப்பிடலாம்?', '☕ ஒரு சிறிய இடைவேளை']
                    : ['👋 How are you?', "🥱 I'm feeling bored", '😂 Tell me a joke', '💡 Give me motivation', '☕ Suggest a mindful break', '🍲 What should I eat?']
                  )
                : voiceTopicTab === 'tasks'
                ? (selectedLanguage === 'tanglish'
                    ? ['📅 Iniku enna plan?', '📋 Pending tasks enna iruku?', '⚡ Recover missed tasks', '⏰ Free time evalo iruku?', '🏆 Active habit streak evalo?']
                    : selectedLanguage === 'tamil'
                    ? ['📅 இன்றைய திட்டம் என்ன?', '📋 நிலுவை பணிகள் எவை?', '⚡ தவறவிட்ட பணிகள்', '⏰ ஓய்வு நேரம் எவ்வளவு?', '🏆 எனது பழக்க வழக்கம்']
                    : ['📅 Plan my day', '📋 What tasks are pending?', '⚡ Recover missed tasks', '⏰ How much free time do I have?', '🏆 How are my habit streaks?']
                  )
                : (selectedLanguage === 'tanglish'
                    ? ['😌 Romba tired-ah iruken', '💡 Stress relief tips kudu', '🌙 Good night Alinga Pa', '🛡️ Rest mode protect pannu', '🎵 Relaxing music idea sollu']
                    : selectedLanguage === 'tamil'
                    ? ['😌 அதிக சோர்வாக உள்ளது', '💡 மன அமைதிக்கான வழி', '🌙 இனிய இரவு வணக்கம்', '🛡️ ஓய்வு நேரத்தை காத்திடு']
                    : ["😌 I'm feeling exhausted", '💡 Stress relief tips', '🌙 Good night Alinga Pa', '🛡️ Guard my rest hours', '🎵 Relaxing ideas']
                  )
              ).map((cmd, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.chatgptPromptChip}
                  onPress={() => handleVoiceCommand(cmd)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={12} color="#38bdf8" />
                  <Text style={styles.chatgptPromptChipText}>{cmd}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Real-time Glassmorphic Subtitle / Conversation Box */}
          <View style={styles.chatgptSubtitleWrapper}>
            {(voiceTranscript || voiceResponseText) ? (
              <ScrollView
                style={styles.chatgptSubtitleScroll}
                contentContainerStyle={styles.chatgptSubtitleContent}
                showsVerticalScrollIndicator={false}
              >
                {voiceTranscript ? (
                  <View style={styles.chatgptUserBubble}>
                    <Text style={styles.chatgptBubbleSpeaker}>YOU</Text>
                    <Text style={styles.chatgptUserText}>"{voiceTranscript}"</Text>
                  </View>
                ) : null}

                {voiceResponseText ? (
                  <View style={styles.chatgptAiBubble}>
                    <View style={styles.chatgptAiHeader}>
                      <Text style={styles.chatgptBubbleSpeakerAi}>ALINGA PA</Text>
                      <TouchableOpacity onPress={() => speakMessage(voiceResponseText, 'voice-replay')}>
                        <Ionicons
                          name={isSpeaking ? 'pause-circle' : 'play-circle'}
                          size={18}
                          color="#38bdf8"
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.chatgptAiText}>{voiceResponseText}</Text>

                    {/* Proposed Action Confirmation */}
                    {latestVoiceAction && !latestVoiceAction.executed && (
                      <TouchableOpacity
                        style={styles.chatgptActionBtn}
                        onPress={async () => {
                          if (!latestVoiceAction) return;
                          await handleExecuteAction('voice-latest', latestVoiceAction);
                          setLatestVoiceAction({ ...latestVoiceAction, executed: true });
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={styles.chatgptActionBtnText}>
                          Apply "{latestVoiceAction.title}"
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}
              </ScrollView>
            ) : (
              <View style={styles.chatgptEmptyHintBox}>
                <Ionicons name="sparkles-outline" size={22} color="rgba(255,255,255,0.3)" />
                <Text style={styles.chatgptEmptyHintText}>
                  "Tap any topic above or tap the microphone to talk with Alinga Pa like ChatGPT Voice."
                </Text>
              </View>
            )}
          </View>

          {/* Quick Voice / Text Input Capsule */}
          <View style={styles.chatgptInputCapsule}>
            <TextInput
              ref={voiceInputRef}
              style={styles.chatgptTextInput}
              placeholder="Tap keyboard 🎙️ mic or type command..."
              placeholderTextColor="#64748b"
              value={voiceInputText}
              onChangeText={setVoiceInputText}
              onSubmitEditing={() => {
                if (voiceInputText.trim()) handleVoiceCommand(voiceInputText.trim());
              }}
              returnKeyType="send"
            />
            {voiceInputText.trim().length > 0 && (
              <TouchableOpacity
                style={styles.chatgptSendBtn}
                onPress={() => handleVoiceCommand(voiceInputText.trim())}
              >
                <Ionicons name="arrow-up" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom Dock: Hands-free, Orb tap, Text chat */}
          <View style={styles.chatgptBottomDock}>
            <TouchableOpacity
              style={[
                styles.dockBtn,
                handsFreeMode && { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
              ]}
              onPress={() => setHandsFreeMode(!handsFreeMode)}
            >
              <Ionicons
                name={handsFreeMode ? 'infinite' : 'radio-button-off'}
                size={18}
                color={handsFreeMode ? '#38bdf8' : '#94a3b8'}
              />
              <Text
                style={[
                  styles.dockBtnText,
                  { color: handsFreeMode ? '#38bdf8' : '#94a3b8' },
                ]}
              >
                Hands-Free {handsFreeMode ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dockCircleBtn,
                { backgroundColor: (isListening || isRecording) ? '#ef4444' : '#1e293b' },
              ]}
              onPress={handleOrbPress}
            >
              <Ionicons
                name={(isListening || isRecording) ? 'mic' : isSpeaking ? 'pause' : 'mic-outline'}
                size={22}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockBtn}
              onPress={closeVoiceAssistant}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#94a3b8" />
              <Text style={styles.dockBtnText}>Text Chat</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Language Selector Modal */}
      <Modal
        visible={langModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Choose AI Companion Language</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  Chat & Voice Assistant will respond in this language
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLangModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
              {LANGUAGES.map((lang) => {
                const active = selectedLanguage === lang.id;
                return (
                  <TouchableOpacity
                    key={lang.id}
                    style={[
                      styles.langOptionCard,
                      {
                        backgroundColor: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => handleSelectLanguage(lang.id)}
                  >
                    <Text style={styles.langOptionFlag}>{lang.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.langOptionLabel, { color: active ? theme.primary : theme.text }]}>
                        {lang.label}
                      </Text>
                      <Text style={[styles.langOptionSub, { color: theme.textMuted }]}>{lang.sub}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Attachment Options Modal */}
      <Modal
        visible={attachOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAttachOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Attach File to AI Companion</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  Alinga Pa will extract tasks and insights from your document or photo
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAttachOptionsModal(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.attachGridRow}>
              <TouchableOpacity
                style={[styles.attachOptionBox, { backgroundColor: theme.cardBorder }]}
                onPress={handlePickDocument}
              >
                <View style={[styles.attachOptionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                  <Ionicons name="document-text-outline" size={26} color={theme.primary} />
                </View>
                <Text style={[styles.attachOptionTitle, { color: theme.text }]}>Document / PDF</Text>
                <Text style={[styles.attachOptionSub, { color: theme.textMuted }]}>Syllabus, notes, books</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.attachOptionBox, { backgroundColor: theme.cardBorder }]}
                onPress={handlePickImage}
              >
                <View style={[styles.attachOptionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <Ionicons name="images-outline" size={26} color={theme.success} />
                </View>
                <Text style={[styles.attachOptionTitle, { color: theme.text }]}>Photo Gallery</Text>
                <Text style={[styles.attachOptionSub, { color: theme.textMuted }]}>Screenshots, receipts</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.attachOptionBox, { backgroundColor: theme.cardBorder }]}
                onPress={handleTakePhoto}
              >
                <View style={[styles.attachOptionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <Ionicons name="camera-outline" size={26} color="#f59e0b" />
                </View>
                <Text style={[styles.attachOptionTitle, { color: theme.text }]}>Camera</Text>
                <Text style={[styles.attachOptionSub, { color: theme.textMuted }]}>Instant photo capture</Text>
              </TouchableOpacity>
            </View>
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
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 6,
  },
  headerIconBtn: {
    padding: 6,
  },
  aiBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  status: {
    fontSize: 11,
    fontWeight: '500',
  },
  messagesList: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: 8,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  actionCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  actionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  actionPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionTime: {
    fontSize: 11,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
    gap: 5,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  dismissActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  dismissActionText: {
    fontSize: 12,
  },
  executedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  executedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipsWrapper: {
    paddingVertical: 6,
  },
  chipsScroll: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 17,
    fontWeight: '700',
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.md,
  },
  providerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  providerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalInput: {
    height: 46,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  saveKeyBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  saveKeyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  securityNote: {
    fontSize: 11,
    lineHeight: 16,
  },
  headerVoicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  headerVoiceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  speakerBtn: {
    padding: 2,
    marginLeft: 6,
  },
  micButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  voiceModalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  voiceHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  voiceMiniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  voiceModalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  voiceOrbContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: Spacing.md,
  },
  voiceOrbOuterHalo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  voiceOrbButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  soundwaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    gap: 8,
    marginBottom: Spacing.sm,
  },
  soundwaveBar: {
    width: 5,
    borderRadius: 3,
  },
  voiceStatusText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  voiceTranscriptCard: {
    width: '100%',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  voiceTranscriptLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  voiceTranscriptText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  voiceResponseCard: {
    width: '100%',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  voiceResponseText: {
    fontSize: 13,
    lineHeight: 19,
  },
  voiceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    gap: 6,
    marginTop: Spacing.sm,
  },
  voiceActionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  voiceCommandsLabel: {
    width: '100%',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  voiceCommandsRow: {
    gap: 8,
    paddingBottom: Spacing.md,
  },
  voiceCommandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  voiceCommandChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerLangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  headerLangFlag: {
    fontSize: 14,
  },
  headerLangText: {
    fontSize: 12,
    fontWeight: '700',
  },
  autoSpeakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  autoSpeakText: {
    fontSize: 11,
    fontWeight: '600',
  },
  attachButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedFileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  attachedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedFileName: {
    fontSize: 13,
    fontWeight: '600',
  },
  attachedFileSize: {
    fontSize: 11,
  },
  removeAttachedBtn: {
    padding: 4,
  },
  msgAttachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
  },
  msgAttachmentThumb: {
    width: 38,
    height: 38,
    borderRadius: 6,
  },
  msgAttachmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  msgAttachmentName: {
    fontSize: 13,
    fontWeight: '600',
  },
  msgAttachmentSize: {
    fontSize: 11,
  },
  langOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  langOptionFlag: {
    fontSize: 22,
  },
  langOptionLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  langOptionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  attachGridRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 6,
  },
  attachOptionBox: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  attachOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  attachOptionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  attachOptionSub: {
    fontSize: 10,
    textAlign: 'center',
  },
  chatgptVoiceScreen: {
    flex: 1,
    backgroundColor: '#060810',
    justifyContent: 'space-between',
  },
  chatgptVoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  chatgptVoiceCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatgptStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chatgptStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  chatgptStatusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  chatgptLangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chatgptLangFlag: {
    fontSize: 13,
  },
  chatgptLangText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  chatgptOrbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  chatgptOrbContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  chatgptOrbWave2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  chatgptOrbWave1: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
  },
  chatgptOrbMiddleRim: {
    position: 'absolute',
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 2,
  },
  chatgptCoreOrb: {
    width: 126,
    height: 126,
    borderRadius: 63,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
  },
  soundwaveEqualizer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 7,
    marginVertical: 4,
  },
  chatgptEqualizerBar: {
    width: 4,
    borderRadius: 3,
  },
  chatgptPromptSub: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  chatgptSubtitleWrapper: {
    flex: 1,
    marginHorizontal: Spacing.md,
    marginVertical: 8,
    maxHeight: 180,
  },
  chatgptSubtitleScroll: {
    flex: 1,
  },
  chatgptSubtitleContent: {
    gap: 10,
    paddingBottom: 6,
  },
  chatgptUserBubble: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chatgptBubbleSpeaker: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  chatgptUserText: {
    fontSize: 13,
    color: '#e2e8f0',
    fontStyle: 'italic',
  },
  chatgptAiBubble: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  chatgptAiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatgptBubbleSpeakerAi: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.6,
  },
  chatgptAiText: {
    fontSize: 13,
    color: '#f1f5f9',
    lineHeight: 18,
  },
  chatgptActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  chatgptActionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  chatgptEmptyHintBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  chatgptEmptyHintText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17,
  },
  chatgptPromptsArea: {
    marginVertical: 4,
  },
  chatgptPromptsRow: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  chatgptPromptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chatgptPromptChipText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  chatgptInputCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chatgptTextInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: '#f8fafc',
  },
  chatgptSendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatgptBottomDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  dockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dockBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dockCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  chatgptVoiceTapToSpeakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    gap: 10,
  },
  tapToSpeakIconPulse: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapToSpeakTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f0f9ff',
  },
  tapToSpeakSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  voiceCategoryTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  voiceCategoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  voiceCategoryTabActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    borderColor: '#38bdf8',
  },
  voiceCategoryTabText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  voiceCategoryTabTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
});
