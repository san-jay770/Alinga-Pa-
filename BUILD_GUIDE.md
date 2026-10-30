# 📱 ALINGA PA — Standalone Android APK Build & Release Guide
> **Tagline:** *Your Life, Our Care.*  
> **Phase 10:** Standalone Android Build & Deployment Manual

---

## 🌟 Overview: Standalone APK vs. Expo Go

Throughout Phases 1 to 9, Alinga Pa was tested interactively on your physical Android phone using the **Expo Go** sandbox client.

In **Phase 10**, Alinga Pa is converted into a **100% independent native Android application (`.apk`)**:
- ✅ **Independent Native App:** Installs directly on any Android smartphone without needing Expo Go.
- ✅ **Custom Launcher Branding:** Branded with Alinga Pa's native logo icon (`assets/icon.png`) and dark splash screen (`#070b14`).
- ✅ **Zero-RAM Cloud Compilation:** Built using Expo Application Services (EAS) cloud infrastructure so your 4 GB RAM laptop never slows down or overheats.
- ✅ **Shareable Anywhere:** Distribute the `.apk` via WhatsApp, Google Drive, email, or direct USB transfer to friends, family, and testers.

---

## 🛠 Prerequisites

1. **Free Expo Account:**
   - If you don't already have one, create a free account at [https://expo.dev/signup](https://expo.dev/signup).
2. **Backend Server Endpoint:**
   - For local testing on your home Wi-Fi: ensure `mobile/.env` has your laptop's current LAN IP (e.g. `EXPO_PUBLIC_API_URL=http://10.173.151.37:8000`).
   - For 24/7 internet access: deploy your FastAPI backend to Render / Railway / AWS and set your public domain URL (e.g. `EXPO_PUBLIC_API_URL=https://api.yourdomain.com`).

---

## 🚀 Step-by-Step APK Generation

### Option 1: 1-Click Batch Builder (Easiest)
1. In the project root folder (`Alinga pa`), double-click **`build-android-apk.bat`**.
2. If prompted, log into your Expo account.
3. The script will automatically trigger the EAS cloud build using the `preview` profile.

---

### Option 2: Command Line (PowerShell / Terminal)

Open PowerShell and run:

```powershell
cd mobile

# 1. Log in to Expo (one-time step)
npx eas-cli login

# 2. Configure EAS project if prompted
npx eas-cli project:init

# 3. Start Cloud APK Build
npx eas-cli build --platform android --profile preview
```

When asked:
* **"Generate a new Android Keystore?"** ➔ Select **`Yes`** (Expo securely manages the signing certificate for you).

---

## 📥 Downloading & Installing on Android Phone

1. Once the build finishes on Expo servers (usually 4 to 8 minutes), EAS will display a **Download URL** and a **QR Code** in your terminal.
2. **Scan the QR Code** or open the download URL in your Android phone's browser (Chrome).
3. Tap **Download APK** (file name: `Alinga_Pa.apk`).
4. Once downloaded, tap on the file to install.
5. If Android shows a security prompt (*"For your security, your phone is not allowed to install unknown apps from this source"*):
   - Tap **Settings**.
   - Toggle **Allow from this source** to ON.
   - Tap **Install**.
6. **Open Alinga Pa!** The app will launch with the splash screen and guide you through onboarding and login!

---

## 🌐 Production Cloud Backend Hosting (Optional for 24/7 Access)

If you want the APK to work when your phone is outside your home Wi-Fi:

1. **Deploy FastAPI Backend to Railway / Render:**
   - Both Railway ([railway.app](https://railway.app)) and Render ([render.com](https://render.com)) have free tiers.
   - Connect your repository or upload `backend/`.
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
2. **Update Mobile Environment:**
   - In `mobile/.env`:
     ```env
     EXPO_PUBLIC_API_URL=https://your-production-app.up.railway.app
     ```
3. Re-run `build-android-apk.bat` to create an internet-connected production APK!

---

## 📦 Google Play Store Release (`.aab` App Bundle)

When you are ready to publish Alinga Pa on the **Google Play Store**:

1. Run the production build command:
   ```powershell
   cd mobile
   npx eas-cli build --platform android --profile production
   ```
2. EAS will generate an optimized **Android App Bundle (`.aab`)**.
3. Download the `.aab` file and upload it to the **Google Play Console** ([play.google.com/console](https://play.google.com/console)) under Production / Internal Testing.

---

## 📋 EAS Configuration Reference (`mobile/eas.json`)

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

---

*Alinga Pa — Your Life, Our Care.*

