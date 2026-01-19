import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Button from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { useClub } from '../context/ClubContext';

export default function CreateClubScreen() {
  const [clubName, setClubName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { createClub } = useClub();

  const handleCreate = async () => {
    if (!clubName.trim()) {
      Alert.alert('Error', 'Please enter a club name');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to create club:', clubName);
      
      // Create a timeout promise that rejects after 10 seconds
      const timeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timed out. Check your internet or Firebase settings.')), 10000);
      });

      // Race the createClub against the timeout
      await Promise.race([createClub(clubName), timeout]);

      Alert.alert('Success', `Club "${clubName}" created!`);
      navigation.goBack();
    } catch (error: any) {
      console.error("Create Club Error:", error);
      Alert.alert('Error', error.message || 'Failed to create club. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.label}>Club Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Downtown Smashers"
          value={clubName}
          onChangeText={setClubName}
          autoFocus
        />
        <Text style={styles.helper}>
          You will become the Admin of this club and can invite others.
        </Text>

        <Button 
          title="Create Club" 
          onPress={handleCreate} 
          loading={loading}
          style={{ marginTop: 24 }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  input: {
    height: 50,
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2D3748',
    marginBottom: 12,
  },
  helper: {
    fontSize: 12,
    color: '#718096',
  },
});

