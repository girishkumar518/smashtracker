import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Button from '../components/Button';
import Card from '../components/Card';
import { useClub } from '../context/ClubContext';

export default function JoinClubScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();
  const { joinClub } = useClub();

  const handleJoin = async () => {
    if (code.length < 6) {
      Alert.alert('Invalid Code', 'Club invite code must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await joinClub(code);
      if (result.success) {
        Alert.alert('Status', result.message, [
          { text: 'Go to Dashboard', onPress: () => navigation.replace('Home') }
        ]);
      } else {
        Alert.alert('Error', result.message || 'Invalid invite code. Please check and try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join club. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Join a Club</Text>
        <Text style={styles.subtitle}>Enter the invite code shared by your club admin.</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter Invite Code (e.g. AB12CD)"
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase())}
          autoCapitalize="characters"
          maxLength={8}
        />

        <Button 
          title={loading ? "Joining..." : "Join Club"} 
          onPress={handleJoin} 
          disabled={loading || !code}
        />
        
        {loading && <ActivityIndicator style={{ marginTop: 20 }} color="#38A169" />}
      </Card>
      
      <Button 
        title="Cancel" 
        variant="outline" 
        onPress={() => navigation.goBack()} 
        style={{ marginTop: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
  },
  card: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    padding: 16,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2D3748',
    marginBottom: 24,
    letterSpacing: 2,
  },
});
