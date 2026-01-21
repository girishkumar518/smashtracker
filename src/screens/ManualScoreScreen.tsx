import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, StatusBar, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Button from '../components/Button';
import Card from '../components/Card';
import { useClub } from '../context/ClubContext';
import { Match, MatchSet, User } from '../models/types';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

type ManualScoreParams = {
  isDoubles: boolean;
  team1: { id: string; name: string }[];
  team2: { id: string; name: string }[];
  matchType?: 1 | 3;
  match?: Match;
  isEdit?: boolean;
  guestNames?: Record<string, string>;
};

export default function ManualScoreScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as ManualScoreParams;
  const { isEdit, match } = params;
  const { recordMatch, activeClub, deleteMatch, allUsers, members } = useClub();
  const { theme, isDark } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Helper to resolve name
  const getName = (id: string) => {
      // Check guest map first
      if (params.guestNames && params.guestNames[id]) return params.guestNames[id];
      if (match?.guestNames && match.guestNames[id]) return match.guestNames[id];
      
      // Search in allUsers (history) first, then members
      const u = allUsers?.find(u => u.id === id) || members.find(m => m.id === id);
      return u ? u.displayName : 'Player';
  };
  
  // Use existing match data if editing, else use params
  // We keep state for teams to allow editing
  const [team1Players, setTeam1Players] = useState(match ? match.team1.map(id => ({id, name: getName(id)})) : params.team1);
  const [team2Players, setTeam2Players] = useState(match ? match.team2.map(id => ({id, name: getName(id)})) : params.team2);
  const [currentGuestNames, setCurrentGuestNames] = useState(match?.guestNames || params.guestNames || {});

  const currentMatchType = params.matchType || 3;

  // Player Selection for Edit Mode
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState<1 | 2>(1);
  const [editingIndex, setEditingIndex] = useState(0);

  const openPlayerSelector = (team: 1 | 2, index: number) => {
      if (!isEdit) return;
      setEditingTeam(team);
      setEditingIndex(index);
      setModalVisible(true);
  };

  const selectPlayer = (user: User) => {
      // Logic to replace player at specific index
      if (editingTeam === 1) {
          const newTeam = [...team1Players];
          newTeam[editingIndex] = { id: user.id, name: user.displayName };
          setTeam1Players(newTeam);
      } else {
          const newTeam = [...team2Players];
          newTeam[editingIndex] = { id: user.id, name: user.displayName };
          setTeam2Players(newTeam);
      }

      // If user is guest, update map
      if (user.id.startsWith('guest_')) {
          setCurrentGuestNames(prev => ({...prev, [user.id]: user.displayName}));
      }

      setModalVisible(false);
  };


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

    let hasError = false;

    rawSets.forEach((set, index) => {
      if (!isNaN(set.t1) && !isNaN(set.t2)) {
        // Validation: At least one score >= 21
        if (set.t1 < 21 && set.t2 < 21) {
             Alert.alert('Invalid Score', `In Set ${index + 1}, at least one team must reach 21 points.`);
             hasError = true;
             return;
        }

        recordedSets.push({ team1Score: set.t1, team2Score: set.t2 });
        if (set.t1 > set.t2) wins1++;
        else if (set.t2 > set.t1) wins2++;
        else {
             Alert.alert('Invalid Score', `Set ${index + 1} cannot be a draw.`);
             hasError = true;
        }
      }
    });

    if (hasError) return;

    if (recordedSets.length === 0) {
        Alert.alert('Error', 'No valid sets recorded.');
        return;
    }

    const winnerTeam = wins1 > wins2 ? 1 : 2; 

    if (isEdit && match && deleteMatch) {
        // Edit flow
         await deleteMatch(match.id);
         const newMatch: Match = {
               id: activeClub?.id + '_' + Date.now(),
               clubId: activeClub?.id || '',
               date: match.date, // Preserve date
               team1: team1Players.map(p => p.id),
               team2: team2Players.map(p => p.id),
               scores: recordedSets,
               winnerTeam,
               isLive: false,
               durationSeconds: 0,
               guestNames: currentGuestNames
         };
         recordMatch(newMatch);
         navigation.goBack();
    } else {
        // Create new flow
        const newMatch: Match = {
          id: Math.random().toString(),
          clubId: activeClub?.id || 'unknown',
          date: Date.now(),
          team1: team1Players.map(p => p.id), 
          team2: team2Players.map(p => p.id),
          scores: recordedSets,
          winnerTeam: winnerTeam,
          isLive: false,
          guestNames: currentGuestNames
        };
        recordMatch(newMatch);
        navigation.navigate('Home' as never);
    }
  };

  const renderTeamNames = (teamPlayers: {id: string, name: string}[], teamIndex: 1 | 2) => {
     if (!isEdit) return <Text style={styles.label}>{teamPlayers.map(p => p.name).join(' & ')}</Text>;
     
     return (
         <View style={{flexDirection:'row', justifyContent:'center', minHeight: 32, flexWrap:'wrap', gap: 8}}>
            {teamPlayers.map((p, i) => (
                <TouchableOpacity 
                   key={i} 
                   onPress={() => openPlayerSelector(teamIndex, i)}
                   style={{flexDirection:'row', alignItems:'center', backgroundColor: theme.colors.surfaceHighlight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12}}
                >
                    <Text style={[styles.label, {marginBottom: 0, marginRight: 4}]}>{p.name}</Text>
                    <Ionicons name="pencil" size={12} color={theme.colors.primary} />
                </TouchableOpacity>
            ))}
         </View>
     );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
       <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      <ScrollView style={styles.container}>
        {isEdit && (
            <View style={{marginBottom: 16}}>
                <Button title="Delete Match Record" onPress={handleDelete} style={{backgroundColor: '#E53E3E'}} />
            </View>
        )}

        <Text style={styles.title}>{isEdit ? 'Edit Match Result' : 'Enter Match Score'}</Text>
        
        <Card style={styles.card}>
          <Text style={styles.setHeader}>Set 1</Text>
          <View style={styles.inputRow}>
            <View style={styles.playerInput}>
                {renderTeamNames(team1Players, 1)}
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  value={s1t1} 
                  onChangeText={setS1T1} 
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                />
            </View>
            <Text style={styles.vs}>-</Text>
            <View style={styles.playerInput}>
                {renderTeamNames(team2Players, 2)}
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  value={s1t2} 
                  onChangeText={setS1T2} 
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                />
            </View>
          </View>
        </Card>

        {currentMatchType === 3 && (
          <>
        <Card style={[styles.card, {marginTop: 16}]}>
          <Text style={styles.setHeader}>Set 2</Text>
          <View style={styles.inputRow}>
            <View style={styles.playerInput}>
                {renderTeamNames(team1Players, 1)}
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  value={s2t1} 
                  onChangeText={setS2T1} 
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                />
            </View>
            <Text style={styles.vs}>-</Text>
            <View style={styles.playerInput}>
                {renderTeamNames(team2Players, 2)}
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  value={s2t2} 
                  onChangeText={setS2T2} 
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                />
            </View>
          </View>
        </Card>

        <Card style={[styles.card, {marginTop: 16}]}>
          <Text style={styles.setHeader}>Set 3 (If necessary)</Text>
          <View style={styles.inputRow}>
            <View style={styles.playerInput}>
                {renderTeamNames(team1Players, 1)}
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  value={s3t1} 
                  onChangeText={setS3T1} 
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                />
            </View>
            <Text style={styles.vs}>-</Text>
            <View style={styles.playerInput}>
                {renderTeamNames(team2Players, 2)}
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  value={s3t2} 
                  onChangeText={setS3T2} 
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                />
            </View>
          </View>
        </Card>
        </>
        )}

        <Button title="Save Match" onPress={handleSubmit} style={{ marginTop: 24, marginBottom: 40 }} />
      </ScrollView>

      {/* Player Selection Modal for Editing */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.textPrimary }}>Select Replacement Player</Text>
              <Button title="Close" variant="outline" onPress={() => setModalVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 16 }} />
            </View>
            <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => {
                return (
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }} 
                    onPress={() => selectPlayer(item)}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>{item.displayName.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary }}>{item.displayName}</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Rank: {item.rank}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    padding: 16,
    // backgroundColor handled in parent View
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: theme.colors.textPrimary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: 16,
  },
  setHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
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
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    color: theme.colors.textPrimary,
    height: 32, // Fixed height for 2 lines of text
  },
  input: {
    width: '100%',
    backgroundColor: theme.colors.surfaceHighlight, // Was #EDF2F7
    borderRadius: 8,
    padding: 12,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: theme.colors.textPrimary,
  },
  vs: {
    marginHorizontal: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.disabled, // Was #CBD5E0
  },
});
