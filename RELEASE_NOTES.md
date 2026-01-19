# SmashTracker Release Notes - v1.0.0 (Production Release)

## 🚀 Key Highlights
- **Production-Ready Architecture**: Full migration from hardcoded development credentials to a secure, environment-variable-driven setup.
- **Automated CI/CD**: One-click Android APK generation via GitHub Actions (running locally on runners to avoid queues).
- **Google Sign-In**: Fully configured for Production with secure SHA1 fingerprinting.

## 🛠 Technical Changes

### 1. Build & Configuration
- **Dynamic Config**: Migrated `app.json` to `app.config.ts` to support dynamic switching of `google-services.json` based on build profiles.
- **EAS Profiles**: Configured `eas.json` with distinct profiles:
  - `development`: Uses dev database, local testing.
  - `apk`: Generates `.apk` for direct device installation (Production DB).
  - `production`: Generates `.aab` for Play Store submission (Production DB).
- **Package Name**: Standardized app package name to `com.gk.smashtracker` across all configurations to match Firebase.

### 2. CI/CD Pipeline (GitHub Actions)
- **Local Build Strategy**: Switched from Expo Cloud to **Local Builds on GitHub Runners**.
  - *Benefit*: Bypasses free-tier concurrency queues.
  - *Benefit*: reduced build wait times.
- **Artifact Management**: Successfully builds `smashtracker.apk` and uploads it as a downloadable artifact in GitHub Actions.
- **Dependency Upgrades**: upgraded Node.js to v20.x and Java to v17 for build compatibility.

### 3. Backend & Security (Firebase)
- **Environment Variables**: All Firebase keys are now injected via `process.env` (using `.env` locally and `eas.json` secrets for cloud builds).
- **Security Rules**: Updated Firestore Rules (`firestore.rules`) to strictly allow:
  - User profile management (Self-only).
  - Club creation and joining.
  - Match recording.
- **Google Auth**: Updated `webClientId` to match the new Production Firebase Project.

### 4. UI/UX Improvements
- **Rich Match Setup**: Complete redesign of the Match Setup screen with card-based layouts for Singles/Doubles.
- **Theming**: Implemented a global Theme Context, ensuring consistent Dark/Light mode support across all 15+ screens.
- **Club Management**: Fixed permission issues preventing new clubs from appearing in the list immediately.

## 📱 How to Install (Android)
1. Go to the **Actions** tab in this repository.
2. Click on the latest **"Build Android APK"** workflow run.
3. Scroll down to the **Artifacts** section.
4. Download `smashtracker-apk`.
5. Unzip the file and install `smashtracker.apk` on your Android device.

## ⚠️ Known Requirements
- **Google Login**: Requires the App SHA1 fingerprint (`E7:1D:22:...`) to be registered in the Firebase Console.
