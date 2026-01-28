import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: config.name || "SmashTracker",
    slug: config.slug || "smashtracker",
    android: {
      ...config.android,
      // Dynamic Google Services File logic: only valid reason for app.config.ts here
      googleServicesFile: process.env.GOOGLE_SERVICES_FILE || "./google-services.json",
    },
  };
};
