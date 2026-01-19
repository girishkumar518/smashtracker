import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

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
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Display Name (First & Last)</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. John Doe"
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
                  style={styles.deleteBtn}
                  textStyle={styles.deleteBtnText}
                />
            </View>
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F5F7FA',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2D3748',
  },
  saveBtn: {
      marginTop: 20
  },
  disabledInput: {
    color: '#A0AEC0',
    backgroundColor: '#EDF2F7',
  },
  helper: {
    marginTop: 4,
    fontSize: 12,
    color: '#A0AEC0',
  },
  dangerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#E53E3E',
      marginBottom: 8
  },
  dangerText: {
      fontSize: 14,
      color: '#718096',
      lineHeight: 20
  },
  dangerZone: {
    marginTop: 60, 
    borderTopWidth: 1, 
    borderTopColor: '#E2E8F0', 
    paddingTop: 30
  },
  deleteBtn: {
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#E53E3E', 
    marginTop: 12
  },
  deleteBtnText: {
    color: '#E53E3E' 
  }
});
