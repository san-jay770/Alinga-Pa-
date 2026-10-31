# ALINGA PA — Mobile Application
> **Tagline:** *Your Life, Our Care.*  
> An intelligent, modern, AI-powered personal life companion mobile application designed to manage daily life, routines, schedules, habits, wellness, and decisions.

---

## 📱 Mobile-First Architecture

Alinga Pa is engineered from the ground up as a native mobile experience using **React Native + Expo** paired with a high-performance **FastAPI** backend and **SQLite** database.

```
Alinga pa/
├── backend/                  # FastAPI Python REST API & SQLite Database
│   ├── app/
│   │   ├── api/routes/       # Auth, Tasks, AI, Events, Habits, Finance, etc.
│   │   ├── core/             # Security, JWT, Configuration
│   │   ├── database/         # Models & Database Session
│   │   └── services/         # AI Decision Engine, Heuristics, Scheduler
│   ├── alinga_pa.db          # Local SQLite Database (PostgreSQL migration ready)
│   └── requirements.txt      # Python dependencies
│
├── mobile/                   # Expo React Native Mobile Application
│   ├── app/
│   │   ├── (auth)/           # Mobile Login, Register, Forgot Password
│   │   ├── (tabs)/           # 5-Tab Navigation (Home, Planner, AI, Insights, Profile)
│   │   └── _layout.tsx       # Root layout & authentication guard
│   ├── constants/            # Theme, Colors, Typography, Spacing
│   ├── context/              # AuthContext (JWT, session persistence, user state)
│   ├── services/             # Mobile API client with LAN IP fallback
│   ├── package.json          # Mobile dependencies (lightweight, low-RAM optimized)
│   └── app.json              # Expo configuration (Scheme: alingapa)
│
├── start-all-mobile.bat      # 1-Click launcher: Backend + Expo Metro for Phone
├── start-backend.bat         # Launch FastAPI server (0.0.0.0:8000)
├── start-mobile.bat          # Launch Expo Metro Bundler (LAN mode)
└── README.md                 # Complete documentation
```

---

## 🚀 Quick Start Guide (Testing on Physical Android Phone)

This project is tailored for lightweight development (4 GB RAM laptop). **No Android Studio Emulator is needed.** Everything runs smoothly on your physical Android phone using **Expo Go**.

### Step 1: Install Expo Go on Your Android Phone
1. Open Google Play Store on your phone.
2. Search for and install **Expo Go**.

### Step 2: Ensure Phone & Laptop Are on the Same Wi-Fi
- Both your laptop and your phone must be connected to the same Wi-Fi network (or laptop hotspot).
- Your computer's current LAN IP is configured as `10.173.151.37`.

### Step 3: Launch Alinga Pa with 1 Click
Double-click `start-all-mobile.bat` in the project root:
1. **Window 1 (Backend):** Starts FastAPI server at `http://0.0.0.0:8000`.
2. **Window 2 (Mobile):** Starts the Expo Metro Bundler and displays a **QR code**.

### Step 4: Scan and Test on Phone
1. Open the **Expo Go** app on your Android phone.
2. Tap **Scan QR code**.
3. Scan the QR code displayed in your terminal.
4. The Alinga Pa mobile application will bundle in seconds and launch directly on your phone!

---

## 🛠 Manual Command Line Startup

If you prefer using the terminal:

### Start Backend
```powershell
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Documentation (Swagger): `http://localhost:8000/docs`

### Start Mobile App
```powershell
cd mobile
npx expo start --lan
```
- Press `a` to open Android, or scan QR code in Expo Go.

---

## 🌐 Connecting from Different Wi-Fi Networks

If your laptop's Wi-Fi IP address changes:
1. Open PowerShell and run: `ipconfig` to find your new IPv4 address (e.g. `192.168.1.50`).
2. Update `EXPO_PUBLIC_API_URL` in `mobile/.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_NEW_IP:8000
   ```
3. Restart `start-mobile.bat`.

---

## 🗺 10-Phase Development Roadmap

- [x] **Phase 0: Environment Diagnostics & Resource Audit** *(Complete)*
- [x] **Phase 1: Expo Mobile Foundation & FastAPI Setup** *(Complete)*
  - Expo Router 5-tab mobile navigation: Home, Planner, AI Assistant, Insights, Profile.
  - Dark & Light theme system, typed API client, SQLite database with 15 models.
  - Complete Auth screens (Login, Register, Forgot Password).
  - Type-checked (`tsc --noEmit` clean: 0 errors).
- [x] **Phase 2: Authentication, User Profile, Home Dashboard & Task Management** *(Complete)*
  - Native 3-slide Onboarding flow with skip and get started buttons.
  - Full mobile registration & login with password visibility toggle and social logins.
  - Interactive Home Dashboard with real-time task completion checkboxes and pending badges.
  - Dedicated Task Management screen (`/tasks`) with search, status filters, category pills, priority badges, and CRUD modal.
  - User profile with avatar customization, quiet hours, data export, and cache clear controls.
- [x] **Phase 3: Daily Planner, Calendar, Reminders & Notifications** *(Complete)*
  - Daily Life Planner timeline with 7-day date strip and AI auto-schedule generator.
  - Automatic Free-Time Finder (`/api/events/free-slots`) for deep work block discovery.
  - Dedicated Calendar screen (`/calendar`) with date carousel, event categories, and conflict detector.
  - Schedule Conflict & Collision Detector (`/api/events/conflicts`) with warning alerts.
  - Smart Notifications screen (`/notifications`) with bundling, 1-tap dismiss, 30m snooze, and preferences modal.
  - Notification Bell in Home Dashboard with real-time pending badge count.
- [x] **Phase 4: Cloud AI API Integration & AI Assistant Engine** *(Complete)*
  - Conversational AI Companion interface (`app/(tabs)/ai.tsx`) with natural-language message handling.
  - Natural-language task creation from conversation (e.g. *"Remind me to complete my assignment tomorrow"*).
  - Rule 49 User-Controlled AI Action Cards: AI proposes tasks/events/rescheduling; actions execute ONLY upon explicit user tap on **[Confirm & Apply]**.
  - Contextual awareness: queries pending tasks, schedules, overdue deadlines, and free focus time using real database data.
  - Missed task recovery engine: detects overdue tasks and offers safe reschedule slots without schedule overload.
  - Cloud AI integration for Google Gemini and OpenAI with in-app API key configuration modal & automatic heuristic fallback.
  - Plan Confidence Score calculation (`/api/ai/plan-confidence`).
- [x] **Phase 5: Goals, Habits, Personal Memory & Weekly Insights** *(Complete)*
  - Comprehensive Growth & Insights Hub (`app/(tabs)/insights.tsx`) with 4-way segmented tabs: Insights, Goals, Habits, Memory.
  - Weekly Life Balance Score (0-100) with AI companion motivational notes & advice.
  - Long-Term Goals manager with progress trackers, milestone checklists, and **[Generate Milestones with AI]** auto-breakdown engine.
  - Habit Tracker with daily check-offs, unbroken streak fire counter, custom icons/colors, and flexible mini-version fallback descriptions.
  - Personal Memory Vault: persistent AI memory bank (preferences, health, diet, work rules, family) stored in database and injected directly into conversational chats and ChatGPT voice planning.
- [x] **Phase 6: Finance Manager, Document Vault & Life Events** *(Complete)*
  - Dedicated Personal Finance Manager (`app/finance.tsx`) with monthly spend breakdown, pending bills due, recurring subscriptions, and 1-tap "Mark Paid" button.
  - Daily Expenses logger with category badges (food, transport, shopping, utilities, health) and AI financial care tips.
  - Secure Document Vault (`app/vault.tsx`) with DocumentPicker/ImagePicker upload, category sorting (ID, medical, finance, vehicle, legal), and renewal/expiry warning banners (e.g. passport or insurance expiring in 45 days).
  - Life Milestones & Anniversaries manager with live countdown timers ("Today!", "Tomorrow", "In 13 days") and automatic companion reminders.
  - Life Hub quick launcher row added to Home Dashboard and Profile screen.
- [x] **Phase 7: Advanced Planning & Smart Heuristic Automation** *(Complete)*
  - 1-Tap Energy-Aware Day Auto-Planner (`/api/ai/auto-plan-day`): Maps peak morning energy to deep work tasks, post-lunch slots to lighter admin/reviews, and inserts mandatory mindful lunch/breaks.
  - Missed Task Recovery Engine (`/api/ai/recover-missed-tasks` & `/api/ai/apply-recovery`): Detects overdue commitments and automatically slots them into available daytime focus windows over the next 48 hours with 15-minute rest buffers without cognitive overload.
  - Integrated Focus Pomodoro Timer Modal (`/api/focus/`): 15m/25m/45m/50m duration presets, digital countdown timer, play/pause/reset, early completion, and automatic weekly focus stats tracking.
  - Daily Life Planner UI (`mobile/app/(tabs)/planner.tsx`) upgraded with recovery banner, energy flow insight cards, and direct 1-tap "Focus" trigger buttons on scheduled tasks.
- [x] **Phase 8: Privacy Controls, Cross-Device Continuity & Security** *(Complete)*
  - GDPR Data Ownership & Complete Export Engine (`/api/privacy/export`): Single-tap download of entire user data bundle (tasks, events, goals, habits, memories, finance, documents, focus history) in encrypted JSON format.
  - Security & Transparency Audit Dashboard (`/api/privacy/security-audit`): Live audit metrics on mobile, private record counter, AES-256 local encryption rating, and zero third-party monetization policy.
  - AI Privacy Knowledge Sharing Toggle (`/api/privacy/toggle-ai-sharing`): One-switch mode enabling users to keep personal memories strictly on local heuristic processing or share with Google Gemini / OpenAI.
  - Cross-Device Continuity & Session Manager (`/api/privacy/devices` & `/api/privacy/revoke-other-devices`): Multi-device registration, device presence tracking, and 1-tap "Sign Out All Other Devices".
  - Account Security & GDPR Deletion (`/api/privacy/change-password` & `/api/privacy/delete-account`): In-app credential rotation and confirmed permanent account purge with cascading cleanup.
  - Biometric & PIN App Lock toggle persisted locally in AsyncStorage.
  - Real-time Cloud Continuity Status bar with manual 1-tap "Sync Now" button in `mobile/app/(tabs)/profile.tsx`.
- [x] **Phase 9: Comprehensive Mobile Testing & Optimization** *(Complete)*
  - Full E2E Automated System Audit (`scratch/test_phase9_comprehensive.py`): 36 out of 36 integration modules passed (100.0% clean score).
  - Validated all 12 core application pillars: Auth, Task Management, Calendar & Conflicts, Smart Notifications, Conversational Tanglish AI, Long-term Goals & AI Milestones, Habit Consistency & Mini-Habits, Finance Manager, Vault & Life Events, Energy-Aware Heuristic Day Planner, Focus Pomodoro Companion, and GDPR Privacy & Security.
  - Edge-case hardening in `mobile/services/api.ts`: Automatic 401 unauthenticated session reset, token expiry recovery, and resilient network error boundaries.
  - Production configuration in `mobile/app.json`: Added `package: "com.alingapa.app"`, required Android device permissions (Camera, External Storage), and portrait lock.
  - Strict TypeScript verification (`npx tsc --noEmit`): 0 compilation errors across all mobile components.
- [x] **Phase 10: Standalone Android APK Build (EAS Build / Release Guide)** *(Complete)*
  - Configured EAS Build profile (`mobile/eas.json`) with `preview` profile for direct `.apk` installation on any physical Android smartphone.
  - Production package metadata in `mobile/app.json`: `package: "com.alingapa.app"`, native assets (`assets/icon.png`, `assets/splash-icon.png`), and dark theme splash screen.
  - Automated 1-Click Builder script created in project root: `build-android-apk.bat`.
  - Comprehensive Step-by-Step Standalone APK & Production Guide: `mobile/BUILD_GUIDE.md` covering cloud build, sideload installation, unknown sources allowance, and Google Play Console `.aab` generation.
  - Zero-RAM footprint: Offloads compilation to Expo Application Services cloud infrastructure without requiring Android Studio or local emulators.

---

## 🏆 Project Completion Status: 10 of 10 Phases Complete (100%)

Alinga Pa is now completely built, verified, type-checked, and packaged for both interactive Expo Go development and standalone `.apk` distribution!
