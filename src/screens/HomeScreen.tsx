import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, SafeAreaView, StatusBar, Platform, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext'; // Import useClub
import Button from '../components/Button';
import Card from '../components/Card';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { activeClub, matches, members, pendingClubs, allUsers } = useClub();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  const getPlayerName = (id: string) => {
    // Try to find in allUsers (includes history), fallback to members, then Unknown
    const u = allUsers?.find(u => u.id === id) || members.find(m => m.id === id);
    return u ? u.displayName : 'Unknown';
  };

  // Calculate Stats
  const stats = useMemo(() => {
    if (!matches || !matches.length || !user) return { played: 0, winRate: 0, wins: 0, losses: 0, bestPartner: null };

    let played = 0;
    let wins = 0;
    const partnerStats: {[key: string]: {played: number, wins: number}} = {};

    matches.forEach(m => {
      const userId = user.id;
      const inTeam1 = m.team1.includes(userId);
      const inTeam2 = m.team2.includes(userId);

      if (inTeam1 || inTeam2) {
        played++;
        const won = (inTeam1 && m.winnerTeam === 1) || (inTeam2 && m.winnerTeam === 2);
        if (won) wins++;
        
        // Partner logic
        let partnerId = '';
        if (inTeam1 && m.team1.length > 1) {
            partnerId = m.team1.find(id => id !== userId) || '';
        } else if (inTeam2 && m.team2.length > 1) {
            partnerId = m.team2.find(id => id !== userId) || '';
        }

        if (partnerId) {
            if (!partnerStats[partnerId]) partnerStats[partnerId] = { played: 0, wins: 0 };
            partnerStats[partnerId].played++;
            if (won) partnerStats[partnerId].wins++;
        }
      }
    });

    let bestPartner = null;
    let maxRate = -1;

    Object.keys(partnerStats).forEach(id => {
        const s = partnerStats[id];
        const rate = s.wins / s.played;
        if (rate > maxRate || (rate === maxRate && s.played > (bestPartner?.played || 0))) {
            maxRate = rate;
            bestPartner = { name: getPlayerName(id), ...s, rate: Math.round(rate * 100) };
        }
    });

    return {
      played,
      winRate: played > 0 ? Math.round((wins / played) * 100) : 0,
      wins,
      losses: played - wins,
      bestPartner
    };
  }, [matches, user, members, allUsers]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styles.userName}>{user?.displayName || 'Player'}</Text>
                <Text style={{marginLeft: 8, fontSize: 12, color: '#3182CE'}}>Edit</Text>
             </View>
          </TouchableOpacity>
        </View>
        <Button 
          title="Log Out" 
          onPress={signOut} 
          variant="outline" 
          style={{ paddingVertical: 8, paddingHorizontal: 16 }} 
        />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {pendingClubs && pendingClubs.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Card style={{ backgroundColor: '#FFFBEB', borderColor: '#F6E05E', borderWidth: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#B7791F', marginBottom: 8 }}>
                 Requests Pending
              </Text>
              {pendingClubs.map(club => (
                <View key={club.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                   <Text style={{ color: '#744210' }}>{club.name}</Text>
                   <Text style={{ color: '#744210', fontStyle: 'italic' }}>Waiting for approval</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {!activeClub ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Club Found</Text>
            <Text style={styles.emptyText}>
              You are not currently a member of any badminton club.
              Create a new club to invite friends, or join an existing one.
            </Text>
            
            <View style={styles.actionButtons}>
              <Button 
                title="Create a Club" 
                onPress={() => navigation.navigate('CreateClub')} 
                style={styles.actionBtn}
              />
              <Button 
                title="Join a Club" 
                variant="secondary"
                onPress={() => {
                  console.log('Navigating to JoinClub');
                  navigation.navigate('JoinClub');
                }}
                style={styles.actionBtn}
              />
            </View>
          </View>
        ) : (
          <View>
            <Card>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <View>
                    <Text style={styles.clubName}>{activeClub.name}</Text>
                    <Text style={styles.clubRole}>Role: Admin</Text>
                    <Text style={styles.clubCode}>Invite Code: {activeClub.inviteCode}</Text>
                  </View>
                  <Button 
                    title="Manage" 
                    variant="outline"
                    onPress={() => navigation.navigate('ClubManagement')}
                    style={{ paddingVertical: 8, paddingHorizontal: 16 }}
                  />
              </View>
            </Card>

            <View style={styles.dashboardGrid}>
              <Card style={styles.dashboardItem}>
                <Text style={styles.statNumber}>{stats.played}</Text>
                <Text style={styles.statLabel}>Matches Played</Text>
              </Card>
              <Card style={styles.dashboardItem}>
                <Text style={styles.statNumber}>{stats.winRate}%</Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </Card>
            </View>

            {stats.bestPartner && (
              <Card style={{ marginTop: 16, padding: 16 }}>
                 <Text style={styles.sectionTitle}>Best Partner</Text>
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                     <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{stats.bestPartner.name}</Text>
                     <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#38A169' }}>{stats.bestPartner.rate}% Win Rate</Text>
                        <Text style={{ fontSize: 12, color: '#718096' }}>with {stats.bestPartner.played} matches</Text>
                     </View>
                 </View>
              </Card>
            )}
            

              {matches && matches.length > 0 && (
              <View style={{ marginTop: 24, paddingBottom: 40 }}>
                 <Text style={styles.sectionTitle}>Recent Matches</Text>
                 {matches.slice(0, 5).map((m, i) => (
                   <TouchableOpacity 
                      key={m.id || i}
                      onLongPress={() => {
                          if (activeClub?.ownerId === user?.id || activeClub?.members.find(mem => mem.userId === user?.id)?.role === 'admin') {
                              (navigation as any).navigate('ManualScore', { match: m, isEdit: true });
                          }
                      }}
                      activeOpacity={0.8}
                   >
                     <Card style={[styles.matchCard, { borderLeftWidth: 4, borderLeftColor: m.winnerTeam === 1 ? '#38A169' : '#3182CE' }]}>
                        <Text style={styles.matchDate}>{new Date(m.date).toLocaleDateString()} • {new Date(m.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                        <View style={styles.matchRow}>
                         <View style={{flex: 1}}>
                            <Text style={[styles.matchTeam, m.winnerTeam === 1 ? styles.winnerTeam : styles.loserTeam]}>
                              {m.team1.map(id => getPlayerName(id)).join(' & ')} {m.winnerTeam === 1 && '👑'}
                            </Text>
                            <Text style={styles.vsLabel}>vs</Text>
                            <Text style={[styles.matchTeam, m.winnerTeam === 2 ? styles.winnerTeam : styles.loserTeam]}>
                              {m.team2.map(id => getPlayerName(id)).join(' & ')} {m.winnerTeam === 2 && '👑'}
                            </Text>
                         </View>
                         <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.matchResult}>
                               {/* Show Winner Name if single, or specific text */}
                               {m.winnerTeam === 1 ? 'Winner' : 'Winner'} 
                            </Text>
                            <Text style={styles.matchScore}>
                              {m.scores.map(s => `${s.team1Score}-${s.team2Score}`).join(', ')}
                            </Text>
                         </View>
                      </View>
                     </Card>
                   </TouchableOpacity>
                 ))}
                 <Text style={{textAlign: 'center', marginTop: 8, color: '#A0AEC0', fontSize: 12}}>Long press a match to edit (Admin only)</Text>
              </View>
            )}


            <Button 
              title="Start New Match" 
              onPress={() => navigation.navigate('MatchSetup')}
              style={{ marginTop: 24 }}
            />
          </View>
        )}

        <View style={{ marginTop: 40, alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 12, color: '#A0AEC0' }}>Developed by</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#718096' }}>GK Software Ltd</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    // paddingTop: 60, // Removed hardcoded padding
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  greeting: {
    fontSize: 14,
    color: '#718096',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  content: {
    padding: 24,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  actionButtons: {
    width: '100%',
    gap: 16,
  },
  actionBtn: {
    width: '100%',
  },
  clubName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  clubRole: {
    color: '#38A169',
    fontWeight: '600',
    marginTop: 4,
  },
  clubCode: {
    marginTop: 8,
    color: '#718096',
    fontSize: 12,
  },
  dashboardGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  dashboardItem: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 12,
  },
  matchCard: {
    marginBottom: 12,
    padding: 12,
  },
  matchDate: {
    fontSize: 10,
    color: '#A0AEC0',
    marginBottom: 8,
    textAlign: 'right',
  },
  matchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchTeam: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
    marginBottom: 2,
  },
  winnerTeam: {
    color: '#2D3748',
    fontWeight: 'bold',
    fontSize: 15,
  },
  loserTeam: {
    color: '#A0AEC0',
    fontSize: 13,
  },
  vsLabel: {
    fontSize: 10,
    color: '#CBD5E0',
    marginVertical: 2,
    fontWeight: 'bold',
  },
  matchResult: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#38A169',
    textAlign: 'right',
  },
  matchScore: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'right',
    marginTop: 2,
  },
});
