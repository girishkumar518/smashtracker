import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, SafeAreaView, StatusBar, Platform, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { activeClub, matches, members, pendingClubs, allUsers } = useClub();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      })
    ]).start();
  }, []);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Data helpers
  const getPlayerName = (id: string) => {
    const u = allUsers?.find(u => u.id === id) || members.find(m => m.id === id);
    return u ? u.displayName : 'Unknown';
  };

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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Header */}
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
        <View style={{flexDirection:'row', gap: 10}}>
            <TouchableOpacity style={styles.iconBtn} onPress={toggleTheme}>
                <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, {backgroundColor: theme.colors.error + '15'}]} onPress={signOut}>
                <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.textPrimary} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {pendingClubs && pendingClubs.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <View style={styles.alertCard}>
                <View style={{flexDirection:'row', alignItems:'center', marginBottom: 8}}>
                   <Ionicons name="time-outline" size={20} color={theme.colors.secondary} />
                   <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.secondary, marginLeft: 8 }}>
                      Requests Pending
                   </Text>
                </View>
                {pendingClubs.map(club => (
                  <View key={club.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, paddingLeft: 28 }}>
                     <Text style={{ color: theme.colors.secondary }}>{club.name}</Text>
                     <Text style={{ color: theme.colors.textSecondary, fontStyle: 'italic', fontSize: 12 }}>Waiting for approval</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!activeClub ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-circle-outline" size={80} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Club Found</Text>
              <Text style={styles.emptyText}>
                You are not currently a member of any badminton club.
                Create a new club to invite friends, or join an existing one.
              </Text>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.bigActionBtn, {backgroundColor: theme.colors.primary}]}
                  onPress={() => navigation.navigate('CreateClub')} 
                >
                    <Ionicons name="add-circle-outline" size={24} color="white" />
                    <Text style={styles.bigActionBtnText}>Create a Club</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.bigActionBtn, {backgroundColor: theme.colors.surfaceHighlight}]}
                  onPress={() => navigation.navigate('JoinClub')} 
                >
                    <Ionicons name="search-outline" size={24} color={theme.colors.textPrimary} />
                    <Text style={[styles.bigActionBtnText, {color: theme.colors.textPrimary}]}>Join a Club</Text>
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
                        <Ionicons name="settings-outline" size={20} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.codeBox}>
                      <Text style={styles.codeLabel}>INVITE CODE</Text>
                      <Text style={styles.codeValue}>{activeClub.inviteCode}</Text>
                  </View>
              </View>

              {/* Stats Grid */}
              <View style={styles.dashboardGrid}>
                <View style={[styles.statCard, {flex:1 }]}>
                  <MaterialCommunityIcons name="badminton" size={24} color={theme.colors.primary} />
                  <Text style={styles.statNumber}>{stats.played}</Text>
                  <Text style={styles.statLabel}>Matches</Text>
                </View>
                <View style={[styles.statCard, {flex:1 }]}>
                  <Ionicons name="trophy-outline" size={24} color={theme.colors.secondary} />
                  <Text style={styles.statNumber}>{stats.winRate}%</Text>
                  <Text style={styles.statLabel}>Win Rate</Text>
                </View>
              </View>

              {stats.bestPartner && (
                <View style={styles.partnerCard}>
                   <View style={{flexDirection: 'row', alignItems: 'center'}}>
                       <View style={styles.avatarSmall}>
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
                       <View style={[styles.matchCard, { borderLeftColor: m.winnerTeam === 1 ? theme.colors.primary : theme.colors.surfaceHighlight }]}>
                          <View style={styles.matchHeader}>
                              <Text style={styles.matchDate}>{new Date(m.date).toLocaleDateString()}</Text>
                              <View style={[styles.matchResultBadgeContainer, { backgroundColor: m.winnerTeam === 1 ? theme.colors.primary+'20' : theme.colors.surfaceHighlight }]}>
                                  <Text style={[styles.matchResultBadge, {color: m.winnerTeam === 1 ? theme.colors.primary : theme.colors.textSecondary}]}>
                                      {m.winnerTeam === 1 ? 'WON' : 'WON'}
                                  </Text>
                              </View>
                          </View>
                          
                          <View style={styles.matchBody}>
                               {/* Team 1 */}
                               <View style={styles.matchTeamRow}>
                                   <View style={[styles.teamDot, {backgroundColor: m.winnerTeam===1 ? theme.colors.primary : theme.colors.textSecondary}]} />
                                   <Text style={[styles.matchTeamName, m.winnerTeam===1 && styles.boldText]}>
                                       {m.team1.map(id => getPlayerName(id)).join(' / ')}
                                   </Text>
                                   <Text style={[styles.matchScoreText, m.winnerTeam===1 && styles.scoreWinner]}>
                                       {m.scores.map(s => s.team1Score).join('-')}
                                   </Text>
                               </View>

                               {/* Team 2 */}
                               <View style={styles.matchTeamRow}>
                                   <View style={[styles.teamDot, {backgroundColor: m.winnerTeam===2 ? theme.colors.primary : theme.colors.textSecondary}]} />
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
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceHighlight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  greeting: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  avatar: { 
      width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, 
      justifyContent:'center', alignItems:'center', marginRight: 12 
  },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  editProfileLink: { fontSize: 12, color: theme.colors.primary, marginTop: 2 },
  iconBtn: { padding: 8, backgroundColor: theme.colors.surfaceHighlight, borderRadius: 8 },

  content: {
    padding: 16,
  },
  
  // Empty State
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 12, marginTop: 16 },
  emptyText: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  actionButtons: { width: '100%', gap: 16 },
  bigActionBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      padding: 16, borderRadius: 12, elevation: 2
  },
  bigActionBtnText: { fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  // Club Card
  clubCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.surfaceHighlight,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
  },
  clubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  clubName: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 4 },
  roleTag: { backgroundColor: theme.colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  roleText: { color: theme.colors.primary, fontSize: 10, fontWeight: 'bold' },
  settingsBtn: { padding: 4 },
  codeBox: { backgroundColor: theme.colors.surfaceHighlight, padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeLabel: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  codeValue: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },

  // Alert Card
  alertCard: {
      padding: 16, borderWidth: 1, borderRadius: 12,
      borderColor: theme.colors.secondary, 
      backgroundColor: theme.colors.secondary + '15'
  },

  // Stats Grid
  dashboardGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
      backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: theme.colors.surfaceHighlight,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: theme.colors.textPrimary, marginTop: 8 },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary },

  // Partner Card
  partnerCard: {
      backgroundColor: theme.colors.surface, 
      padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 24, borderWidth: 1, borderColor: theme.colors.surfaceHighlight,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
  },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#805AD5' },
  avatarTextSmall: { color: 'white', fontWeight: 'bold' },
  partnerLabel: { color: '#B794F4', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  partnerName: { color: theme.colors.textPrimary, fontWeight: 'bold', fontSize: 16 },
  partnerRate: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  partnerSub: { color: theme.colors.textSecondary, fontSize: 10 },

  // Floating Button
  floatingStartBtn: {
      backgroundColor: theme.colors.primary,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      padding: 16, borderRadius: 14,
      shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
      elevation: 6, marginBottom: 8
  },
  startBtnText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

  // Match History
  sectionHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.textPrimary },
  seeAllText: { color: theme.colors.primary, fontSize: 14 },
  
  matchItemContainer: { marginBottom: 12 },
  matchCard: {
      backgroundColor: theme.colors.surface,
      padding: 16, borderRadius: 12,
      borderLeftWidth: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
  },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  matchDate: { color: theme.colors.textSecondary, fontSize: 12 },
  matchResultBadgeContainer: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  matchResultBadge: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  
  matchBody: { gap: 8 },
  matchTeamRow: { flexDirection: 'row', alignItems: 'center', justifyContent:'space-between' },
  teamDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  matchTeamName: { flex:1, color: theme.colors.textSecondary, fontSize: 14 },
  boldText: { color: theme.colors.textPrimary, fontWeight: '600' },
  matchScoreText: { color: theme.colors.textSecondary, fontWeight: 'bold', width: 30, textAlign: 'right' },
  scoreWinner: { color: theme.colors.textPrimary },

  adminTip: { textAlign: 'center', marginTop: 8, color: theme.colors.textSecondary, fontSize: 10, fontStyle: 'italic' },
  
  footer: { alignItems: 'center', marginBottom: 20, marginTop: 20 },
  footerText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }
});
