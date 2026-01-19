import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: "SmashTracker",
    slug: "smashtracker",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    ios: {
      "supportsTablet": true,
      "bundleIdentifier": "com.badminton.smashtracker",
      "buildNumber": "1"
    },
    android: {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.badminton.smashtracker",
      "versionCode": 1,
      // Dynamic Google Services File
      "googleServicesFile": process.env.GOOGLE_SERVICES_FILE || "./google-services.json",
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    web: {
      "favicon": "./assets/favicon.png"
    },
    plugins: [
      "@react-native-google-signin/google-signin"
    ],
    extra: {
      "eas": {
        "projectId": "1f98d6aa-cad2-4fd2-a20f-2d53b330a3c9"
      }
    }
  };
};
