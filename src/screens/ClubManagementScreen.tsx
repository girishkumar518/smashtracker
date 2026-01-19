import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Share, Alert, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
    deleteClub
  } = useClub();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const { theme, isDark } = useTheme();

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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
       <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
       <ScrollView style={styles.container}>
          <Card style={styles.headerCard}>
              <Text style={styles.clubName}>{activeClub.name}</Text>
              <Text style={styles.sectionLabel}>Invite Code</Text>
              <TouchableOpacity onPress={shareInviteCode}>
                <Text style={styles.inviteCode}>{activeClub.inviteCode} <Text style={{fontSize: 14, color: '#3182CE'}}>(Share)</Text></Text>
              </TouchableOpacity>
              <View style={{ marginTop: 16 }}>
                 <Button title="Invite from Contacts" variant="outline" onPress={() => navigation.navigate('InviteMembers' as never)} />
              </View>
          </Card>

          {/* --- JOIN REQUESTS (ADMIN ONLY) --- */}
          {isAdmin && joinRequests && joinRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Join Requests ({joinRequests.length})</Text>
                <Card style={{padding: 0, backgroundColor: theme.colors.surface}}>
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
      </ScrollView>
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
  }
});
