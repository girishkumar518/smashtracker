# Android Production Deployment Guide

## 1. Prerequisites
- You must be logged in to your Expo account:
  ```bash
  eas login
  ```
- Ensure your `google-services.json` is in the root directory (it is already there).

## 2. Generate a Production APK (Universal)
This creates an `.apk` file that you can install directly on any Android device. Good for manual distribution or testing the release version.
```bash
npm run build:prod:apk
```

## 3. Generate a Production AAB (Play Store)
This creates an `.aab` (Android App Bundle) file required for the Google Play Store.
```bash
npm run build:prod:aab
```

## 4. Play Store Submission Steps

### Step A: Google Play Console Setup
1.  Go to the [Google Play Console](https://play.google.com/console).
2.  Create a new App.
3.  Fill in the "Main Store Listing" details (Title, Description, Screenshots, etc.).

### Step B: Uploading the Build
1.  Navigate to **Production** or **Testing > Internal testing**.
2.  Click **Create new release**.
3.  Upload the `.aab` file you downloaded from the Expo dashboard after running step 3.
4.  Update release notes and title.
5.  Click **Next** and check for any errors.
6.  **Signature**: If this is the first time, Play Console will ask to manage your signing key. Select "Let Google manage and protect your app signing key (recommended)".

### Step C: Privacy & Compliance
Since you use Google Sign-In and Camera/Permissions:
1.  **App Content**: Go to the App Content section in Play Console.
2.  Complete the **Data Safety** form. You must disclose that you collect:
    - **Email/User IDs** (for App Functionality/Account Management).
    - **Images** (if user uploads profile pics).
3.  Provide a link to your **Privacy Policy** (required for Google Sign-In).

## 5. Troubleshooting
If the build fails due to credentials:
- Run `eas credentials` to manage your Android Keystore.
- Ensure your `google-services.json` matches the build package name: `com.badminton.smashtracker`.
