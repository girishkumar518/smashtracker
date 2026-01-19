import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableWithoutFeedback, Keyboard, SafeAreaView } from 'react-native';
import Button from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { useClub } from '../context/ClubContext';
import { Ionicons } from '@expo/vector-icons';

// Simple Theme
const THEME = {
  bg: '#171923',
  surface: '#2D3748',
  text: '#FFFFFF',
  inputBg: '#4A5568',
  accent: '#0F766E',
};

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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Create New Club</Text>
            <Text style={styles.subtitle}>Start your own community</Text>
        </View>

        <View style={styles.form}>
            <Text style={styles.label}>CLUB NAME</Text>
            <View style={styles.inputContainer}>
                <Ionicons name="people-circle-outline" size={24} color="#A0AEC0" style={{marginRight: 12}} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Downtown Smashers"
                  placeholderTextColor="#A0AEC0"
                  value={clubName}
                  onChangeText={setClubName}
                  autoFocus
                />
            </View>

            <Button 
              title={loading ? "Creating..." : "Create Club"} 
              onPress={handleCreate} 
              disabled={loading}
              style={{marginTop: 24, backgroundColor: THEME.accent}}
            />
            
            <Button 
                title="Cancel"
                variant="outline"
                onPress={() => navigation.goBack()}
                style={{marginTop: 12, borderColor: '#4A5568'}}
                textStyle={{color: '#A0AEC0'}}
            />
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    padding: 24,
  },
  header: {
      marginTop: 40,
      marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
      fontSize: 16,
      color: '#A0AEC0'
  },
  form: {
      backgroundColor: THEME.surface,
      padding: 24,
      borderRadius: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#CBD5E0',
    letterSpacing: 1,
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.inputBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: '#4A5568'
  },
  input: {
    flex: 1,
    height: 50,
    color: 'white',
    fontSize: 16,
  },
});

