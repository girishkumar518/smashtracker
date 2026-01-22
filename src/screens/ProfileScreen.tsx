import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableWithoutFeedback, Keyboard, ScrollView, StatusBar, TouchableOpacity, Platform, Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import Button from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import CountryCodePicker from '../components/CountryCodePicker';
import { parsePhoneNumber } from '../constants/CountryCodes';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Constants from 'expo-constants';
import { Club } from '../models/types';

// Safely get version
const appVersion = Constants?.expoConfig?.version || Constants?.manifest2?.extra?.expoClient?.version || '1.0.0';

export default function ProfileScreen() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const { userClubs, activeClub, setActiveClub, invitedClubs, acceptClubInvite } = useClub();
  
  // Debug logging
  useEffect(() => {
      console.log("ProfileScreen mounted");
      console.log("User:", user?.id);
      console.log("Invited Clubs:", invitedClubs?.length);
      console.log("App Version check:", {
          expoConfig: Constants.expoConfig?.version,
          fallback: '1.0.0'
      });
  }, []);
  
  // Initialize state
  const initialPhoneData = parsePhoneNumber(user?.phoneNumber);
  const [name, setName] = useState(user?.displayName || '');
  const [countryCode, setCountryCode] = useState(initialPhoneData.code);
  const [phone, setPhone] = useState(initialPhoneData.number);
  const [loading, setLoading] = useState(false);
  
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const fullPhoneNumber = `${countryCode}${phone}`;
  const isPhoneChanged = !user?.phoneNumber || user.phoneNumber !== fullPhoneNumber;

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setLoading(true);

    try {
        // If phone changed, check duplicates in Firestore (Manual Uniqueness Check)
        if (isPhoneChanged && phone.length > 5) {
             const usersRef = collection(db, 'users');
             const q = query(usersRef, where("phoneNumber", "==", fullPhoneNumber));
             const snapshot = await getDocs(q);
             
             if (!snapshot.empty) {
                 // Check if the found user is NOT the current user
                 const otherUser = snapshot.docs.some(doc => doc.id !== user?.id);
                 if (otherUser) {
                     setLoading(false);
                     Alert.alert("Error", "This phone number is already linked to another account.");
                     return;
                 }
             }
        }

        await updateProfile({ displayName: name, phoneNumber: fullPhoneNumber });
        setLoading(false);
        
        Alert.alert('Success', 'Profile updated!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
    } catch (e: any) {
        setLoading(false);
        console.error("Update Error:", e);
        Alert.alert("Error", e.message || "Failed to update profile");
    }
  };

  const handleSwitchClub = (club: Club) => {
      setActiveClub(club);
      Alert.alert('Club Switched', `You are now viewing ${club.name}`, [
          { text: 'Go to Home', onPress: () => navigation.navigate('Home' as never) }
      ]);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Account", 
      "Are you sure? This will remove your login access but keep your match history as 'Deleted Player'.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
             try {
                await deleteAccount();
             } catch (e) {
               console.error(e);
               Alert.alert("Error", "Failed to delete account. You may need to re-login first.");
             }
          }
        }
      ]
    );
  };

  const handleFeedback = () => {
      // Get device info for detailed feedback
      const version = appVersion;
      const subject = encodeURIComponent(`SmashTracker Feedback (v${version})`);
      const body = encodeURIComponent(`\n\nApp Version: ${version}\nPlatform: ${Platform.OS}\n`);
      
      const url = `mailto:gksoftwareltd@gmail.com?subject=${subject}&body=${body}`;
      
      Linking.canOpenURL(url).then(supported => {
          if (!supported) {
              Alert.alert('Error', 'No email client available');
          } else {
              Linking.openURL(url);
          }
      });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            {/* Club Invites Section */}
            {invitedClubs && invitedClubs.length > 0 && (
                <View style={[styles.section, {borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 16}]}>
                   <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>Club Invites ({invitedClubs.length})</Text>
                   {invitedClubs.map(club => (
                       <View key={club.id} style={styles.clubItem}>
                           <View>
                               <Text style={styles.clubName}>{club.name}</Text>
                               <Text style={{fontSize: 10, color: theme.colors.textSecondary}}>Invited you to join</Text>
                           </View>
                           <View style={{flexDirection: 'row'}}>
                               <TouchableOpacity 
                                  style={[styles.smallBtn, {backgroundColor: '#38A169', paddingHorizontal: 16}]}
                                  onPress={async () => {
                                      try {
                                          await acceptClubInvite(club.id);
                                          Alert.alert("Joined!", `Welcome to ${club.name}`);
                                      } catch(e) {
                                          Alert.alert("Error", "Could not join club");
                                      }
                                  }}
                               >
                                   <Text style={styles.smallBtnText}>Accept</Text>
                               </TouchableOpacity>
                           </View>
                       </View>
                   ))}
                </View>
            )}

            {/* Club Management Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Clubs</Text>
                
                {userClubs && userClubs.length > 0 ? (
                    userClubs.map(club => (
                        <TouchableOpacity 
                            key={club.id} 
                            style={[
                                styles.clubItem, 
                                activeClub?.id === club.id && styles.activeClubItem
                            ]}
                            onPress={() => handleSwitchClub(club)}
                        >
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <View style={[styles.clubInitial, {backgroundColor: activeClub?.id === club.id ? theme.colors.primary : theme.colors.textSecondary}]}>
                                    <Text style={{color: 'white', fontWeight: 'bold'}}>{club.name.substring(0,2).toUpperCase()}</Text>
                                </View>
                                <View style={{marginLeft: 10}}>
                                    <Text style={[styles.clubName, {color: theme.colors.textPrimary}]}>{club.name}</Text>
                                    {activeClub?.id === club.id && <Text style={{color: theme.colors.primary, fontSize: 10, fontWeight:'bold'}}>ACTIVE</Text>}
                                </View>
                            </View>
                            {activeClub?.id === club.id && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={{color: theme.colors.textSecondary, marginBottom: 12}}>No clubs joined yet.</Text>
                )}

                <View style={{flexDirection: 'row', gap: 10, marginTop: 12}}>
                    <TouchableOpacity style={styles.smallBtn} onPress={() => navigation.navigate('JoinClub' as never)}>
                        <Ionicons name="enter-outline" size={16} color="white" />
                        <Text style={styles.smallBtnText}>Join Club</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallBtn, {backgroundColor: theme.colors.secondary}]} onPress={() => navigation.navigate('CreateClub' as never)}>
                        <Ionicons name="add-circle-outline" size={16} color="white" />
                        <Text style={styles.smallBtnText}>Create Club</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.formGroup}>
              <Text style={styles.label}>Display Name (First & Last)</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. John Doe"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
                  <CountryCodePicker 
                     selectedCode={countryCode} 
                     onSelect={setCountryCode}
                  />
                  <TextInput
                    style={[styles.input, {flex: 1}]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="1234567890"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="phone-pad"
                  />
                  {!isPhoneChanged && user?.phoneNumber && (
                      <View style={{justifyContent: 'center', paddingHorizontal: 10}}>
                          <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                      </View>
                  )}
              </View>
              <Text style={styles.helper}>Used for friends to find you.</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={user?.email}
                editable={false}
              />
              <Text style={styles.helper}>Email cannot be changed.</Text>
            </View>

            <Button 
              title="Save Changes" 
              onPress={handleUpdate} 
              loading={loading}
              style={styles.saveBtn}
            />

            <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>Danger Zone</Text>
                <Text style={styles.dangerText}>
                   Once you delete your account, there is no going back. Please be certain.
                </Text>
                <Button 
                  title="Delete Account" 
                  onPress={handleDelete} 
                  variant="danger"
                  style={{ marginTop: 12 }}
                />
            </View>

            <View style={styles.footer}>
                <Button 
                  title="Send Feedback" 
                  onPress={handleFeedback}
                  variant="secondary"
                  style={styles.feedbackBtn}
                  textStyle={{ color: theme.colors.primary }}
                />
                <Text style={styles.versionText}>v{appVersion}</Text>
            </View>

          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: theme.colors.textPrimary,
  },
  clubItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.background, // Default border transparent-ish
  },
  activeClubItem: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surfaceHighlight,
  },
  clubName: {
      fontSize: 16,
      fontWeight: '600',
  },
  clubInitial: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
  },
  smallBtn: {
      flexDirection: 'row',
      backgroundColor: theme.colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
  },
  smallBtnText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 12,
      marginLeft: 6,
  },
  divider: {
      height: 1,
      backgroundColor: theme.colors.surfaceHighlight,
      marginVertical: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.textPrimary,
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
  },
  disabledInput: {
    backgroundColor: theme.colors.surfaceHighlight,
    color: theme.colors.textSecondary,
  },
  helper: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  saveBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
  },
  dangerZone: {
    marginTop: 60,
    padding: 24,
    backgroundColor: theme.colors.error + '10', // 10% opacity
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
  },
  dangerTitle: {
    color: theme.colors.error,
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
  },
  dangerText: {
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  footer: {
      marginTop: 40,
      alignItems: 'center',
      paddingBottom: 40,
  },
  feedbackBtn: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.primary,
      borderWidth: 1,
      minWidth: 200,
  },
  versionText: {
      marginTop: 16,
      color: theme.colors.textSecondary,
      fontSize: 12,
  }
});
