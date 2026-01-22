import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Switch, Modal, FlatList, TouchableOpacity, ScrollView, Alert, StatusBar, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { useClub } from '../context/ClubContext';
import { User } from '../models/types';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MatchSetupScreen() {
  const navigation = useNavigation<any>();
  const { members, guests } = useClub();
  const { theme, isDark } = useTheme();
  
  const styles = useMemo(() => createStyles(theme), [theme]);

  const allPlayers = useMemo(() => [...members, ...guests], [members, guests]);

  const [isDoubles, setIsDoubles] = useState(false);
  const [scoreMode, setScoreMode] = useState<'live' | 'manual'>('live');
  const [matchType, setMatchType] = useState<1 | 3>(3); 
  
  // Game Settings
  const [pointsPerSet, setPointsPerSet] = useState<11 | 21 | 30>(21);
  const [goldenPoint, setGoldenPoint] = useState(false); 

  // Selected Players
  const [p1, setP1] = useState<User | null>(members[0]); 
  const [p2, setP2] = useState<User | null>(null);
  const [p3, setP3] = useState<User | null>(null);
  const [p4, setP4] = useState<User | null>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'p1' | 'p2' | 'p3' | 'p4' | null>(null);
  const [guestName, setGuestName] = useState('');
  const [showGuestInput, setShowGuestInput] = useState(false);

  const openSelector = (playerKey: 'p1' | 'p2' | 'p3' | 'p4') => {
    setSelectingFor(playerKey);
    setModalVisible(true);
    setShowGuestInput(false);
    setGuestName('');
  };

  const selectPlayer = (user: User) => {
    if (selectingFor === 'p1') setP1(user);
    if (selectingFor === 'p2') setP2(user);
    if (selectingFor === 'p3') setP3(user);
    if (selectingFor === 'p4') setP4(user);
    setModalVisible(false);
    setSelectingFor(null);
  };

  const addGuest = () => {
      if (!guestName.trim()) {
          Alert.alert("Name Required", "Please enter a name for the guest.");
          return;
      }
      const guestUser: User = {
          id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          displayName: guestName, 
          email: '', // Placeholder
      };
      selectPlayer(guestUser);
  };

  const getTeams = () => {
    const t1 = [{ id: p1?.id || 'p1', name: p1?.displayName || 'Player 1' }];
    if (isDoubles) t1.push({ id: p2?.id || 'p2', name: p2?.displayName || 'Player 2' });

    const t2 = [{ id: p3?.id || 'p3', name: p3?.displayName || (isDoubles ? 'Player 3' : 'Player 2') }];
    if (isDoubles) t2.push({ id: p4?.id || 'p4', name: p4?.displayName || 'Player 4' });

    return { team1: t1, team2: t2 };
  };

  const getGuestNamesMap = (t1: any[], t2: any[]) => {
      const map: Record<string, string> = {};
      [...t1, ...t2].forEach(p => {
          if (p.id.startsWith('guest_')) {
              map[p.id] = p.name;
          }
      });
      return map;
  };

  const startMatch = () => {
    if (isDoubles) {
      if (!p1 || !p2 || !p3 || !p4) {
        Alert.alert('Missing Players', 'Please select all 4 players for a doubles match.');
        return;
      }
    } else {
      if (!p1 || !p3) {
        Alert.alert('Missing Players', 'Please select both players for a singles match.');
        return;
      }
    }

    const { team1, team2 } = getTeams();
    const guestNames = getGuestNamesMap(team1, team2);

    if (scoreMode === 'live') {
      navigation.navigate('LiveScore', {
        isDoubles,
        team1,
        team2,
        matchType,
        pointsPerSet,
        goldenPoint,
        guestNames
      });
    } else {
      navigation.navigate('ManualScore', {
        isDoubles,
        team1,
        team2,
        matchType,
        guestNames
      });
    }
  };

  const renderPlayerSelector = (
    label: string, 
    player: User | null, 
    key: 'p1' | 'p2' | 'p3' | 'p4'
  ) => (
    <TouchableOpacity onPress={() => openSelector(key)} style={styles.playerCard}>
      <View style={[styles.miniAvatar, player ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surfaceHighlight }]}>
        {player ? (
            <Text style={styles.miniAvatarText}>{player.displayName.charAt(0)}</Text>
        ) : (
            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.textSecondary} />
        )}
      </View>
      <View style={{flex: 1}}>
        <Text style={[styles.playerText, !player && styles.placeholderText]}>
            {player ? player.displayName : label}
        </Text>
        {player && <Text style={styles.playerSubtext}>Rank {player.rank}</Text>}
      </View>
      <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Header */}
        <Text style={styles.screenTitle}>New Match</Text>
        
        {/* Mode Selector - Richer Chips */}
        <View style={styles.richModeContainer}>
            <TouchableOpacity 
                style={[styles.richModeBtn, scoreMode === 'live' && styles.richModeActive]} 
                onPress={() => setScoreMode('live')}>
                <MaterialCommunityIcons 
                    name="lightning-bolt" 
                    size={20} 
                    color={scoreMode === 'live' ? 'white' : theme.colors.textSecondary} 
                />
                <Text style={[styles.richModeText, scoreMode === 'live' && {color: 'white'}]}>Live Score</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[styles.richModeBtn, scoreMode === 'manual' && styles.richModeActive]} 
                onPress={() => setScoreMode('manual')}>
                 <MaterialCommunityIcons 
                    name="file-document-edit" 
                    size={20} 
                    color={scoreMode === 'manual' ? 'white' : theme.colors.textSecondary} 
                />
                <Text style={[styles.richModeText, scoreMode === 'manual' && {color: 'white'}]}>Manual Entry</Text>
            </TouchableOpacity>
        </View>

        {/* Singles / Doubles Toggle - Big Blocks */}
        <View style={styles.formatContainer}>
            <TouchableOpacity 
                style={[styles.formatBox, !isDoubles && styles.formatBoxActive]} 
                onPress={() => setIsDoubles(false)}
            >
                <MaterialCommunityIcons name="account" size={32} color={!isDoubles ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.formatText, !isDoubles && styles.formatTextActive]}>Singles</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                 style={[styles.formatBox, isDoubles && styles.formatBoxActive]} 
                 onPress={() => setIsDoubles(true)}
            >
                <MaterialCommunityIcons name="account-group" size={32} color={isDoubles ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.formatText, isDoubles && styles.formatTextActive]}>Doubles</Text>
            </TouchableOpacity>
        </View>

        {/* Player Selection Area */}
        <View style={styles.matchupContainer}>
          <View style={styles.teamBlock}>
             <Text style={styles.teamLabel}>TEAM 1</Text>
             {renderPlayerSelector('Player 1', p1, 'p1')}
             {isDoubles && renderPlayerSelector('Partner', p2, 'p2')}
          </View>
          
          <View style={styles.vsBadge}>
              <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={styles.teamBlock}>
             <Text style={styles.teamLabel}>TEAM 2</Text>
             {renderPlayerSelector('Opponent 1', p3, 'p3')}
             {isDoubles && renderPlayerSelector('Opponent 2', p4, 'p4')}
          </View>
        </View>

        {/* Rules Config - Collapsible Look */}
        <Card style={styles.settingsCard}>
          <View style={styles.settingRow}>
             <View>
                 <Text style={styles.settingLabel}>Sets</Text>
                 <Text style={styles.settingSub}>{matchType === 3 ? "Best of 3" : "Single Set"}</Text>
             </View>
             <View style={styles.pillSelector}>
                 <TouchableOpacity onPress={() => setMatchType(1)} style={[styles.pill, matchType === 1 && styles.pillActive]}>
                     <Text style={[styles.pillText, matchType === 1 && styles.pillTextActive]}>1</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => setMatchType(3)} style={[styles.pill, matchType === 3 && styles.pillActive]}>
                     <Text style={[styles.pillText, matchType === 3 && styles.pillTextActive]}>3</Text>
                 </TouchableOpacity>
             </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
             <View>
                 <Text style={styles.settingLabel}>Points</Text>
                 <Text style={styles.settingSub}>Target per set</Text>
             </View>
             <View style={styles.pillSelector}>
                 {[11, 21, 30].map(pts => (
                     <TouchableOpacity key={pts} onPress={() => setPointsPerSet(pts as any)} style={[styles.pill, pointsPerSet === pts && styles.pillActive]}>
                         <Text style={[styles.pillText, pointsPerSet === pts && styles.pillTextActive]}>{pts}</Text>
                     </TouchableOpacity>
                 ))}
             </View>
          </View>

          <View style={styles.divider} />

          <View style={[styles.settingRow, {borderBottomWidth: 0}]}>
             <View>
                 <Text style={styles.settingLabel}>Golden Point</Text>
                 <Text style={styles.settingSub}>No deuce at game point</Text>
             </View>
             <Switch 
                value={goldenPoint} 
                onValueChange={setGoldenPoint} 
                trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceHighlight }} 
             />
          </View>
        </Card>

        <Button 
          title="Start Match" 
          onPress={startMatch} 
          style={styles.startBtn}
          textStyle={{ fontSize: 18 }}
        />

        {/* Player Selection Modal */}
        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
            <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
                <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Player</Text>
                <Button title="Close" variant="outline" onPress={() => setModalVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 16 }} />
                </View>
                
                <View style={{padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border}}>
                    {!showGuestInput ? (
                        <TouchableOpacity style={styles.richModeBtn} onPress={() => setShowGuestInput(true)}>
                            <MaterialCommunityIcons name="account-plus" size={24} color={theme.colors.primary} />
                            <Text style={[styles.richModeText, {color: theme.colors.primary}]}>Add Guest Player</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{flexDirection: 'row', gap: 8}}>
                            <TextInput 
                                style={[
                                    styles.richModeBtn, 
                                    { 
                                        flex: 1, 
                                        borderWidth: 1, 
                                        borderColor: theme.colors.border, 
                                        paddingHorizontal: 12, 
                                        backgroundColor: theme.colors.surface,
                                        color: theme.colors.textPrimary 
                                    }
                                ]}
                                placeholder="Guest Name"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={guestName}
                                onChangeText={setGuestName}
                                autoFocus
                            />
                            <Button title="Add" onPress={addGuest} style={{minWidth: 80}} />
                        </View>
                    )}
                </View>

                <FlatList
                data={allPlayers} // Combined list
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => {
                const isSelected = [p1?.id, p2?.id, p3?.id, p4?.id].includes(item.id);
                const isGuest = item.id.startsWith('guest_');
                return (
                  <TouchableOpacity 
                    style={[styles.memberItem, isSelected && styles.disabledItem]} 
                    onPress={() => !isSelected && selectPlayer(item)}
                    disabled={isSelected}
                  >
                    <View style={[styles.avatar, isSelected && styles.disabledAvatar, isGuest && { backgroundColor: theme.colors.secondary }]}>
                      <Text style={styles.avatarText}>{item.displayName.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={[styles.memberName, isSelected && styles.disabledText]}>
                          {item.displayName} {isGuest ? '(Guest)' : ''}
                      </Text>
                      {!isGuest ? (
                          <Text style={styles.memberEmail}>Rank: {item.rank || '-'}</Text>
                      ) : (
                          <Text style={styles.memberEmail}>Guest Player</Text>
                      )}
                    </View>
                    {isSelected && <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.primary} style={styles.selectedIcon} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 60,
  },
  screenTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginBottom: 20,
  },
  richModeContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 6,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
  },
  richModeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      gap: 8,
  },
  richModeActive: {
      backgroundColor: theme.colors.primary,
  },
  richModeText: {
      fontWeight: 'bold',
      color: theme.colors.textSecondary,
      fontSize: 14,
  },
  formatContainer: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 32,
  },
  formatBox: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
  },
  formatBoxActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.type === 'dark' ? '#1a202c' : '#F0FFF4',
  },
  formatText: {
      marginTop: 8,
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textSecondary,
  },
  formatTextActive: {
      color: theme.colors.primary,
      fontWeight: '800',
  },
  matchupContainer: {
      marginBottom: 32,
  },
  teamBlock: {
      gap: 12,
  },
  teamLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
  },
  vsBadge: {
      alignSelf: 'center',
      backgroundColor: theme.colors.surface,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 16,
      borderWidth: 4,
      borderColor: theme.colors.background,
      zIndex: 10,
      marginTop: -10,
      marginBottom: -10,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      elevation: 4,
  },
  vsText: {
      fontWeight: '900',
      fontSize: 12,
      color: theme.colors.textPrimary,
  },
  playerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  miniAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
  },
  miniAvatarText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
  },
  playerText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
  },
  playerSubtext: {
      fontSize: 12,
      color: theme.colors.textSecondary,
  },
  placeholderText: {
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
  },
  settingsCard: {
      padding: 0,
      overflow: 'hidden',
      marginBottom: 32,
      borderRadius: 16,
  },
  settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
  },
  settingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
  },
  settingSub: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
  },
  divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginHorizontal: 16,
  },
  pillSelector: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceHighlight,
      borderRadius: 8,
      padding: 4,
      gap: 4,
  },
  pill: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
  },
  pillActive: {
      backgroundColor: theme.colors.surface,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
  },
  pillText: {
      fontWeight: '600',
      color: theme.colors.textSecondary,
      fontSize: 14,
  },
  pillTextActive: {
      color: theme.colors.textPrimary,
  },
  startBtn: {
      borderRadius: 16,
      paddingVertical: 18,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
      backgroundColor: theme.colors.primary,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  memberEmail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  disabledItem: {
    backgroundColor: theme.colors.surfaceHighlight,
    opacity: 0.6,
  },
  disabledAvatar: {
    backgroundColor: theme.colors.border,
  },
  disabledText: {
    color: theme.colors.textSecondary,
  },
  selectedIcon: {
      marginLeft: 'auto',
  },
});
