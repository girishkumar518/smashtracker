import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Share, Alert, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useClub } from '../context/ClubContext';
import { useAuth } from '../context/AuthContext'; 
import Card from '../components/Card';
import Button from '../components/Button';

export default function ClubManagementScreen() {
  const { 
    activeClub, 
    seededMembers, 
    joinRequests, 
    approveRequest, 
    rejectRequest, 
    removeMember,
    deleteClub
  } = useClub();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Simple admin check: if user is owner or has admin role in members array
  const isOwner = activeClub?.ownerId === user?.id;
  const isAdmin = isOwner || activeClub?.members.find(m => m.userId === user?.id)?.role === 'admin';

  if (!activeClub) {
    return (
      <View style={styles.container}>
        <Text>No active club found.</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

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

  const renderMember = ({ item }: { item: any }) => {
    const roleBadge = getRoleLabel(item.id);
    return (
    <TouchableOpacity style={styles.memberRow} onPress={() => setSelectedMember(item)}>
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
       <View style={styles.memberAvatar}>
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
    <ScrollView style={styles.container}>
       <Card style={styles.headerCard}>
          <Text style={styles.clubName}>{activeClub.name}</Text>
          <Text style={styles.sectionLabel}>Invite Code</Text>
          <TouchableOpacity onPress={shareInviteCode}>
            <Text style={styles.inviteCode}>{activeClub.inviteCode} <Text style={{fontSize: 14, color: '#3182CE'}}>(Share)</Text></Text>
          </TouchableOpacity>
       </Card>

      {/* --- JOIN REQUESTS (ADMIN ONLY) --- */}
      {isAdmin && joinRequests && joinRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Join Requests ({joinRequests.length})</Text>
            <Card style={{padding: 0}}>
                <FlatList
                    data={joinRequests}
                    renderItem={renderRequest}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            </Card>
          </View>
      )}

      {/* --- MEMBERS LIST --- */}
      <View style={styles.section}>
         <Text style={styles.sectionTitle}>Members ({seededMembers.length})</Text>
         <Card style={{padding: 0}}>
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
          <View style={{ marginTop: 20 }}>
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

      <View style={{ marginBottom: 40 }}>
           {/* Bottom Spacer */}
      </View>

      {/* --- MEMBER DETAIL MODAL --- */}
      {selectedMember && (
        <Modal transparent animationType="fade" visible={!!selectedMember}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedMember(null)}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{selectedMember.displayName}</Text>
                    <Text style={{marginBottom: 16}}>Rank: #{selectedMember.rank} | Points: {selectedMember.points}</Text>
                    
                    {/* Show Remove Button ONLY if current user is Admin AND selected user is not themself */}
                    {isAdmin && selectedMember.id !== user?.id && (
                        <Button 
                            title="Remove from Club" 
                            onPress={() => handleRemoveMember(selectedMember.id, selectedMember.displayName)}
                            style={{backgroundColor: '#E53E3E', marginBottom: 12}}
                        />
                    )}
                    <Button 
                        title="Close" 
                        onPress={() => setSelectedMember(null)} 
                        variant="outline" 
                    />
                </View>
            </TouchableOpacity>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    padding: 16,
  },
  headerCard: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 32,
  },
  clubName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inviteCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3182CE',
    letterSpacing: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 12,
    marginLeft: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A5568',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  memberEmail: {
    fontSize: 12,
    color: '#718096',
  },
  memberRole: {
    fontSize: 14,
    color: '#4A5568',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  actionBtnSmall: {
      width: 32, 
      height: 32, 
      borderRadius: 16, 
      alignItems: 'center', 
      justifyContent: 'center'
  },
  actionBtnText: {
      color: 'white', 
      fontWeight: 'bold'
  },
  modalOverlay: {
      flex: 1, 
      backgroundColor: 'rgba(0,0,0,0.5)', 
      justifyContent: 'center', 
      padding: 24
  },
  modalContent: {
      backgroundColor: 'white', 
      borderRadius: 12, 
      padding: 24, 
      alignItems: 'center',
      width: '100%',
      maxWidth: 300
  },
  modalTitle: {
      fontSize: 20, 
      fontWeight: 'bold', 
      marginBottom: 8
  },
  badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      marginLeft: 8,
  },
  badgeText: {
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold',
  },
  dangerText: {
      color: '#E53E3E',
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
  }
});