import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, Modal, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import Button from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { useClub } from '../context/ClubContext';
import { User } from '../models/types';
import Card from '../components/Card';

export default function MatchSetupScreen() {
  const navigation = useNavigation<any>();
  const { members } = useClub();
  
  const [isDoubles, setIsDoubles] = useState(false);
  const [scoreMode, setScoreMode] = useState<'live' | 'manual'>('live'); // New Mode Switch
  const [matchType, setMatchType] = useState<1 | 3>(3); // 1 = Single Set, 3 = Best of 3

  // Selected Players (User objects or standard placeholders)
  const [p1, setP1] = useState<User | null>(members[0]); // Default to first member (likely admin)
  const [p2, setP2] = useState<User | null>(null);
  const [p3, setP3] = useState<User | null>(null);
  const [p4, setP4] = useState<User | null>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'p1' | 'p2' | 'p3' | 'p4' | null>(null);

  const openSelector = (playerKey: 'p1' | 'p2' | 'p3' | 'p4') => {
    setSelectingFor(playerKey);
    setModalVisible(true);
  };

  const selectPlayer = (user: User) => {
    if (selectingFor === 'p1') setP1(user);
    if (selectingFor === 'p2') setP2(user);
    if (selectingFor === 'p3') setP3(user);
    if (selectingFor === 'p4') setP4(user);
    setModalVisible(false);
    setSelectingFor(null);
  };

  const getTeams = () => {
    const t1 = [{ id: p1?.id || 'p1', name: p1?.displayName || 'Player 1' }];
    if (isDoubles) t1.push({ id: p2?.id || 'p2', name: p2?.displayName || 'Player 2' });

    const t2 = [{ id: p3?.id || 'p3', name: p3?.displayName || (isDoubles ? 'Player 3' : 'Player 2') }];
    if (isDoubles) t2.push({ id: p4?.id || 'p4', name: p4?.displayName || 'Player 4' });

    return { team1: t1, team2: t2 };
  };

  const startMatch = () => {
    const { team1, team2 } = getTeams();
    
    // Check missing players
    if (!p1 || (!p3 && !isDoubles) || (isDoubles && (!p2 || !p3 || !p4))) {
     // alert('Please select all players');
    }

    if (scoreMode === 'live') {
      navigation.navigate('LiveScore', {
        isDoubles,
        team1, // Now array of objects
        team2,
        matchType,
      });
    } else {
      navigation.navigate('ManualScore', {
        isDoubles,
        team1,
        team2,
        matchType,
      });
    }
  };

  const renderPlayerSelector = (
    label: string, 
    player: User | null, 
    key: 'p1' | 'p2' | 'p3' | 'p4'
  ) => (
    <TouchableOpacity onPress={() => openSelector(key)} style={styles.playerInput}>
      <Text style={[styles.playerText, !player && styles.placeholderText]}>
        {player ? player.displayName : `Select ${label}`}
      </Text>
      <Text style={styles.dropdownIcon}>▼</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Mode Selector */}
      <Card style={styles.modeCard}>
        <Text style={styles.sectionTitle}>Scoring Mode</Text>
        <View style={styles.modeSwitch}>
          <TouchableOpacity 
            style={[styles.modeBtn, scoreMode === 'live' && styles.activeModeBtn]} 
            onPress={() => setScoreMode('live')}
          >
            <Text style={[styles.modeText, scoreMode === 'live' && styles.activeModeText]}>Live Score</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeBtn, scoreMode === 'manual' && styles.activeModeBtn]} 
            onPress={() => setScoreMode('manual')}
          >
            <Text style={[styles.modeText, scoreMode === 'manual' && styles.activeModeText]}>Post-Match Entry</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Match Type */}
      <View style={styles.typeSelector}>
        <Text style={[styles.typeText, !isDoubles && styles.activeType]}>Singles</Text>
        <Switch value={isDoubles} onValueChange={setIsDoubles} trackColor={{ true: '#38A169' }} />
        <Text style={[styles.typeText, isDoubles && styles.activeType]}>Doubles</Text>
      </View>

      {/* Team Selection */}
      <View style={styles.section}>
        <Text style={styles.teamHeader}>Team 1</Text>
        {renderPlayerSelector('Player 1', p1, 'p1')}
        {isDoubles && renderPlayerSelector('Player 2', p2, 'p2')}
      </View>

      <View style={styles.vsContainer}>
        <Text style={styles.vsText}>VS</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.teamHeader}>Team 2</Text>
        {renderPlayerSelector(isDoubles ? 'Player 3' : 'Player 2', p3, 'p3')}
        {isDoubles && renderPlayerSelector('Player 4', p4, 'p4')}
      </View>

      {/* Match Config */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Match Length</Text>
        <View style={styles.modeSwitch}>
           <TouchableOpacity 
             style={[styles.modeBtn, matchType === 1 && styles.activeModeBtn]} 
             onPress={() => setMatchType(1)}
           >
             <Text style={[styles.modeText, matchType === 1 && styles.activeModeText]}>1 Set</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             style={[styles.modeBtn, matchType === 3 && styles.activeModeBtn]} 
             onPress={() => setMatchType(3)}
           >
             <Text style={[styles.modeText, matchType === 3 && styles.activeModeText]}>Best of 3</Text>
           </TouchableOpacity>
        </View>
      </View>

      <Button 
        title={scoreMode === 'live' ? "Start Match" : "Enter Scores"} 
        onPress={startMatch} 
        style={{ marginTop: 24, marginBottom: 40 }} 
      />

      {/* Player Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Player</Text>
          <Button title="Close" variant="outline" onPress={() => setModalVisible(false)} style={{ paddingVertical: 8 }} />
        </View>
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = [p1?.id, p2?.id, p3?.id, p4?.id].includes(item.id);
            return (
              <TouchableOpacity 
                style={[styles.memberItem, isSelected && styles.disabledItem]} 
                onPress={() => !isSelected && selectPlayer(item)}
                disabled={isSelected}
              >
                <View style={[styles.avatar, isSelected && styles.disabledAvatar]}>
                  <Text style={styles.avatarText}>{item.displayName.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={[styles.memberName, isSelected && styles.disabledText]}>{item.displayName}</Text>
                  <Text style={styles.memberEmail}>{item.email}</Text>
                </View>
                {isSelected && <Text style={styles.selectedLabel}>Selected</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F5F7FA',
  },
  modeCard: {
    marginBottom: 24,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#718096',
    marginBottom: 12,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeModeBtn: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeText: {
    fontWeight: '600',
    color: '#718096',
  },
  activeModeText: {
    color: '#2D3748',
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 12,
  },
  typeText: {
    fontSize: 16,
    color: '#A0AEC0',
    fontWeight: '600',
  },
  activeType: {
    color: '#2D3748',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
  },
  teamHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#718096',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  playerInput: {
    height: 50,
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerText: {
    fontSize: 16,
    color: '#2D3748',
  },
  placeholderText: {
    color: '#A0AEC0',
  },
  dropdownIcon: {
    color: '#A0AEC0',
    fontSize: 12,
  },
  vsContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  vsText: {
    fontWeight: '900',
    color: '#CBD5E0',
    fontSize: 24,
  },
  modalHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  avatar: {
    width: 40,
    height: 40,
    backgroundColor: '#38A169',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  memberEmail: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 'auto',
  },
  disabledItem: {
    backgroundColor: '#F7FAFC',
    opacity: 0.7,
  },
  disabledAvatar: {
    backgroundColor: '#CBD5E0',
  },
  disabledText: {
    color: '#A0AEC0',
  },
  selectedLabel: {
    marginLeft: 'auto',
    fontSize: 12,
    color: '#38A169',
    fontWeight: 'bold',
  },
});
