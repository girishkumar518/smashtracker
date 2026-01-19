import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableWithoutFeedback, Keyboard, ScrollView, StatusBar, SafeAreaView, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import Button from '../components/Button';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const { userClubs, activeClub, setActiveClub } = useClub();
  const [name, setName] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setLoading(true);
    await updateProfile(name);
    setLoading(false);
    
    Alert.alert('Success', 'Profile updated!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const handleSwitchClub = (club: any) => {
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

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
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
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      marginBottom: 12,
  },
  clubItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.surfaceHighlight,
  },
  activeClubItem: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
  },
  clubInitial: {
      width: 32, height: 32, borderRadius: 16,
      justifyContent: 'center', alignItems: 'center',
  },
  clubName: {
      fontWeight: '600',
      fontSize: 14,
  },
  smallBtn: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: theme.colors.primary,
      paddingVertical: 10,
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
});
