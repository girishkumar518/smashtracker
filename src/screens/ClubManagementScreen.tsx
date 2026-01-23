import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Share, Alert, TouchableOpacity, ScrollView, Platform, StatusBar, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useClub } from '../context/ClubContext';
import { useAuth } from '../context/AuthContext'; 
import Card from '../components/Card';
import Button from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';

export default function ClubManagementScreen() {
  const { 
    activeClub, 
    seededMembers, 
    joinRequests, 
    approveRequest, 
    rejectRequest, 
    removeMember,
    deleteClub,
    leaveClub,
    guests,
    updateGuestToUser,
    addGuestPlayer,
    removeGuestPlayer
  } = useClub();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const { theme, isDark } = useTheme();

  // Guest Merge State
  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);

  // Add Guest State
  const [addGuestModalVisible, setAddGuestModalVisible] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Simple admin check: if user is owner or has admin role in members array
  const isOwner = activeClub?.ownerId === user?.id;
  const isAdmin = isOwner || activeClub?.members.find(m => m.userId === user?.id)?.role === 'admin';

  if (!activeClub) {
    return (
      <View style={styles.container}>
        <Text style={{color: theme.colors.textPrimary}}>No active club found.</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const copyInviteCode = async () => {
    await Clipboard.setStringAsync(activeClub.inviteCode);
    Alert.alert('Copied', 'Invite code copied to clipboard!');
  };

  const shareInviteCode = async () => {
    try {
      await Share.share({
        message: `Join my badminton club "${activeClub.name}" on SmashTracker! Use code: ${activeClub.inviteCode}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share invite code.');
    }
  };

  const handleDeleteClub = () => {
      if (!isOwner || !activeClub) return;

      if (Platform.OS === 'web') {
        if (window.confirm("Are you sure you want to permanently delete this club? ALL MATCH HISTORY WILL BE LOST. This action cannot be undone.")) {
             deleteClub(activeClub.id)
                .then(() => navigation.goBack())
                .catch((e) => alert("Failed to delete club: " + e.message));
        }
        return;
      }

      Alert.alert(
          "Delete Club",
          "Are you sure you want to permanently delete this club? ALL MATCH HISTORY WILL BE LOST. This action cannot be undone.",
          [
              { text: "Cancel", style: "cancel" },
              { 
                  text: "Delete Club", 
                  style: "destructive",
                  onPress: async () => {
                      try {
                          await deleteClub(activeClub.id);
                          navigation.goBack();
                      } catch (e) {
                          Alert.alert("Error", "Failed to delete club.");
                      }
                  }
              }
          ]
      );
  };

  const handleLeaveClub = () => {
    if (!activeClub) return;

    const confirmText = "Are you sure you want to leave this club? You will need an invite code to rejoin.";
    
    if (Platform.OS === 'web') {
        if (window.confirm(confirmText)) {
            leaveClub(activeClub.id)
                .then(() => navigation.goBack())
                .catch((e: any) => alert(e.message));
        }
        return;
    }

    Alert.alert(
        "Leave Club",
        confirmText,
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Leave", 
                style: "destructive",
                onPress: async () => {
                    try {
                        await leaveClub(activeClub.id);
                        navigation.goBack();
                    } catch (e: any) {
                        Alert.alert("Error", e.message || "Failed to leave club");
                    }
                }
            }
        ]
    );
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!isAdmin) return;
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${memberName}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: () => {
              removeMember(memberId);
              setSelectedMember(null);
          } 
        }
      ]
    );
  };

  const getRoleLabel = (userId: string) => {
      if (activeClub?.ownerId === userId) return { text: 'Owner', color: '#805AD5' };
      const member = activeClub?.members.find(m => m.userId === userId);
      if (member?.role === 'admin') return { text: 'Admin', color: '#3182CE' };
      return null;
  };

  const handleMerge = async (targetUser: any) => {
      if (!selectedGuest) return;
      
      Alert.alert(
          "Confirm Merge", 
          `Merge all history of "${selectedGuest.displayName}" into "${targetUser.displayName}"?\n\nThis will update all past matches. This cannot be undone.`,
          [
              { text: "Cancel", style: "cancel" },
              { 
                  text: "Merge", 
                  style: "destructive", 
                  onPress: async () => {
                      try {
                          await updateGuestToUser(selectedGuest.id, targetUser.id);
                          setMergeModalVisible(false);
                          setSelectedGuest(null);
                          Alert.alert("Success", "Guest history merged!");
                      } catch (e: any) {
                          Alert.alert("Error", "Failed to merge.");
                      }
                  }
              }
          ]
      );
  };

  const handleDeleteGuest = (guest: any) => {
    Alert.alert(
        "Delete Guest", 
        `Are you sure you want to delete "${guest.displayName}"?\n\nThis will NOT delete their match history from matches, but they will be removed from your player list.`,
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Delete", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        await removeGuestPlayer(guest.id);
                        Alert.alert("Success", "Guest removed.");
                    } catch (e: any) {
                        Alert.alert("Error", "Failed to remove guest.");
                    }
                }
            }
        ]
    );
  };

  const renderGuest = ({ item }: { item: any }) => (
    <View style={styles.memberRow}>
       <View style={[styles.memberAvatar, { backgroundColor: '#ED8936' }]}>
          <Text style={styles.avatarText}>{item.displayName ? item.displayName.charAt(0) : 'G'}</Text>
       </View>
       <View style={{ flex: 1 }}>
         <Text style={styles.memberName}>{item.displayName}</Text>
         {(item.displayName === 'Unknown User' || item.displayName === 'Loading...') && (
            <Text style={{fontSize: 10, color: theme.colors.error}}>
                (ID: {item.id}) - Check Firestore Rules
            </Text>
         )}
         <Text style={styles.memberEmail}>{item.email || 'No Email'}</Text>
       </View>
       <View style={{flexDirection: 'row', alignItems: 'center'}}>
           <Button 
                title="Link" 
                size="small" 
                variant="outline"
                style={{height: 32, paddingVertical: 0, marginRight: 8}}
                textStyle={{fontSize: 12}}
                onPress={() => {
                    setSelectedGuest(item);
                    setMergeModalVisible(true);
                }} 
           />
           <Button 
                title="✕" 
                size="small" 
                variant="danger"
                style={{height: 32, width: 32, paddingHorizontal: 0, paddingVertical: 0, alignItems: 'center', justifyContent: 'center'}}
                textStyle={{fontSize: 14, fontWeight: 'bold'}}
                onPress={() => handleDeleteGuest(item)} 
           />
       </View>
    </View>
  );

  const renderMember = ({ item }: { item: any }) => {
    const roleBadge = getRoleLabel(item.id);
    return (
    <TouchableOpacity style={styles.memberRow} onPress={() => isAdmin && handleRemoveMember(item.id, item.displayName)}>
       <View style={styles.memberAvatar}>
          <Text style={styles.avatarText}>{item.displayName ? item.displayName.charAt(0) : '?'}</Text>
       </View>
       <View style={{ flex: 1 }}>
         <View style={{flexDirection: 'row', alignItems: 'center'}}>
             <Text style={styles.memberName}>{item.displayName || 'Unknown User'}</Text>
             {roleBadge && (
                 <View style={[styles.badge, { backgroundColor: roleBadge.color }]}>
                     <Text style={styles.badgeText}>{roleBadge.text}</Text>
                 </View>
             )}
         </View>
         <Text style={styles.memberEmail}>Seed #{item.rank} - {item.points} pts</Text>
       </View>
       <View>
          <Text style={styles.memberRole}>{item.matchesPlayed} Matches</Text> 
       </View>
    </TouchableOpacity>
    );
  };

  const renderRequest = ({ item }: { item: any }) => (
    <View style={styles.memberRow}>
       <View style={[styles.memberAvatar, { backgroundColor: '#ED8936' }]}>
          <Text style={styles.avatarText}>{item.displayName ? item.displayName.charAt(0) : '?'}</Text>
       </View>
       <View style={{ flex: 1 }}>
         <Text style={styles.memberName}>{item.displayName || 'Unknown User'}</Text>
         <Text style={styles.memberEmail}>{item.email}</Text>
         <Text style={{fontSize: 10, color: 'orange'}}>Requesting</Text>
       </View>
       <View style={{flexDirection: 'row'}}>
          <TouchableOpacity onPress={() => rejectRequest(item.id)} style={[styles.actionBtnSmall, {backgroundColor: '#E53E3E', marginRight: 8}]}>
              <Text style={styles.actionBtnText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => approveRequest(item.id)} style={[styles.actionBtnSmall, {backgroundColor: '#38A169'}]}>
              <Text style={styles.actionBtnText}>✓</Text>
          </TouchableOpacity>
       </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
       <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
       <ScrollView style={styles.container}>
          <Card style={styles.headerCard}>
              <Text style={styles.clubName}>{activeClub.name}</Text>
              <Text style={styles.sectionLabel}>Invite Code</Text>
              
              <TouchableOpacity onPress={copyInviteCode} style={{flexDirection: 'row', alignItems: 'center', marginTop: 8}}>
                <Text style={styles.inviteCode}>{activeClub.inviteCode}</Text>
                <View style={{marginLeft: 12, padding: 8, backgroundColor: theme.colors.surfaceHighlight, borderRadius: 8}}>
                    <Text style={{fontSize: 14, color: theme.colors.primary, fontWeight: 'bold'}}>Copy</Text>
                </View>
              </TouchableOpacity>

              <View style={{ marginTop: 24, gap: 12 }}>
                 <Button title="Invite from Contacts" onPress={() => navigation.navigate('InviteMembers' as never)} />
                 <Button title="Share Code" variant="outline" onPress={shareInviteCode} />
              </View>
          </Card>

          {/* --- JOIN REQUESTS (ADMIN ONLY) --- */}
          {isAdmin && (
            (joinRequests && joinRequests.length > 0) || (activeClub.joinRequests && activeClub.joinRequests.length > 0)
          ) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Join Requests ({activeClub.joinRequests?.length || 0})</Text>
                <Card style={{padding: 0, backgroundColor: theme.colors.surface}}>
                    <FlatList
                        data={activeClub.joinRequests || []}
                        renderItem={({ item: requestId }) => {
                             // Try to find the user object, or fallback
                             const userObj = joinRequests?.find(u => u.id === requestId) || { 
                                 id: requestId, 
                                 displayName: 'Loading...', 
                                 email: 'Fetching profile...' 
                             };
                             return renderRequest({ item: userObj });
                        }}
                        keyExtractor={id => id}
                        scrollEnabled={false}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                    />
                </Card>
              </View>
          )}

          {/* --- GUESTS LIST (ADMIN ONLY) --- */}
          {isAdmin && (
             <View style={styles.section}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                    <Text style={[styles.sectionTitle, {marginBottom: 0}]}>Guest Players ({guests.length})</Text>
                    <Button 
                        title="Add Guest" 
                        size="small" 
                        onPress={() => setAddGuestModalVisible(true)} 
                        style={{paddingVertical: 4, height: 30}}
                        textStyle={{fontSize: 12}}
                    />
                </View>
                {guests.length > 0 ? (
                    <Card style={{padding: 0, backgroundColor: theme.colors.surface}}>
                        <FlatList
                            data={guests}
                            renderItem={renderGuest}
                            keyExtractor={item => item.id}
                            scrollEnabled={false}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                        />
                    </Card>
                ): (
                    <Text style={{color: theme.colors.textSecondary, fontStyle: 'italic', marginLeft: 8}}>No guest players found.</Text>
                )}
             </View>
          )}

          {/* --- MEMBERS LIST --- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Members ({seededMembers.length})</Text>
            <Card style={{padding: 0, backgroundColor: theme.colors.surface}}>
                <FlatList
                    data={seededMembers}
                    renderItem={renderMember}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            </Card>
          </View>

          {isOwner && (
              <View style={{ marginTop: 20, marginBottom: 40 }}>
                  <Button 
                    title="Delete Club" 
                    onPress={handleDeleteClub}
                    style={{ backgroundColor: '#E53E3E' }}
                  />
                  <Text style={styles.dangerText}>
                      Warning: Deleting the club removes all data and matches permanently.
                  </Text>
              </View>
          )}

          {!isOwner && activeClub && (
              <View style={{ marginTop: 20, marginBottom: 40 }}>
                  <Button 
                    title="Leave Club" 
                    onPress={handleLeaveClub}
                    style={{ backgroundColor: '#E53E3E' }}
                  />
                  <Text style={styles.dangerText}>
                      You will lose access to this club's history and match entry.
                  </Text>
              </View>
          )}
      </ScrollView>

      {/* Merge Modal */}
      <Modal visible={mergeModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMergeModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Link "{selectedGuest?.displayName}" to...</Text>
                <Button title="Close" variant="outline" onPress={() => setMergeModalVisible(false)} style={{ paddingVertical: 6, paddingHorizontal: 12 }} textStyle={{fontSize: 14}} />
            </View>
            <View style={{padding: 16, backgroundColor: theme.colors.surfaceHighlight || '#F7FAFC'}}>
                <Text style={{color: theme.colors.textSecondary, fontSize: 13}}>
                    Select a registered member to take ownership of this guest's match history. The guest name will be replaced by the member in all past matches.
                </Text>
            </View>
            <FlatList
                data={seededMembers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.modalItem} 
                        onPress={() => handleMerge(item)}
                    >
                        <View style={[styles.memberAvatar, {width: 40, height: 40, marginRight: 12}]}>
                            <Text style={styles.avatarText}>{item.displayName.charAt(0)}</Text>
                        </View>
                        <Text style={styles.memberName}>{item.displayName}</Text>
                    </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
      </Modal>

      {/* Add Guest Modal */}
      {Platform.OS === 'web' ? (
        addGuestModalVisible && (
            <View style={[styles.modalOverlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }]}>
                 <View style={[styles.dialogContainer, { backgroundColor: theme.colors.surface }]}>
                    <Text style={styles.dialogTitle}>Add New Guest</Text>
                    <Text style={styles.dialogDescription}>Create a guest player to use in matches.</Text>
                    
                    <TextInput
                        style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, outlineStyle: 'none' } as any]}
                        placeholder="Guest Name (e.g. John Doe)"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={newGuestName}
                        onChangeText={setNewGuestName}
                        autoFocus
                    />

                    <View style={styles.dialogActions}>
                        <Button 
                            title="Cancel" 
                            variant="outline" 
                            onPress={() => {
                                setAddGuestModalVisible(false);
                                setNewGuestName('');
                            }}
                            style={{flex: 1, marginRight: 8}}
                        />
                        <Button 
                            title="Add" 
                            onPress={async () => {
                                if(!newGuestName.trim()) return;
                                try {
                                    await addGuestPlayer(newGuestName);
                                    setAddGuestModalVisible(false);
                                    setNewGuestName('');
                                } catch(e) {
                                    Alert.alert("Error", "Failed to add guest.");
                                }
                            }}
                            style={{flex: 1}}
                        />
                    </View>
                </View>
            </View>
        )
      ) : (
      <Modal visible={addGuestModalVisible} transparent animationType="fade" onRequestClose={() => setAddGuestModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.dialogContainer, { backgroundColor: theme.colors.surface }]}>
                <Text style={styles.dialogTitle}>Add New Guest</Text>
                <Text style={styles.dialogDescription}>Create a guest player to use in matches.</Text>
                
                <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    placeholder="Guest Name (e.g. John Doe)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={newGuestName}
                    onChangeText={setNewGuestName}
                    autoFocus
                />

                <View style={styles.dialogActions}>
                    <Button 
                        title="Cancel" 
                        variant="outline" 
                        onPress={() => {
                            setAddGuestModalVisible(false);
                            setNewGuestName('');
                        }}
                        style={{flex: 1, marginRight: 8}}
                    />
                    <Button 
                        title="Add" 
                        onPress={async () => {
                            if(!newGuestName.trim()) return;
                            try {
                                await addGuestPlayer(newGuestName);
                                setAddGuestModalVisible(false);
                                setNewGuestName('');
                            } catch(e) {
                                Alert.alert("Error", "Failed to add guest.");
                            }
                        }}
                        style={{flex: 1}}
                    />
                </View>
            </View>
        </View>
      </Modal>
      )}

    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    padding: 16,
  },
  headerCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: theme.colors.surface,
  },
  clubName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inviteCode: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    marginTop: 4,
    letterSpacing: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: theme.colors.textSecondary,
    paddingLeft: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
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
    color: theme.colors.textPrimary,
  },
  memberEmail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  memberRole: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  dangerText: {
    color: '#E53E3E',
    marginTop: 12,
    textAlign: 'center',
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20
  },
  dialogContainer: {
      borderRadius: 12,
      padding: 20,
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
  },
  dialogTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
      color: theme.colors.textPrimary
  },
  dialogDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 16
  },
  input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 20
  },
  dialogActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end'
  }
});
