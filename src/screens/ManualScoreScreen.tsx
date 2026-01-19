import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Button from '../components/Button';
import Card from '../components/Card';
import { useClub } from '../context/ClubContext';
import { Match, MatchSet } from '../models/types';

type ManualScoreParams = {
  isDoubles: boolean;
  team1: { id: string; name: string }[];
  team2: { id: string; name: string }[];
  matchType?: 1 | 3;
  match?: Match;
  isEdit?: boolean;
};

export default function ManualScoreScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as ManualScoreParams;
  const { isEdit, match } = params;
  const { recordMatch, activeClub, deleteMatch, allUsers, members } = useClub();

  // Helper to resolve name
  const getName = (id: string) => {
      // Search in allUsers (history) first, then members
      const u = allUsers?.find(u => u.id === id) || members.find(m => m.id === id);
      return u ? u.displayName : 'Player';
  };

  // Use existing match data if editing, else use params
  const team1 = match ? match.team1.map(id => ({id, name: getName(id)})) : params.team1;
  const team2 = match ? match.team2.map(id => ({id, name: getName(id)})) : params.team2;
  const matchType = 3; 


  const [s1t1, setS1T1] = useState(match?.scores[0]?.team1Score.toString() || '');
  const [s1t2, setS1T2] = useState(match?.scores[0]?.team2Score.toString() || '');
  
  const [s2t1, setS2T1] = useState(match?.scores[1]?.team1Score.toString() || '');
  const [s2t2, setS2T2] = useState(match?.scores[1]?.team2Score.toString() || '');

  const [s3t1, setS3T1] = useState(match?.scores[2]?.team1Score.toString() || '');
  const [s3t2, setS3T2] = useState(match?.scores[2]?.team2Score.toString() || '');

  const handleDelete = () => {
    if (!match) return;
    Alert.alert(
        "Delete Match",
        "Are you sure you want to delete this match record?",
        [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                if (match.id && deleteMatch) {
                    await deleteMatch(match.id);
                    navigation.goBack();
                }
            }}
        ]
    );
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!s1t1 || !s1t2) {
      Alert.alert('Error', 'Please enter at least the first set details');
      return;
    }

    // Determine winner based on sets won
    let wins1 = 0;
    let wins2 = 0;
    const recordedSets: MatchSet[] = [];

    const rawSets = [
      { t1: parseInt(s1t1), t2: parseInt(s1t2) },
      { t1: parseInt(s2t1), t2: parseInt(s2t2) },
      { t1: parseInt(s3t1), t2: parseInt(s3t2) },
    ];

    rawSets.forEach(set => {
      if (!isNaN(set.t1) && !isNaN(set.t2)) {
        recordedSets.push({ team1Score: set.t1, team2Score: set.t2 });
        if (set.t1 > set.t2) wins1++;
        else if (set.t2 > set.t1) wins2++;
      }
    });

    const winnerTeam = wins1 > wins2 ? 1 : 2; 

    if (isEdit && match && deleteMatch) {
        // Edit flow
         await deleteMatch(match.id);
         const newMatch: Match = {
               id: activeClub?.id + '_' + Date.now(),
               clubId: activeClub?.id || '',
               date: match.date, // Preserve date
               team1: match.team1,
               team2: match.team2,
               scores: recordedSets,
               winnerTeam,
               isLive: false,
               durationSeconds: 0 
         };
         recordMatch(newMatch);
         navigation.goBack();
    } else {
        // Create new flow
        const newMatch: Match = {
          id: Math.random().toString(),
          clubId: activeClub?.id || 'unknown',
          date: Date.now(),
          team1: team1.map(p => p.id), 
          team2: team2.map(p => p.id),
          scores: recordedSets,
          winnerTeam: winnerTeam,
          isLive: false
        };
        recordMatch(newMatch);
        navigation.navigate('Home' as never);
    }
  };

  return (
    <ScrollView style={styles.container}>
       {isEdit && (
          <View style={{marginBottom: 16}}>
              <Button title="Delete Match Record" onPress={handleDelete} style={{backgroundColor: '#E53E3E'}} />
          </View>
      )}

      <Text style={styles.title}>{isEdit ? 'Edit Match Result' : 'Enter Match Score'}</Text>
      
      <Card>
        <Text style={styles.setHeader}>Set 1</Text>
        <View style={styles.inputRow}>
           <View style={styles.playerInput}>
              <Text style={styles.label}>{team1.map(p => p.name).join(' & ')}</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={s1t1} 
                onChangeText={setS1T1} 
                placeholder="0"
              />
           </View>
           <Text style={styles.vs}>-</Text>
           <View style={styles.playerInput}>
              <Text style={styles.label}>{team2.map(p => p.name).join(' & ')}</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={s1t2} 
                onChangeText={setS1T2} 
                placeholder="0"
              />
           </View>
        </View>
      </Card>

      <Card style={{marginTop: 16}}>
        <Text style={styles.setHeader}>Set 2</Text>
        <View style={styles.inputRow}>
           <View style={styles.playerInput}>
              <Text style={styles.label}>{team1.map(p => p.name).join(' & ')}</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={s2t1} 
                onChangeText={setS2T1} 
                placeholder="0"
              />
           </View>
           <Text style={styles.vs}>-</Text>
           <View style={styles.playerInput}>
              <Text style={styles.label}>{team2.map(p => p.name).join(' & ')}</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={s2t2} 
                onChangeText={setS2T2} 
                placeholder="0"
              />
           </View>
        </View>
      </Card>

      <Card style={{marginTop: 16}}>
        <Text style={styles.setHeader}>Set 3 (If necessary)</Text>
        <View style={styles.inputRow}>
           <View style={styles.playerInput}>
              <Text style={styles.label}>{team1.map(p => p.name).join(' & ')}</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={s3t1} 
                onChangeText={setS3T1} 
                placeholder="0"
              />
           </View>
           <Text style={styles.vs}>-</Text>
           <View style={styles.playerInput}>
              <Text style={styles.label}>{team2.map(p => p.name).join(' & ')}</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={s3t2} 
                onChangeText={setS3T2} 
                placeholder="0"
              />
           </View>
        </View>
      </Card>

      <View style={{marginTop: 24, marginBottom: 40}}>
        <Button title={isEdit ? "Update Match" : "Save Result"} onPress={handleSubmit} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2D3748',
  },
  setHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#4A5568',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerInput: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
    color: '#718096',
    textAlign: 'center',
  },
  input: {
    width: 60,
    height: 50,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    fontSize: 24,
    textAlign: 'center',
    backgroundColor: '#F7FAFC',
  },
  vs: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#CBD5E0',
    marginHorizontal: 16,
  },
});
