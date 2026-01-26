import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, SafeAreaView, StatusBar, Platform, TouchableOpacity, Animated, Easing, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { activeClub, matches, members, pendingClubs, allUsers, userClubs, setActiveClub, userTotalStats, refreshGlobalStats } = useClub();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  // Stats View State
  const [statsMode, setStatsMode] = useState<'day' | 'month'>('day');
  const [statsDate, setStatsDate] = useState(new Date());

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Initial Fetch on mount
  useEffect(() => {
    if (refreshGlobalStats) refreshGlobalStats();
  }, []);

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
  const getPlayerName = (id: string, match?: any) => {
    // 1. Check if it's a Guest in THIS specific match
    if (match?.guestNames && match.guestNames[id]) {
        return match.guestNames[id];
    }
    
    // 2. Check if it's a known Member
    const member = members.find(m => m.id === id);
    if (member) return member.displayName;

    // 3. Check if it's in the global user cache (including past members)
    const user = allUsers?.find(u => u.id === id);
    if (user) return user.displayName;

    // 4. Fallback: Check if it LOOKS like a guest ID but name is missing
    if (id.startsWith('guest_')) return 'Guest Player';

    return 'Unknown';
  };

  const stats = useMemo(() => {
    if (!matches || !matches.length || !user) return { played: 0, winRate: 0, wins: 0, losses: 0, bestPartner: null };

    let played = 0;
    let wins = 0;
    const partnerStats: {[key: string]: {played: number, wins: number, name: string}} = {};

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
            if (!partnerStats[partnerId]) {
                 partnerStats[partnerId] = { played: 0, wins: 0, name: getPlayerName(partnerId, m) };
            }
            // If the name was previously unknown/generic but this match has a better name (e.g. from guestNames), update it
            if (partnerStats[partnerId].name === 'Unknown' || partnerStats[partnerId].name === 'Guest Player') {
                const potentialName = getPlayerName(partnerId, m);
                if (potentialName !== 'Unknown' && potentialName !== 'Guest Player') {
                    partnerStats[partnerId].name = potentialName;
                }
            }

            partnerStats[partnerId].played++;
            if (won) partnerStats[partnerId].wins++;
        }
      }
    });

    let bestPartner: { played: number; wins: number; name: string; rate: number } | null = null;
    let maxRate = -1;

    Object.keys(partnerStats).forEach(id => {
        const s = partnerStats[id];
        const rate = s.wins / s.played;
        if (rate > maxRate || (rate === maxRate && s.played > (bestPartner?.played || 0))) {
            maxRate = rate;
            bestPartner = { ...s, rate: Math.round(rate * 100) };
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

  const periodStats = useMemo(() => {
    // 1. Calculate Time Range
    const start = new Date(statsDate);
    const end = new Date(statsDate);
    
    if (statsMode === 'day') {
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
    } else {
        // Month Mode: Start of month to End of month
        start.setDate(1);
        start.setHours(0,0,0,0);
        
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of previous month (which is current month in this calc)
        end.setHours(23,59,59,999);
    }

    const relevantMatches = matches?.filter(m => m.date >= start.getTime() && m.date <= end.getTime()) || [];

    if (relevantMatches.length === 0) return null;

    const playerStats: Record<string, { played: number; wins: number; points: number; name: string }> = {};
    const partnershipStats: Record<string, { wins: number; name: string }> = {};
    
    // Sort ascending for streak calculation
    const sortedMatches = [...relevantMatches].sort((a, b) => a.date - b.date);
    const currentStreaks: Record<string, number> = {};
    const bestStreaks: Record<string, number> = {};
    const playerNames: Record<string, string> = {}; // cache names

    sortedMatches.forEach(m => {
        const t1 = (m.team1 || []);
        const t2 = (m.team2 || []);
        const allPlayers = [...t1, ...t2];
        
        // Resolve Names
        allPlayers.forEach(pid => {
            if (!playerNames[pid] || playerNames[pid] === 'Unknown' || playerNames[pid] === 'Guest Player') {
                 const name = getPlayerName(pid, m);
                 if (name && name !== 'Unknown' && name !== 'Guest Player') {
                     playerNames[pid] = name;
                 } else if (!playerNames[pid]) {
                     playerNames[pid] = 'Unknown';
                 }
            }
        });

        // Determine Winner Team
        let winnerTeam = m.winnerTeam;
        const winnerPlayers = winnerTeam === 1 ? t1 : (winnerTeam === 2 ? t2 : []);
        const loserPlayers = winnerTeam === 1 ? t2 : (winnerTeam === 2 ? t1 : []);
        
        // --- 1. Basic Stats & Streaks ---
        allPlayers.forEach(pid => {
           if (!playerStats[pid]) {
               playerStats[pid] = { played: 0, wins: 0, points: 0, name: playerNames[pid] };
               currentStreaks[pid] = 0;
               bestStreaks[pid] = 0;
           }
           // Update Name if better found
           playerStats[pid].name = playerNames[pid];

           playerStats[pid].played++;
           
           if (winnerPlayers.includes(pid)) {
               playerStats[pid].wins++;
               playerStats[pid].points += 3; // Win 3 pts
               
               // Streak Update
               currentStreaks[pid] = (currentStreaks[pid] || 0) + 1;
               if (currentStreaks[pid] > bestStreaks[pid]) {
                   bestStreaks[pid] = currentStreaks[pid];
               }
           } else {
               playerStats[pid].points += 1; // Play 1 pt
               // Streak Reset
               currentStreaks[pid] = 0;
           }
        });

        // --- 2. Partnership Stats (Doubles Only) ---
        if (t1.length === 2 && t2.length === 2) {
             const winningPair = winnerTeam === 1 ? t1 : (winnerTeam === 2 ? t2 : null);
             if (winningPair) {
                 const pairId = [...winningPair].sort().join('_'); // Unique ID for pair
                 if (!partnershipStats[pairId]) {
                     const p1Name = playerNames[winningPair[0]]?.split(' ')[0] || 'Unknown';
                     const p2Name = playerNames[winningPair[1]]?.split(' ')[0] || 'Unknown';
                     partnershipStats[pairId] = { wins: 0, name: `${p1Name} & ${p2Name}` };
                 }
                 partnershipStats[pairId].wins++;
             }
        }
    });

    // FIND LEADERS
    let mostPlayed = { name: '-', val: 0 };
    let mostWins = { name: '-', val: 0 };
    let mostPoints = { name: '-', val: 0 };
    let bestPartnership = { name: '-', val: 0 };
    let longestStreak = { name: '-', val: 0 };

    Object.values(playerStats).forEach(stat => {
        if (stat.played > mostPlayed.val) mostPlayed = { name: stat.name, val: stat.played };
        if (stat.wins > mostWins.val) mostWins = { name: stat.name, val: stat.wins };
        if (stat.points > mostPoints.val) mostPoints = { name: stat.name, val: stat.points };
    });

    Object.entries(bestStreaks).forEach(([pid, streak]) => {
         if (streak > longestStreak.val) {
             longestStreak = { name: playerNames[pid] || 'Unknown', val: streak };
         }
    });

    Object.values(partnershipStats).forEach(stat => {
        if (stat.wins > bestPartnership.val) {
            bestPartnership = { name: stat.name, val: stat.wins };
        }
    });

    return {
        totalMatches: relevantMatches.length,
        mostPlayed,
        mostWins,
        mostPoints,
        bestPartnership,
        longestStreak
    };
  }, [matches, statsMode, statsDate, getPlayerName]);

  const changeDate = (direction: -1 | 1) => {
      const newIn = new Date(statsDate);
      if (statsMode === 'day') {
          newIn.setDate(newIn.getDate() + direction);
      } else {
          newIn.setMonth(newIn.getMonth() + direction);
      }
      setStatsDate(newIn);
  };

  const formattedDateLabel = useMemo(() => {
     const today = new Date();
     if (statsMode === 'day') {
         if (statsDate.toDateString() === today.toDateString()) return "Today";
         const yest = new Date(); yest.setDate(yest.getDate() - 1);
         if (statsDate.toDateString() === yest.toDateString()) return "Yesterday";
         return statsDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
     } else {
         if (statsDate.getMonth() === today.getMonth() && statsDate.getFullYear() === today.getFullYear()) return "This Month";
         return statsDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
     }
  }, [statsDate, statsMode]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (refreshGlobalStats) {
        await refreshGlobalStats();
    }
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [refreshGlobalStats]);

  const copyInviteCode = async () => {
      if (activeClub?.inviteCode) {
          await Clipboard.setStringAsync(activeClub.inviteCode);
          Alert.alert('Copied', 'Invite code copied to clipboard!');
      }
  };

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
          
           {/* Missing Phone Alert */}
           {user && !user.phoneNumber && (
               <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.alertBanner}>
                   <Ionicons name="alert-circle" size={24} color="#C05621" />
                   <View style={{flex: 1, marginLeft: 10}}>
                       <Text style={styles.alertTitle}>Connect with Friends</Text>
                       <Text style={styles.alertText}>Add your phone number to get invited to clubs!</Text>
                   </View>
                   <Ionicons name="chevron-forward" size={20} color="#C05621" />
               </TouchableOpacity>
           )}

           {/* Global Stats Summary */}
           {userTotalStats && (
             <View style={{ marginBottom: 20 }}>
                <Text style={styles.sectionTitle}>All Clubs Summary</Text>
                <View style={{
                    marginTop: 8, 
                    paddingVertical: 16, 
                    backgroundColor: theme.colors.surface,
                    borderRadius: 16,
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: theme.colors.surfaceHighlight
                }}>
                    <View style={{alignItems: 'center'}}>
                        <Text style={{fontSize: 24, fontWeight: 'bold', color: theme.colors.textPrimary}}>{userTotalStats.played}</Text>
                        <Text style={{fontSize: 12, color: theme.colors.textSecondary}}>Played</Text>
                    </View>
                    <View style={{width: 1, height: 24, backgroundColor: theme.colors.surfaceHighlight}} />
                    <View style={{alignItems: 'center'}}>
                        <Text style={{fontSize: 24, fontWeight: 'bold', color: theme.colors.success}}>{userTotalStats.wins}</Text>
                        <Text style={{fontSize: 12, color: theme.colors.textSecondary}}>Wins</Text>
                    </View>
                    <View style={{width: 1, height: 24, backgroundColor: theme.colors.surfaceHighlight}} />
                    <View style={{alignItems: 'center'}}>
                        <Text style={{fontSize: 24, fontWeight: 'bold', color: theme.colors.error}}>{userTotalStats.losses}</Text>
                        <Text style={{fontSize: 12, color: theme.colors.textSecondary}}>Losses</Text>
                    </View>
                    <View style={{width: 1, height: 24, backgroundColor: theme.colors.surfaceHighlight}} />
                    <View style={{alignItems: 'center'}}>
                        <Text style={{fontSize: 24, fontWeight: 'bold', color: theme.colors.primary}}>{userTotalStats.winRate}%</Text>
                        <Text style={{fontSize: 12, color: theme.colors.textSecondary}}>Win Rate</Text>
                    </View>
                </View>
             </View>
           )}

           {/* Stats Summary Section */}
           <View style={{ marginBottom: 20 }}>
                {/* Header with Toggles */}
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                        <Text style={styles.sectionTitle}>Highlights</Text>
                    </View>
                    
                    {/* View Mode Toggle */}
                    <View style={{flexDirection: 'row', backgroundColor: theme.colors.surfaceHighlight, borderRadius: 8, padding: 2}}>
                        <TouchableOpacity 
                            onPress={() => { setStatsMode('day'); setStatsDate(new Date()); }}
                            style={{
                                paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6,
                                backgroundColor: statsMode === 'day' ? theme.colors.surface : 'transparent',
                                shadowColor: '#000', shadowOpacity: statsMode === 'day' ? 0.1 : 0, shadowRadius: 2, elevation: statsMode === 'day' ? 1 : 0
                            }}
                        >
                            <Text style={{fontSize: 12, fontWeight: '600', color: statsMode === 'day' ? theme.colors.textPrimary : theme.colors.textSecondary}}>Day</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => { setStatsMode('month'); setStatsDate(new Date()); }}
                            style={{
                                paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6,
                                backgroundColor: statsMode === 'month' ? theme.colors.surface : 'transparent',
                                shadowColor: '#000', shadowOpacity: statsMode === 'month' ? 0.1 : 0, shadowRadius: 2, elevation: statsMode === 'month' ? 1 : 0
                            }}
                        >
                            <Text style={{fontSize: 12, fontWeight: '600', color: statsMode === 'month' ? theme.colors.textPrimary : theme.colors.textSecondary}}>Month</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Date Navigator */}
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: theme.colors.surface, padding: 8, borderRadius: 12}}>
                    <TouchableOpacity onPress={() => changeDate(-1)} style={{padding: 4}}>
                        <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={{fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginHorizontal: 16, minWidth: 100, textAlign: 'center'}}>
                        {formattedDateLabel}
                    </Text>
                    <TouchableOpacity onPress={() => changeDate(1)} style={{padding: 4}}>
                        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {periodStats ? (
                     <View style={{ gap: 12 }}>
                        {/* Main Card: Matches Played */}
                        <View style={[styles.statCard, { backgroundColor: theme.colors.surface, padding: 16 }]}>
                             <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                 <View>
                                     <Text style={{color: theme.colors.textSecondary, fontSize: 14, marginBottom: 4}}>Total Matches</Text>
                                     <Text style={{color: theme.colors.textPrimary, fontSize: 32, fontWeight: '800'}}>{periodStats.totalMatches}</Text>
                                 </View>
                                 <View style={{backgroundColor: theme.colors.primary + '20', padding: 12, borderRadius: 50}}>
                                     <MaterialCommunityIcons name="badminton" size={32} color={theme.colors.primary} />
                                 </View>
                             </View>
                        </View>

                        {/* Leaderboards Grid */}
                        <View style={{flexDirection: 'row', gap: 12}}>
                            {/* Most Wins */}
                            <View style={[styles.statCard, {flex: 1, backgroundColor: theme.colors.surface, padding: 12}]}>
                                 <View style={{flexDirection: 'row', gap: 6, marginBottom: 8}}>
                                     <MaterialCommunityIcons name="trophy" size={16} color="#F59E0B" />
                                     <Text style={{color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600'}}>MOST WINS</Text>
                                 </View>
                                 <Text style={{color: theme.colors.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 2}} numberOfLines={1}>
                                     {periodStats.mostWins.name}
                                 </Text>
                                 <Text style={{color: theme.colors.success, fontSize: 12, fontWeight: 'bold'}}>
                                     {periodStats.mostWins.val} Wins
                                 </Text>
                            </View>

                            {/* Most Points */}
                            <View style={[styles.statCard, {flex: 1, backgroundColor: theme.colors.surface, padding: 12}]}>
                                 <View style={{flexDirection: 'row', gap: 6, marginBottom: 8}}>
                                     <MaterialCommunityIcons name="star-circle" size={16} color={theme.colors.primary} />
                                     <View>
                                        <Text style={{color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600'}}>TOP POINTS</Text>
                                        <Text style={{color: theme.colors.textSecondary, fontSize: 8, fontStyle: 'italic'}}>(Win 3, Play 1)</Text>
                                     </View>
                                 </View>
                                 <Text style={{color: theme.colors.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 2}} numberOfLines={1}>
                                     {periodStats.mostPoints.name}
                                 </Text>
                                 <Text style={{color: theme.colors.primary, fontSize: 12, fontWeight: 'bold'}}>
                                     {periodStats.mostPoints.val} Pts
                                 </Text>
                            </View>
                        </View>
                        {/* Leaderboards Grid Row 2 */}
                        <View style={{flexDirection: 'row', gap: 12}}>
                             {/* Best Partnership */}
                             <View style={[styles.statCard, {flex: 1, backgroundColor: theme.colors.surface, padding: 12}]}>
                                 <View style={{flexDirection: 'row', gap: 6, marginBottom: 8}}>
                                     <MaterialCommunityIcons name="account-group" size={16} color={theme.colors.secondary} />
                                     <Text style={{color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600'}}>BEST DUO</Text>
                                 </View>
                                 <Text style={{color: theme.colors.textPrimary, fontSize: 14, fontWeight: 'bold', marginBottom: 2}} numberOfLines={1}>
                                     {periodStats.bestPartnership.name}
                                 </Text>
                                 <Text style={{color: theme.colors.secondary, fontSize: 12, fontWeight: 'bold'}}>
                                     {periodStats.bestPartnership.val} Wins Together
                                 </Text>
                            </View>

                            {/* Longest Streak */}
                            <View style={[styles.statCard, {flex: 1, backgroundColor: theme.colors.surface, padding: 12}]}>
                                 <View style={{flexDirection: 'row', gap: 6, marginBottom: 8}}>
                                     <MaterialCommunityIcons name="fire" size={16} color="#FF4500" />
                                     <Text style={{color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600'}}>HOT STREAK</Text>
                                 </View>
                                 <Text style={{color: theme.colors.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 2}} numberOfLines={1}>
                                     {periodStats.longestStreak.name}
                                 </Text>
                                 <Text style={{color: "#FF4500", fontSize: 12, fontWeight: 'bold'}}>
                                     {periodStats.longestStreak.val} Wins in a Row
                                 </Text>
                            </View>
                        </View>
                        
                         {/* Most Played */}
                         <View style={[styles.statCard, {flex: 1, backgroundColor: theme.colors.surface, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}]}>
                             <View>
                                 <Text style={{color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 2}}>MOST ACTIVE</Text>
                                 <Text style={{color: theme.colors.textPrimary, fontSize: 16, fontWeight: 'bold'}}>
                                     {periodStats.mostPlayed.name}
                                 </Text>
                             </View>
                             <View style={{alignItems: 'flex-end'}}>
                                 <Text style={{color: theme.colors.textPrimary, fontSize: 18, fontWeight: 'bold'}}>
                                     {periodStats.mostPlayed.val}
                                 </Text>
                                 <Text style={{color: theme.colors.textSecondary, fontSize: 10}}>Matches</Text>
                             </View>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.statCard, { backgroundColor: theme.colors.surface, padding: 24, alignItems: 'center', justifyContent: 'center' }]}>
                        <MaterialCommunityIcons name="calendar-blank" size={40} color={theme.colors.textSecondary} style={{opacity: 0.5, marginBottom: 12}} />
                        <Text style={{color: theme.colors.textSecondary, textAlign: 'center'}}>No matches played on this {statsMode === 'day' ? 'date' : 'month'}.</Text>
                    </View>
                )}
             </View>

          {/* Club Switcher / List */}
          <View style={{ marginBottom: 16 }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems:'center', marginBottom: 8}}>
                <Text style={styles.sectionTitle}>My Clubs</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CreateClub')}>
                    <Text style={{color: theme.colors.primary, fontWeight:'bold', fontSize: 12}}>+ Create New</Text>
                </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12}}>
                {userClubs.map(club => (
                    <TouchableOpacity 
                        key={club.id} 
                        style={[
                            styles.clubPill, 
                            activeClub?.id === club.id && styles.activeClubPill
                        ]}
                        onPress={() => setActiveClub(club)}
                    >
                        <Text style={[
                            styles.clubPillText,
                            activeClub?.id === club.id && { color: 'white' }
                        ]}>{club.name}</Text>
                        {activeClub?.id === club.id && (
                            <Ionicons name="checkmark-circle" size={16} color="white" style={{marginLeft: 6}} />
                        )}
                    </TouchableOpacity>
                ))}
                
                {/* Always visible Join/Create shortcuts if listing */}
                <TouchableOpacity 
                    style={[styles.clubPill, {backgroundColor: theme.colors.surfaceHighlight, borderStyle: 'dashed', borderWidth: 1}]}
                    onPress={() => navigation.navigate('JoinClub')}
                >
                    <Ionicons name="enter-outline" size={16} color={theme.colors.textPrimary} />
                    <Text style={[styles.clubPillText, {marginLeft: 6}]}>Join</Text>
                </TouchableOpacity>
            </ScrollView>
          </View>

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
                      {(activeClub.ownerId === user?.id || activeClub.members.find(m => m.userId === user?.id)?.role === 'admin') && (
                        <View style={styles.roleTag}>
                            <Text style={styles.roleText}>ADMIN</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('ClubManagement')} style={styles.settingsBtn}>
                        <Ionicons name="settings-outline" size={20} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Admin Approval Notification */}
                  {(activeClub.ownerId === user?.id || activeClub.members.find(m => m.userId === user?.id)?.role === 'admin') && 
                    activeClub.joinRequests && activeClub.joinRequests.length > 0 && (
                      <TouchableOpacity 
                         style={{
                             backgroundColor: theme.colors.surfaceHighlight, 
                             paddingVertical: 10, 
                             paddingHorizontal: 12, 
                             marginBottom: 12, 
                             borderRadius: 8, 
                             flexDirection: 'row', 
                             alignItems: 'center',
                             borderWidth: 1,
                             borderColor: theme.colors.border
                         }}
                         onPress={() => navigation.navigate('ClubManagement')}
                      >
                         <View style={{
                             backgroundColor: theme.colors.secondary, 
                             width: 24, 
                             height: 24, 
                             borderRadius: 12, 
                             justifyContent: 'center', 
                             alignItems: 'center',
                             marginRight: 10
                         }}>
                            <Text style={{color: 'white', fontSize: 12, fontWeight: 'bold'}}>{activeClub.joinRequests.length}</Text>
                         </View>
                         <View style={{flex: 1}}>
                            <Text style={{color: theme.colors.textPrimary, fontWeight: '600', fontSize: 13}}>
                                Membership Request{activeClub.joinRequests.length > 1 ? 's' : ''}
                            </Text>
                            <Text style={{color: theme.colors.textSecondary, fontSize: 11}}>Tap to review approvals</Text>
                         </View>
                         <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.codeBox} onPress={copyInviteCode}>
                      <View>
                        <Text style={styles.codeLabel}>INVITE CODE</Text>
                        <Text style={styles.codeValue}>{activeClub.inviteCode}</Text>
                      </View>
                      <Ionicons name="copy-outline" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
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
                          <Text style={styles.avatarTextSmall}>{stats.bestPartner?.name?.charAt(0) || '?'}</Text>
                       </View>
                       <View style={{marginLeft: 12}}>
                          <Text style={styles.partnerLabel}>BEST PARTNER</Text>
                          <Text style={styles.partnerName}>{stats.bestPartner?.name || 'Unknown'}</Text>
                       </View>
                   </View>
                   <View style={{alignItems: 'flex-end'}}>
                      <Text style={styles.partnerRate}>{stats.bestPartner?.rate || 0}%</Text>
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
                      <TouchableOpacity onPress={() => navigation.navigate('MatchHistory')}>
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
                                   {m.winnerTeam === 1 ? (
                                       <Ionicons name="trophy" size={14} color={theme.colors.secondary} style={{marginRight: 6}} />
                                   ) : (
                                       <View style={[styles.teamDot, {backgroundColor: theme.colors.textSecondary}]} />
                                   )}
                                   <Text style={[styles.matchTeamName, m.winnerTeam===1 && styles.boldText]} numberOfLines={1} ellipsizeMode="tail">
                                       {m.team1.map(id => getPlayerName(id, m)).join(' / ')}
                                   </Text>
                                   <Text style={[styles.matchScoreText, m.winnerTeam===1 && styles.scoreWinner]}>
                                       {m.scores.map(s => s.team1Score).join(' - ')}
                                   </Text>
                               </View>

                               {/* Team 2 */}
                               <View style={styles.matchTeamRow}>
                                   {m.winnerTeam === 2 ? (
                                       <Ionicons name="trophy" size={14} color={theme.colors.secondary} style={{marginRight: 6}} />
                                   ) : (
                                       <View style={[styles.teamDot, {backgroundColor: theme.colors.textSecondary}]} />
                                   )}
                                   <Text style={[styles.matchTeamName, m.winnerTeam===2 && styles.boldText]} numberOfLines={1} ellipsizeMode="tail">
                                       {m.team2.map(id => getPlayerName(id, m)).join(' / ')}
                                   </Text>
                                   <Text style={[styles.matchScoreText, m.winnerTeam===2 && styles.scoreWinner]}>
                                       {m.scores.map(s => s.team2Score).join(' - ')}
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
  alertBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FEEBC8',
      padding: 12,
      borderRadius: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#FBD38D',
  },
  alertTitle: {
      color: '#744210',
      fontWeight: 'bold',
      fontSize: 14,
  },
  alertText: {
      color: '#744210',
      fontSize: 12,
  },
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

  // Club List Styles
  statCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.surfaceHighlight, // Use theme color properly here if needed, but safe default
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
  },
  clubPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.surfaceHighlight,
      minWidth: 80,
      justifyContent: 'center',
  },
  activeClubPill: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
  },
  clubPillText: {
      color: theme.colors.textPrimary,
      fontWeight: '600',
      fontSize: 14,
  },

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
  matchTeamName: { flex:1, color: theme.colors.textSecondary, fontSize: 14, marginRight: 8 },
  boldText: { color: theme.colors.textPrimary, fontWeight: '600' },
  matchScoreText: { color: theme.colors.textSecondary, fontWeight: 'bold', minWidth: 60, textAlign: 'right' },
  scoreWinner: { color: theme.colors.textPrimary },

  adminTip: { textAlign: 'center', marginTop: 8, color: theme.colors.textSecondary, fontSize: 10, fontStyle: 'italic' },
  
  footer: { alignItems: 'center', marginBottom: 20, marginTop: 20 },
  footerText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }
});
