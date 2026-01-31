import React from 'react';
import { View, ViewStyle } from 'react-native';
// import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads'; // UNCOMMENT AFTER REBUILD
import { FEATURES } from '../config/features';

interface AdBannerProps {
    style?: ViewStyle;
    isPremium?: boolean;
}

export const AdBanner: React.FC<AdBannerProps> = ({ style, isPremium = false }) => {
    // 1. Safety Check
    if (!FEATURES.ENABLE_ADS || isPremium) {
        return null;
    }

    // 2. Placeholder for Missing Native Module
    // Since 'react-native-google-mobile-ads' native code isn't built into the client yet,
    // we return null to prevent the app from crashing.
    // Once you rebuild the dev client (eas build --profile development), you can uncomment the import above.

    /* UNCOMMENT THIS BLOCK AFTER REBUILDING DEV CLIENT
    const adUnitId = __DEV__ && FEATURES.ENABLE_ADS_IN_DEV
        ? TestIds.BANNER 
        : Platform.select({
            android: AD_UNIT_IDS.ANDROID_BANNER,
            ios: AD_UNIT_IDS.IOS_BANNER,
        }) || TestIds.BANNER;

    return (
        <View style={[{ alignItems: 'center', marginVertical: 10 }, style]}>
            <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: true,
                }}
            />
        </View>
    ); 
    */

    return null;
};
