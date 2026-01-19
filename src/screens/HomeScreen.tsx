import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, SafeAreaView, StatusBar, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext'; // Import useClub
import Button from '../components/Button';
import Card from '../components/Card';
import { useNavigation } from '@react-navigation/native';

// Rich UI Theme
const THEME = {
  bg: '#171923',
  surface: '#2D3748',
  text: '#FFFFFF',
  textSecondary: '#A0AEC0',
  accent: '#0F766E',
  success: '#38A169',
  danger: '#E53E3E',
  cardBg: '#2D3748',
  highlight: '#3182CE'
};

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { activeClub, matches, members, pendingClubs, allUsers } = useClub();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  // ... (Data helpers preserved)
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
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />
      <View style={styles.header}>
        <View style={{flex: 1}}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileRow}>
             <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.displayName?.charAt(0).toUpperCase() || 'P'}</Text>
             </View>
             <View>
                <Text style={styles.userName}>{user?.displayName || 'Player'}</Text>
                <Text style={styles.editProfileLink}>View Profile</Text>
             </View>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
            <Ionicons name="log-out-outline" size={24} color="#E53E3E" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />
        }
      >
        {pendingClubs && pendingClubs.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View style={[styles.alertCard, { borderColor: '#F6E05E', backgroundColor: 'rgba(246, 224, 94, 0.1)' }]}>
              <View style={{flexDirection:'row', alignItems:'center', marginBottom: 8}}>
                 <Ionicons name="time-outline" size={20} color="#F6E05E" />
                 <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#F6E05E', marginLeft: 8 }}>
                    Requests Pending
                 </Text>
              </View>
              {pendingClubs.map(club => (
                <View key={club.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, paddingLeft: 28 }}>
                   <Text style={{ color: '#F6E05E' }}>{club.name}</Text>
                   <Text style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', fontSize: 12 }}>Waiting for approval</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!activeClub ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-circle-outline" size={80} color={THEME.textSecondary} />
            <Text style={styles.emptyTitle}>No Club Found</Text>
            <Text style={styles.emptyText}>
              You are not currently a member of any badminton club.
              Create a new club to invite friends, or join an existing one.
            </Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.bigActionBtn, {backgroundColor: THEME.accent}]}
                onPress={() => navigation.navigate('CreateClub')} 
              >
                  <Ionicons name="add-circle-outline" size={24} color="white" />
                  <Text style={styles.bigActionBtnText}>Create a Club</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.bigActionBtn, {backgroundColor: '#4A5568'}]}
                onPress={() => navigation.navigate('JoinClub')} 
              >
                  <Ionicons name="search-outline" size={24} color="white" />
                  <Text style={styles.bigActionBtnText}>Join a Club</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            {/* Club Card */}
            <View style={styles.clubCard}>
                <View style={styles.clubHeader}>
                  <View>
                    <Text style={styles.clubName}>{activeClub.name}</Text>
                    <View style={styles.roleTag}>
                        <Text style={styles.roleText}>ADMIN</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('ClubManagement')} style={styles.settingsBtn}>
                      <Ionicons name="settings-outline" size={20} color="white" />
                  </TouchableOpacity>
                </View>
                <View style={styles.codeBox}>
                    <Text style={styles.codeLabel}>INVITE CODE</Text>
                    <Text style={styles.codeValue}>{activeClub.inviteCode}</Text>
                </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.dashboardGrid}>
              <View style={styles.statCard}>
                <Ionicons name="tennisball-outline" size={24} color={THEME.highlight} />
                <Text style={styles.statNumber}>{stats.played}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="trophy-outline" size={24} color="#F6AD55" />
                <Text style={styles.statNumber}>{stats.winRate}%</Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>
            </View>

            {stats.bestPartner && (
              <View style={styles.partnerCard}>
                 <View style={{flexDirection: 'row', alignItems: 'center'}}>
                     <View style={[styles.avatarSmall, {backgroundColor: '#805AD5'}]}>
                        <Text style={styles.avatarTextSmall}>{stats.bestPartner.name.charAt(0)}</Text>
                     </View>
                     <View style={{marginLeft: 12}}>
                        <Text style={styles.partnerLabel}>BEST PARTNER</Text>
                        <Text style={styles.partnerName}>{stats.bestPartner.name}</Text>
                     </View>
                 </View>
                 <View style={{alignItems: 'flex-end'}}>
                    <Text style={styles.partnerRate}>{stats.bestPartner.rate}%</Text>
                    <Text style={styles.partnerSub}>Win Rate</Text>
                 </View>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.floatingStartBtn} 
              onPress={() => navigation.navigate('MatchSetup')}
              activeOpacity={0.8}
            >
                <Ionicons name="play" size={24} color="white" style={{marginRight: 8}} />
                <Text style={styles.startBtnText}>START NEW MATCH</Text>
            </TouchableOpacity>

              {matches && matches.length > 0 && (
              <View style={{ marginTop: 32, paddingBottom: 40 }}>
                 <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent History</Text>
                    <TouchableOpacity onPress={() => {}}>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                 </View>

                 {matches.slice(0, 5).map((m, i) => (
                   <TouchableOpacity 
                      key={m.id || i}
                      onPress={() => (navigation as any).navigate('MatchOverview', { match: m })}
                      onLongPress={() => {
                          if (activeClub?.ownerId === user?.id || activeClub?.members.find(mem => mem.userId === user?.id)?.role === 'admin') {
                              (navigation as any).navigate('ManualScore', { match: m, isEdit: true });
                          }
                      }}
                      activeOpacity={0.7}
                      style={styles.matchItemContainer}
                   >
                     <View style={[styles.matchCard, { borderLeftColor: m.winnerTeam === 1 ? THEME.success : THEME.highlight }]}>
                        <View style={styles.matchHeader}>
                            <Text style={styles.matchDate}>{new Date(m.date).toLocaleDateString()}</Text>
                            <Text style={[styles.matchResultBadge, {color: m.winnerTeam === 1 ? THEME.success : THEME.success}]}>
                                {m.winnerTeam === 1 ? 'WON' : 'WON'}
                            </Text>
                        </View>
                        
                        <View style={styles.matchBody}>
                             {/* Team 1 */}
                             <View style={styles.matchTeamRow}>
                                 <View style={[styles.teamDot, {backgroundColor: m.winnerTeam===1 ? THEME.success : THEME.textSecondary}]} />
                                 <Text style={[styles.matchTeamName, m.winnerTeam===1 && styles.boldText]}>
                                     {m.team1.map(id => getPlayerName(id)).join(' / ')}
                                 </Text>
                                 <Text style={[styles.matchScoreText, m.winnerTeam===1 && styles.scoreWinner]}>
                                     {m.scores.map(s => s.team1Score).join('-')}
                                 </Text>
                             </View>

                             {/* Team 2 */}
                             <View style={styles.matchTeamRow}>
                                 <View style={[styles.teamDot, {backgroundColor: m.winnerTeam===2 ? THEME.success : THEME.textSecondary}]} />
                                 <Text style={[styles.matchTeamName, m.winnerTeam===2 && styles.boldText]}>
                                     {m.team2.map(id => getPlayerName(id)).join(' / ')}
                                 </Text>
                                 <Text style={[styles.matchScoreText, m.winnerTeam===2 && styles.scoreWinner]}>
                                     {m.scores.map(s => s.team2Score).join('-')}
                                 </Text>
                             </View>
                        </View>
                     </View>
                   </TouchableOpacity>
                 ))}
                 <Text style={styles.adminTip}>Long press a match to edit (Admin only)</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.footer}>
            <Text style={styles.footerText}>Developed by GK Software Ltd</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#4A5568',
  },
  greeting: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 4,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  avatar: { 
      width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.accent, 
      justifyContent:'center', alignItems:'center', marginRight: 12 
  },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  editProfileLink: { fontSize: 12, color: THEME.highlight, marginTop: 2 },
  logoutBtn: { padding: 8, backgroundColor: 'rgba(229, 62, 62, 0.1)', borderRadius: 8 },

  content: {
    padding: 16,
  },
  
  // Empty State
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 12, marginTop: 16 },
  emptyText: { fontSize: 16, color: THEME.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  actionButtons: { width: '100%', gap: 16 },
  bigActionBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      padding: 16, borderRadius: 12, elevation: 2
  },
  bigActionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  // Club Card
  clubCard: {
      backgroundColor: THEME.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  clubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  clubName: { fontSize: 24, fontWeight: '800', color: 'white', marginBottom: 4 },
  roleTag: { backgroundColor: 'rgba(56, 161, 105, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  roleText: { color: '#38A169', fontSize: 10, fontWeight: 'bold' },
  settingsBtn: { padding: 4 },
  codeBox: { backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeLabel: { color: THEME.textSecondary, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  codeValue: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },

  // Alert Card
  alertCard: {
      padding: 16, borderWidth: 1, borderRadius: 12
  },

  // Stats Grid
  dashboardGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
      flex: 1, backgroundColor: THEME.surface, padding: 16, borderRadius: 16,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: 'white', marginTop: 8 },
  statLabel: { fontSize: 12, color: THEME.textSecondary },

  // Partner Card
  partnerCard: {
      backgroundColor: '#2D3748', // Purple tint
      padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 24, borderWidth: 1, borderColor: 'rgba(128, 90, 213, 0.3)'
  },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarTextSmall: { color: 'white', fontWeight: 'bold' },
  partnerLabel: { color: '#B794F4', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  partnerName: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  partnerRate: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  partnerSub: { color: THEME.textSecondary, fontSize: 10 },

  // Floating Button
  floatingStartBtn: {
      backgroundColor: THEME.accent,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      padding: 16, borderRadius: 14,
      shadowColor: THEME.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
      elevation: 6, marginBottom: 8
  },
  startBtnText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

  // Match History
  sectionHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  seeAllText: { color: THEME.highlight, fontSize: 14 },
  
  matchItemContainer: { marginBottom: 12 },
  matchCard: {
      backgroundColor: THEME.surface,
      padding: 16, borderRadius: 12,
      borderLeftWidth: 4,
  },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  matchDate: { color: THEME.textSecondary, fontSize: 12 },
  matchResultBadge: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  
  matchBody: { gap: 8 },
  matchTeamRow: { flexDirection: 'row', alignItems: 'center', justifyContent:'space-between' },
  teamDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  matchTeamName: { flex:1, color: THEME.textSecondary, fontSize: 14 },
  boldText: { color: 'white', fontWeight: '600' },
  matchScoreText: { color: THEME.textSecondary, fontWeight: 'bold', width: 30, textAlign: 'right' },
  scoreWinner: { color: 'white' },

  adminTip: { textAlign: 'center', marginTop: 8, color: '#4A5568', fontSize: 10, fontStyle: 'italic' },
  
  footer: { alignItems: 'center', marginBottom: 20, marginTop: 20 },
  footerText: { color: '#4A5568', fontSize: 12, fontWeight: '600' }
});
