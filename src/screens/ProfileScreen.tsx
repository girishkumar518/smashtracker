import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableWithoutFeedback, Keyboard, ScrollView, StatusBar, SafeAreaView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';

export default function ProfileScreen() {
  const { user, updateProfile, deleteAccount } = useAuth();
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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
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
