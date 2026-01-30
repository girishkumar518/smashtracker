import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Modal, FlatList, TouchableOpacity, ScrollView, Alert, StatusBar, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { useClub } from '../context/ClubContext';
import { useAuth } from '../context/AuthContext';
import { User } from '../models/types';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { findUserByEmail } from '../repositories/userRepository';
import { updateClub } from '../repositories/clubRepository';
import { arrayUnion } from 'firebase/firestore';
import { ensurePersonalClub, isPersonalClubId } from '../services/personalClubService';

export default function MatchSetupScreen() {
  const navigation = useNavigation<any>();
  const { activeClub, members, guests } = useClub();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  
  const styles = useMemo(() => createStyles(theme), [theme]);

  const allPlayers = useMemo(() => {
    const map = new Map<string, User>();
    [...members, ...guests].forEach(p => map.set(p.id, p));
    return Array.from(map.values());
  }, [members, guests]);

  const isFriendly = !!activeClub && isPersonalClubId(activeClub.id);
  const trustedMemberIds = useMemo(() => {
    return new Set(activeClub?.members.map(m => m.userId) || []);
  }, [activeClub?.members]);

  const [isDoubles, setIsDoubles] = useState(false);
  const [scoreMode, setScoreMode] = useState<'live' | 'manual'>('manual');
  const [matchType, setMatchType] = useState<1 | 3>(1); 
  
  // Game Settings
  const [pointsPerSet, setPointsPerSet] = useState<11 | 21 | 30>(21);
  const [goldenPoint, setGoldenPoint] = useState(false); 

  // Selected Players
  const [p1, setP1] = useState<User | null>(null); 
  const [p2, setP2] = useState<User | null>(null);
  const [p3, setP3] = useState<User | null>(null);
  const [p4, setP4] = useState<User | null>(null);

  // Auto-select current user as Player 1 when members load
  useEffect(() => {
    if (!p1 && user && members.length > 0) {
        const currentUser = members.find(m => m.id === user.id);
        if (currentUser) {
            setP1(currentUser);
        } else {
            // Fallback to first member if current user not found (unlikely)
            setP1(members[0]);
        }
    }
  }, [members, user, p1]);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'p1' | 'p2' | 'p3' | 'p4' | null>(null);
  const [guestName, setGuestName] = useState('');
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailQuery, setEmailQuery] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pendingSelection, setPendingSelection] = useState<{ user: User; addToPersonal: boolean } | null>(null);

  const openSelector = (playerKey: 'p1' | 'p2' | 'p3' | 'p4') => {
    setSelectingFor(playerKey);
    setModalVisible(true);
    setShowGuestInput(false);
    setGuestName('');
    setShowEmailInput(false);
    setEmailQuery('');
  };

  const selectPlayer = (user: User) => {
    if (selectingFor === 'p1') setP1(user);
    if (selectingFor === 'p2') setP2(user);
    if (selectingFor === 'p3') setP3(user);
    if (selectingFor === 'p4') setP4(user);
    setModalVisible(false);
    setSelectingFor(null);
  };

  const addPersonalMember = async (target: User) => {
    if (!user || !isFriendly) return;
    const personalClub = await ensurePersonalClub(user, activeClub?.name);
    const exists = personalClub.members.some(m => m.userId === target.id);
    if (exists) return;

    await updateClub(personalClub.id, {
      members: arrayUnion({ userId: target.id, role: 'player', joinedAt: Date.now() }) as any
    });
  };

  const finalizeSelection = async (target: User, addToPersonal: boolean) => {
    selectPlayer(target);
    if (addToPersonal) {
      try {
        await addPersonalMember(target);
      } catch (e) {
        console.warn('Failed to add personal member:', e);
      }
    }
  };

  const handleSelectUser = async (target: User, addToPersonal: boolean) => {
    if (!isFriendly || target.id.startsWith('guest_') || target.id === user?.id) {
      await finalizeSelection(target, addToPersonal);
      return;
    }

    if (!addToPersonal) {
      await finalizeSelection(target, false);
      return;
    }

    if (target.pin) {
      setPendingSelection({ user: target, addToPersonal: true });
      setPinInput('');
      setPinModalVisible(true);
      return;
    }

    Alert.alert(
      'Security Warning',
      'This player has no PIN set. Proceeding without verification.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: () => finalizeSelection(target, true) }]
    );
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

  const handleFindByEmail = async () => {
    if (!emailQuery.trim()) return;
    setEmailLoading(true);
    try {
      const result = await findUserByEmail(emailQuery.trim().toLowerCase());
      if (!result) {
        Alert.alert('Not Found', 'No user found with that email.');
        return;
      }

      if (result.id === user?.id) {
        Alert.alert('Info', 'You are already in the match.');
        return;
      }

      await handleSelectUser({ ...result.user, id: result.id }, true);
    } catch (e) {
      console.error('Email lookup failed:', e);
      Alert.alert('Error', 'Could not find user by email.');
    } finally {
      setEmailLoading(false);
    }
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

  const swapTeams = () => {
    // Swap Team 1 with Team 2
    const temp1 = p1;
    const temp2 = p2;
    setP1(p3);
    setP2(p4);
    setP3(temp1);
    setP4(temp2);
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
        <Text style={styles.screenSubtitle}>
          {activeClub ? activeClub.name : 'Select Club'}{isFriendly ? ' • Friendly' : ''}
        </Text>
        
        {/* Mode Selector - Richer Chips */}
        <View style={styles.richModeContainer}>
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
          
          <View style={styles.swapContainer}>
              <View style={styles.swapLine} />
              <TouchableOpacity style={styles.swapBtn} onPress={swapTeams}>
                  <MaterialCommunityIcons name="swap-vertical" size={20} color={theme.colors.textInverse} />
                  <Text style={styles.swapText}>SWAP TEAMS</Text>
              </TouchableOpacity>
              <View style={styles.swapLine} />
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
        <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
            <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
                <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Player</Text>
                <Button title="Close" variant="outline" onPress={() => setModalVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 16 }} />
                </View>
                
                <View style={{padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 12}}>
                    {!showGuestInput ? (
                      <TouchableOpacity style={[styles.richModeBtn, styles.modalActionBtn]} onPress={() => setShowGuestInput(true)}>
                            <MaterialCommunityIcons name="account-plus" size={24} color={theme.colors.primary} />
                            <Text style={[styles.richModeText, {color: theme.colors.primary}]}>Add Guest Player</Text>
                        </TouchableOpacity>
                    ) : (
                      <View style={{flexDirection: 'row', gap: 8}}>
                            <TextInput 
                                style={[
                                    styles.richModeBtn, 
                            styles.modalActionBtn,
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

                    {isFriendly && (
                      !showEmailInput ? (
                        <TouchableOpacity style={[styles.richModeBtn, styles.modalActionBtn]} onPress={() => setShowEmailInput(true)}>
                          <MaterialCommunityIcons name="email-search" size={24} color={theme.colors.primary} />
                          <Text style={[styles.richModeText, {color: theme.colors.primary}]}>Find Player by Email</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{flexDirection: 'row', gap: 8}}>
                          <TextInput
                            style={[
                              styles.richModeBtn,
                              styles.modalActionBtn,
                              {
                                flex: 1,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                paddingHorizontal: 12,
                                backgroundColor: theme.colors.surface,
                                color: theme.colors.textPrimary
                              }
                            ]}
                            placeholder="player@email.com"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={emailQuery}
                            onChangeText={setEmailQuery}
                            autoCapitalize="none"
                            keyboardType="email-address"
                          />
                          <Button title={emailLoading ? '...' : 'Find'} onPress={handleFindByEmail} style={{minWidth: 80}} />
                        </View>
                      )
                    )}
                </View>

                <FlatList
                data={allPlayers} // Combined list
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 40 }}
                ListEmptyComponent={
                    <View style={{padding: 32, alignItems: 'center', justifyContent: 'center'}}>
                        <MaterialCommunityIcons name="account-search" size={48} color={theme.colors.textSecondary} style={{opacity: 0.5, marginBottom: 12}} />
                        <Text style={{color: theme.colors.textSecondary, textAlign: 'center', fontSize: 16}}>No players found.</Text>
                        <Text style={{color: theme.colors.textSecondary, textAlign: 'center', fontSize: 14, marginTop: 4}}>Invite members to your club to see them here.</Text>
                    </View>
                }
                renderItem={({ item }) => {
                const isSelected = [p1?.id, p2?.id, p3?.id, p4?.id].includes(item.id);
                const isGuest = item.id.startsWith('guest_');
                return (
                  <TouchableOpacity 
                    style={[styles.memberItem, isSelected && styles.disabledItem]} 
                    onPress={() => !isSelected && handleSelectUser(item, false)}
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

        <Modal visible={pinModalVisible} animationType="slide" transparent onRequestClose={() => setPinModalVisible(false)}>
          <View style={styles.pinOverlay}>
            <View style={styles.pinModal}>
              <Text style={styles.pinTitle}>Enter Security PIN</Text>
              <Text style={styles.pinSubtitle}>Ask the player for their 4-digit PIN.</Text>
              <TextInput
                style={styles.pinInput}
                value={pinInput}
                onChangeText={setPinInput}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="••••"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <View style={{flexDirection: 'row', gap: 12, marginTop: 16}}>
                <Button title="Cancel" variant="outline" onPress={() => setPinModalVisible(false)} style={{flex: 1}} />
                <Button
                  title="Verify"
                  onPress={() => {
                    if (!pendingSelection) return;
                    if (pinInput === pendingSelection.user.pin) {
                      setPinModalVisible(false);
                      finalizeSelection(pendingSelection.user, pendingSelection.addToPersonal);
                    } else {
                      Alert.alert('Incorrect PIN', 'Please try again.');
                    }
                  }}
                  style={{flex: 1}}
                />
              </View>
            </View>
          </View>
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
    screenSubtitle: {
      marginTop: -12,
      marginBottom: 18,
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
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
    modalActionBtn: {
      flex: undefined,
      width: '100%',
      justifyContent: 'flex-start',
      paddingHorizontal: 14,
        backgroundColor: theme.colors.surfaceHighlight,
      borderWidth: 1,
      borderColor: theme.colors.border,
        minHeight: 48,
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
    pinOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    pinModal: {
      width: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
    },
    pinTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    pinSubtitle: {
      marginTop: 6,
      color: theme.colors.textSecondary,
      fontSize: 13,
    },
    pinInput: {
      marginTop: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      textAlign: 'center',
      fontSize: 18,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceHighlight,
      letterSpacing: 6,
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
  swapContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
      justifyContent: 'center',
  },
  swapLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
  },
  swapBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.textPrimary,
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 20,
      marginHorizontal: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
  },
  swapText: {
      color: theme.colors.textInverse,
      fontWeight: '700',
      fontSize: 10,
      marginLeft: 4,
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
