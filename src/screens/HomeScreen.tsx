import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, SafeAreaView, StatusBar, Platform, TouchableOpacity, Animated, Easing, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import { useMatch } from '../context/MatchContext';
import { useStats } from '../context/StatsContext';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
    const { activeClub, members, pendingClubs, allUsers, userClubs, setActiveClub } = useClub();
    const { matches } = useMatch();
    const { userTotalStats, refreshGlobalStats } = useStats();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  // Stats View State
  const [statsMode, setStatsMode] = useState<'overall' | 'day' | 'month'>('overall');
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
    let start = new Date(statsDate);
    let end = new Date(statsDate);
    
    if (statsMode === 'day') {
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
    } else if (statsMode === 'month') {
        // Month Mode: Start of month to End of month
        start.setDate(1);
        start.setHours(0,0,0,0);
        
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of previous month (which is current month in this calc)
        end.setHours(23,59,59,999);
    } else {
        // Overall: From beginning of time until now (end of today)
        start = new Date(0); // Epoch
        end = new Date();
        end.setHours(23,59,59,999); // Include all matches from today
    }

    const relevantMatches = matches?.filter(m => m.date >= start.getTime() && m.date <= end.getTime()) || [];

    if (relevantMatches.length === 0) return null;

    const playerStats: Record<string, { played: number; wins: number; points: number; name: string }> = {};
    const partnershipStats: Record<string, { wins: number; name: string }> = {};
    
    // User Specific Stats for Period
    const myStats = { played: 0, wins: 0, losses: 0, points: 0 };
    const myPartners: Record<string, { played: number, wins: number, name: string }> = {};

    // Sort ascending for streak calculation
    const sortedMatches = [...relevantMatches].sort((a, b) => a.date - b.date);
    const currentStreaks: Record<string, number> = {};
    const bestStreaks: Record<string, number> = {};
    const playerNames: Record<string, string> = {}; // cache names

    sortedMatches.forEach(m => {
        const t1 = (m.team1 || []);
        const t2 = (m.team2 || []);
        const allPlayers = [...t1, ...t2];
        const userId = user?.id;
        
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

        // Determine Winner Team (Handle potential string vs number values)
        let winnerTeam = m.winnerTeam;
        // @ts-ignore
        const winnerPlayers = winnerTeam == 1 ? t1 : (winnerTeam == 2 ? t2 : []);
        // @ts-ignore
        const loserPlayers = winnerTeam == 1 ? t2 : (winnerTeam == 2 ? t1 : []);
        
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

        // --- 1.5 Personal Stats Calculation ---
        if (userId && (t1.includes(userId) || t2.includes(userId))) {
            const myTeam = t1.includes(userId) ? t1 : t2;
            // @ts-ignore
            const iWon = (t1.includes(userId) && winnerTeam == 1) || (t2.includes(userId) && winnerTeam == 2);
            
            myStats.played++;
            if (iWon) myStats.wins++; else myStats.losses++;
            myStats.points += iWon ? 3 : 1;

            // Partner logic
            if (myTeam.length > 1) {
                const partnerId = myTeam.find(id => id !== userId);
                if (partnerId) {
                    if (!myPartners[partnerId]) myPartners[partnerId] = { played: 0, wins: 0, name: playerNames[partnerId] || 'Unknown' };
                    // update partner name if unknown
                    if (myPartners[partnerId].name === 'Unknown' && playerNames[partnerId]) myPartners[partnerId].name = playerNames[partnerId];

                    myPartners[partnerId].played++;
                    if (iWon) myPartners[partnerId].wins++;
                }
            }
        }

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

    // --- 3. Top Teams (Club Dominance) from RELEVANT matches ---
    const teamStats: Record<string, { wins: number, played: number, ids: string[] }> = {};
    
    sortedMatches.forEach(m => {
        // Team 1 Pair
        if (m.team1 && m.team1.length === 2) {
             const key = [...m.team1].sort().join(',');
             if (!teamStats[key]) teamStats[key] = { wins: 0, played: 0, ids: m.team1 };
             teamStats[key].played++;
             // @ts-ignore
             if (m.winnerTeam == 1) teamStats[key].wins++;
        }
        // Team 2 Pair
        if (m.team2 && m.team2.length === 2) {
             const key = [...m.team2].sort().join(',');
             if (!teamStats[key]) teamStats[key] = { wins: 0, played: 0, ids: m.team2 };
             teamStats[key].played++;
             // @ts-ignore
             if (m.winnerTeam == 2) teamStats[key].wins++;
        }
    });

    // Filter & Sort for Top Teams
    // Min matches depends on period? Let's keep it 2 for now to show data.
    let qualified = Object.values(teamStats).filter(t => t.played >= 2);
    
    // Sort: Unbeaten > Win Rate > Volume
    qualified.sort((a, b) => {
        const aLosses = a.played - a.wins;
        const bLosses = b.played - b.wins;
        
        // 1. Unbeaten Check
        if (aLosses === 0 && bLosses > 0) return -1;
        if (bLosses === 0 && aLosses > 0) return 1;

        // 2. Win Rate
        const aRate = a.wins / a.played;
        const bRate = b.wins / b.played;
        if (bRate !== aRate) return bRate - aRate;

        // 3. Volume
        return b.wins - a.wins;
    });

    const topTeams = qualified.slice(0, 3);

    // FIND LEADERS
    let mostPlayed = { name: '-', val: 0 };
    let mostWins = { name: '-', val: 0 };
    let mostPoints = { name: '-', val: 0 };
    let bestPartnership = { name: '-', val: 0 };
    let longestStreak = { name: '-', val: 0 };

    // Find PERSONAL Best Partner
    let myBestPartner: { played: number; wins: number; name: string; rate: number } | null = null;
    let maxRate = -1;
    Object.values(myPartners).forEach(p => {
        const rate = p.wins / p.played;
        if (rate > maxRate || (rate === maxRate && p.played > (myBestPartner?.played || 0))) {
            maxRate = rate;
            myBestPartner = { ...p, rate: Math.round(rate * 100) };
        }
    });

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
        longestStreak,
        myStats, // Exposed
        myBestPartner, // Exposed
        topTeams // Exposed
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
     if (statsMode === 'overall') return "All Time";
     
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
      
      {/* 1. Modern Header */}
      <View style={styles.header}>
        {/* Top: Avatar & Actions */}
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12}}>
             <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.avatar, { marginRight: 0 }]}>
                    <Text style={styles.avatarText}>{user?.displayName?.charAt(0).toUpperCase() || 'P'}</Text>
                </View>
             </TouchableOpacity>

            <View style={{flexDirection:'row', gap: 12}}>
                <TouchableOpacity 
                    style={[styles.iconBtn, {
                        backgroundColor: theme.colors.primary,
                        shadowColor: theme.colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        elevation: 6,
                        transform: [{scale: 1.05}]
                    }]} 
                    onPress={() => navigation.navigate('GlobalStats')}
                >
                    <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconBtn} onPress={toggleTheme}>
                    <Ionicons name={isDark ? "sunny" : "moon"} size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, {backgroundColor: theme.colors.error + '10'}]} onPress={signOut}>
                    <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
                </TouchableOpacity>
            </View>
        </View>

        {/* Middle: Prominent Greeting */}
        <View style={{ marginBottom: 16 }}>
            <Text style={styles.greeting}>Hello, {user?.displayName?.split(' ')[0] || 'Player'}!</Text>
            <Text style={styles.dateSubtext}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>

        {/* Bottom: Context/Club Switcher */}
        <View>
            <Text style={{fontSize: 12, fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5}}>
                Active Club
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12}}>
                {/* Active Clubs */}
                {userClubs.map(club => {
                    const isActive = activeClub?.id === club.id;
                    return (
                        <TouchableOpacity 
                            key={club.id} 
                            style={[
                                styles.clubPill, 
                                isActive && styles.activeClubPill
                            ]}
                            onPress={() => {
                                if (isActive) {
                                    navigation.navigate('ClubManagement');
                                } else {
                                    setActiveClub(club);
                                }
                            }}
                        >
                            <Text style={[
                                styles.clubPillText,
                                isActive && { color: 'white', fontWeight: 'bold' }
                            ]}>{club.name}</Text>
                            {isActive && <Ionicons name="settings-sharp" size={16} color="white" style={{marginLeft: 6, opacity: 0.9}} />}
                        </TouchableOpacity>
                    );
                })}
                
                <TouchableOpacity 
                    style={[styles.clubPill, styles.addClubPill]}
                    onPress={() => navigation.navigate('CreateClub' as never)}
                >
                    <Ionicons name="add" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
                 <TouchableOpacity 
                    style={[styles.clubPill, styles.addClubPill]}
                    onPress={() => navigation.navigate('JoinClub' as never)}
                >
                    <Ionicons name="enter-outline" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
            </ScrollView>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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

           {/* Pending Requests Banner */}
           {pendingClubs && pendingClubs.length > 0 && (
              <View style={styles.alertCard}>
                 <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.colors.secondary, marginBottom: 4 }}>
                    Requests Pending:
                 </Text>
                 {pendingClubs.map(club => (
                     <Text key={club.id} style={{ color: theme.colors.textSecondary, fontSize: 12 }}>• {club.name}</Text>
                 ))}
              </View>
           )}

           {/* 3. Global Stats Strip - REMOVED (Duplicate) 
               We now display "Total Matches" & "Win Rate" in a dedicated card above the "Start New Match" button.
           */}

           {/* 4. Filter & Date Control */}
           <View style={{ marginBottom: 16 }}>
                {/* Segmented Control */}
                <View style={{flexDirection: 'row', backgroundColor: theme.colors.surfaceHighlight, padding: 4, borderRadius: 12, marginBottom: 16, alignSelf: 'center'}}>
                     {['overall', 'day', 'month'].map((m) => {
                         const isActive = statsMode === m;
                         return (
                            <TouchableOpacity 
                                key={m}
                                onPress={() => { setStatsMode(m as any); setStatsDate(new Date()); }}
                                style={{
                                    paddingHorizontal: 20, 
                                    paddingVertical: 8, 
                                    borderRadius: 10,
                                    backgroundColor: isActive ? theme.colors.surface : 'transparent',
                                    shadowColor: '#000', 
                                    shadowOpacity: isActive ? 0.05 : 0, 
                                    shadowRadius: 2, 
                                    elevation: isActive ? 1 : 0
                                }}
                            >
                                <Text style={{
                                    fontSize: 14, 
                                    fontWeight: '600', 
                                    color: isActive ? theme.colors.textPrimary : theme.colors.textSecondary,
                                    textTransform: 'capitalize'
                                }}>{m}</Text>
                            </TouchableOpacity>
                         );
                     })}
                </View>

                {/* Date Navigation (Only if NOT overall) */}
                {statsMode !== 'overall' && (
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16}}>
                      <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navBtn}>
                          <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.textPrimary} />
                      </TouchableOpacity>
                      <View style={{alignItems: 'center'}}>
                          <Text style={{fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary}}>
                              {formattedDateLabel}
                          </Text>
                          <Text style={{fontSize: 12, color: theme.colors.textSecondary}}>
                              {statsMode === 'day' ? 'Daily Report' : 'Monthly Overview'}
                          </Text>
                      </View>
                      <TouchableOpacity onPress={() => changeDate(1)} style={styles.navBtn}>
                          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textPrimary} />
                      </TouchableOpacity>
                  </View>
                )}
           </View>

           {/* 5. Horizontal Highlights Carousel */}
           {periodStats ? (
             <View style={{ marginBottom: 24 }}>
                <Text style={[styles.sectionTitle, {marginLeft: 4, marginBottom: 12}]}>Performance Highlights</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12, paddingRight: 20}}>
                     
                     {/* 1. Total Matches - REMOVED to avoid confusion with Global Stats
                         User found it confusing to have "Matches Played" here (Period) vs "Total Matches" at top (Global).
                     */}

                     {/* 2. Hot Streak */}
                     {periodStats.longestStreak.val > 0 && (
                        <View style={[styles.highlightCard, {backgroundColor: '#FFF5F5', borderColor: '#FED7D7', borderWidth: 1}]}>
                            <View style={[styles.iconCircle, {backgroundColor: '#FFF5F5'}]}>
                                <MaterialCommunityIcons name="fire" size={24} color="#E53E3E" />
                            </View>
                            <Text style={[styles.highlightVal, {color: '#C53030'}]}>{periodStats.longestStreak.val}</Text>
                            <Text style={[styles.highlightLabel, {color: '#9B2C2C'}]}>Hot Streak</Text>
                            <Text style={[styles.highlightSub, {color: '#9B2C2C'}]} numberOfLines={1}>{periodStats.longestStreak.name}</Text>
                        </View>
                     )}

                     {/* 3. Best Duo */}
                     {periodStats.bestPartnership.val > 0 && (
                        <View style={[styles.highlightCard, {backgroundColor: '#F0FFF4', borderColor: '#C6F6D5', borderWidth: 1}]}>
                            <View style={[styles.iconCircle, {backgroundColor: '#F0FFF4'}]}>
                                <MaterialCommunityIcons name="account-group" size={24} color="#38A169" />
                            </View>
                            <Text style={[styles.highlightVal, {color: '#2F855A'}]}>{periodStats.bestPartnership.val}</Text>
                            <Text style={[styles.highlightLabel, {color: '#276749'}]}>Best Duo Wins</Text>
                            <Text style={[styles.highlightSub, {color: '#276749'}]} numberOfLines={1}>{periodStats.bestPartnership.name}</Text>
                        </View>
                     )}

                     {/* 4. Top Points */}
                     {periodStats.mostPoints.val > 0 && (
                        <View style={[styles.highlightCard, {backgroundColor: '#FFFFF0', borderColor: '#FEFCBF', borderWidth: 1}]}>
                            <View style={[styles.iconCircle, {backgroundColor: '#FFFFF0'}]}>
                                <MaterialCommunityIcons name="star" size={24} color="#D69E2E" />
                            </View>
                            <Text style={[styles.highlightVal, {color: '#B7791F'}]}>{periodStats.mostPoints.val}</Text>
                            <Text style={[styles.highlightLabel, {color: '#975A16'}]}>League Points</Text>
                            <Text style={[styles.highlightSub, {color: '#975A16'}]} numberOfLines={1}>{periodStats.mostPoints.name}</Text>
                        </View>
                     )}

                     {/* 5. Most Wins */}
                     {periodStats.mostWins.val > 0 && (
                        <View style={[styles.highlightCard, {backgroundColor: theme.colors.surface}]}>
                            <View style={[styles.iconCircle, {backgroundColor: theme.colors.surfaceHighlight}]}>
                                <MaterialCommunityIcons name="trophy-outline" size={24} color={theme.colors.textSecondary} />
                            </View>
                            <Text style={styles.highlightVal}>{periodStats.mostWins.val}</Text>
                            <Text style={styles.highlightLabel}>Most Wins</Text>
                            <Text style={styles.highlightSub} numberOfLines={1}>{periodStats.mostWins.name}</Text>
                        </View>
                     )}
                </ScrollView>
             </View>
           ) : (
                <View style={[styles.emptyHighlightBox, { borderColor: theme.colors.border }]}>
                    <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={theme.colors.textSecondary} style={{opacity: 0.5}} />
                    <Text style={{color: theme.colors.textSecondary, marginTop: 12}}>No activity for this period.</Text>
                </View>
           )}

           {/* 5.5 Club Dominance (Top Teams from Period) */}
           {periodStats && (periodStats as any).topTeams && (periodStats as any).topTeams.length > 0 && (
               <View style={{ marginBottom: 24 }}>
                   <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginLeft: 4}}>
                        <Text style={styles.sectionTitle}>Club Dominance</Text>
                        <View style={{backgroundColor: theme.colors.surfaceHighlight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 8}}>
                                <Text style={{fontSize: 10, color: theme.colors.textSecondary}}>Top 2 Matches Min</Text>
                        </View>
                   </View>
                   
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight: 20}}>
                        {(periodStats as any).topTeams.map((team: any, index: number) => {
                                const isUnbeaten = (team.played - team.wins) === 0;
                                const winRate = Math.round((team.wins / team.played) * 100);
                                const isGold = index === 0;
                                
                                return (
                                    <View key={index} style={[
                                        styles.teamCard, 
                                        isGold && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    ]}>
                                        <View style={{position: 'absolute', top: 12, right: 12}}>
                                             {isUnbeaten ? (
                                                <Ionicons name="shield-checkmark" size={20} color={isGold ? '#FFD700' : theme.colors.success} /> 
                                             ) : (
                                                <Ionicons name="trophy" size={20} color={isGold ? 'white' : theme.colors.textSecondary} /> 
                                             )}
                                        </View>
                                        
                                        <View style={{marginTop: 4}}>
                                            <Text style={[styles.teamRank, isGold && {color: 'rgba(255,255,255,0.7)'}]}>RANK #{index + 1}</Text>
                                            <Text style={[styles.teamName, isGold && {color: 'white'}]} numberOfLines={2}>
                                                {team.ids.map((id: string) => getPlayerName(id)).join(' & ')}
                                            </Text>
                                        </View>
                                        
                                        <View style={{flexDirection: 'row', alignItems: 'flex-end', marginTop: 16, justifyContent: 'space-between'}}>
                                            <View>
                                                <Text style={[styles.teamStatBig, isGold && {color: 'white'}]}>{winRate}%</Text>
                                                <Text style={[styles.teamStatLabel, isGold && {color: 'rgba(255,255,255,0.8)'}]}>Win Rate</Text>
                                            </View>
                                            <View style={{alignItems: 'flex-end'}}>
                                                <Text style={[styles.teamSubStat, isGold && {color: 'white'}]}>
                                                    {team.wins}W - {team.played - team.wins}L
                                                </Text>
                                                <Text style={[styles.teamStatLabel, isGold && {color: 'rgba(255,255,255,0.8)'}]}>{team.played} Matches</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                        })}
                   </ScrollView>
               </View>
           )}
           
           {/* 6. My Stats & Best Partner (Period Context) */}
           {periodStats && (periodStats as any).myStats && (periodStats as any).myStats.played > 0 && (
             <View style={{ marginBottom: 24 }}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginLeft: 4}}>
                    <Text style={[styles.sectionTitle, {marginBottom: 0}]}>My Performance</Text>
                    <View style={{backgroundColor: theme.colors.surfaceHighlight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4}}>
                        <Text style={{fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary}}>
                            {statsMode === 'overall' ? 'ALL TIME' : formattedDateLabel.toUpperCase()}
                        </Text>
                    </View>
                </View>
                
                {/* Rich Stats Card */}
                <View style={styles.performanceContainer}>
                    <View style={styles.performanceRow}>
                        {/* Played */}
                        <View style={styles.perfItem}>
                            <View style={[styles.perfIcon, {backgroundColor: theme.colors.primary + '15'}]}>
                                <Ionicons name="game-controller" size={16} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.perfValue}>{(periodStats as any).myStats.played}</Text>
                            <Text style={styles.perfLabel}>Played</Text>
                        </View>
                        
                        <View style={styles.vertDivider} />

                        {/* Wins */}
                        <View style={styles.perfItem}>
                             <View style={[styles.perfIcon, {backgroundColor: theme.colors.success + '15'}]}>
                                <Ionicons name="trophy" size={16} color={theme.colors.success} />
                            </View>
                            <Text style={[styles.perfValue, {color: theme.colors.success}]}>{(periodStats as any).myStats.wins}</Text>
                            <Text style={styles.perfLabel}>Wins</Text>
                        </View>

                        <View style={styles.vertDivider} />

                        {/* Losses */}
                        <View style={styles.perfItem}>
                             <View style={[styles.perfIcon, {backgroundColor: theme.colors.error + '15'}]}>
                                <Ionicons name="close-circle" size={16} color={theme.colors.error} />
                            </View>
                            <Text style={[styles.perfValue, {color: theme.colors.error}]}>{(periodStats as any).myStats.losses}</Text>
                            <Text style={styles.perfLabel}>Losses</Text>
                        </View>
                    </View>

                     {/* Win Rate Bar */}
                     <View style={{marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border}}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                             <Text style={{fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600'}}>WIN RATE</Text>
                             <Text style={{fontSize: 11, fontWeight:'bold', color: theme.colors.textPrimary}}>
                                {Math.round(((periodStats as any).myStats.wins / (periodStats as any).myStats.played) * 100)}%
                             </Text>
                        </View>
                        <View style={{height: 6, backgroundColor: theme.colors.surfaceHighlight, borderRadius: 3, overflow: 'hidden'}}>
                             <View style={{width: `${Math.round(((periodStats as any).myStats.wins / (periodStats as any).myStats.played) * 100)}%`, height: '100%', backgroundColor: theme.colors.success}} />
                        </View>
                     </View>
                </View>

                {/* Best Partner Card (Period) - Integrated Look */}
                {(periodStats as any).myBestPartner && (
                    <View style={[styles.partnerCard, { marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>
                       <View style={{flexDirection: 'row', alignItems: 'center'}}>
                           <View style={styles.avatarSmall}>
                              <Text style={styles.avatarTextSmall}>{(periodStats as any).myBestPartner.name.charAt(0)}</Text>
                           </View>
                           <View style={{marginLeft: 12}}>
                              <Text style={styles.partnerLabel}>BEST PARTNER</Text>
                              <Text style={styles.partnerName}>{(periodStats as any).myBestPartner.name}</Text>
                           </View>
                       </View>
                       <View style={{alignItems: 'flex-end'}}>
                          <Text style={styles.partnerRate}>{(periodStats as any).myBestPartner.rate}%</Text>
                          <Text style={styles.partnerSub}>Win Rate</Text>
                       </View>
                    </View>
                )}
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
              {/* Admin Approval Notification (Standalone) */}
              {(activeClub.ownerId === user?.id || activeClub.members.find(m => m.userId === user?.id)?.role === 'admin') && 
                activeClub.joinRequests && activeClub.joinRequests.length > 0 && (
                  <TouchableOpacity 
                      style={{
                          backgroundColor: theme.colors.surfaceHighlight, 
                          paddingVertical: 12, 
                          paddingHorizontal: 16, 
                          marginHorizontal: 16, 
                          marginBottom: 12, 
                          borderRadius: 12, 
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
                          marginRight: 12
                      }}>
                        <Text style={{color: 'white', fontSize: 12, fontWeight: 'bold'}}>{activeClub.joinRequests.length}</Text>
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={{color: theme.colors.textPrimary, fontWeight: '600', fontSize: 14}}>
                            Membership Request{activeClub.joinRequests.length > 1 ? 's' : ''}
                        </Text>
                        <Text style={{color: theme.colors.textSecondary, fontSize: 12}}>Tap to review approvals</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
              )}

              {/* Start Button */}
              <TouchableOpacity 
                style={[styles.floatingStartBtn, { marginTop: 24, marginHorizontal: 16 }]} 
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
                       {/* @ts-ignore */}
                       <View style={[styles.matchCard, { borderLeftColor: m.winnerTeam == 1 ? theme.colors.primary : theme.colors.surfaceHighlight }]}>
                          <View style={styles.matchHeader}>
                              <Text style={styles.matchDate}>{new Date(m.date).toLocaleDateString()}</Text>
                              {/* @ts-ignore */}
                              <View style={[styles.matchResultBadgeContainer, { backgroundColor: m.winnerTeam == 1 ? theme.colors.primary+'20' : theme.colors.surfaceHighlight }]}>
                                  {/* @ts-ignore */}
                                  <Text style={[styles.matchResultBadge, {color: m.winnerTeam == 1 ? theme.colors.primary : theme.colors.textSecondary}]}>
                                      {/* @ts-ignore */}
                                      {m.winnerTeam == 1 ? 'TEAM 1' : 'TEAM 2'}
                                  </Text>
                              </View>
                          </View>
                          
                          <View style={styles.matchBody}>
                               {/* Team 1 */}
                               <View style={styles.matchTeamRow}>
                                   {/* @ts-ignore */}
                                   {m.winnerTeam == 1 ? (
                                       <Ionicons name="trophy" size={14} color={theme.colors.secondary} style={{marginRight: 6}} />
                                   ) : (
                                       <View style={[styles.teamDot, {backgroundColor: theme.colors.textSecondary}]} />
                                   )}
                                   {/* @ts-ignore */}
                                   <Text style={[styles.matchTeamName, m.winnerTeam==1 && styles.boldText]} numberOfLines={1} ellipsizeMode="tail">
                                       {m.team1.map(id => getPlayerName(id, m)).join(' / ')}
                                   </Text>
                                   {/* @ts-ignore */}
                                   <Text style={[styles.matchScoreText, m.winnerTeam==1 && styles.scoreWinner]}>
                                       {m.scores.map(s => s.team1Score).join(' - ')}
                                   </Text>
                               </View>

                               {/* Team 2 */}
                               <View style={styles.matchTeamRow}>
                                   {/* @ts-ignore */}
                                   {m.winnerTeam == 2 ? (
                                       <Ionicons name="trophy" size={14} color={theme.colors.secondary} style={{marginRight: 6}} />
                                   ) : (
                                       <View style={[styles.teamDot, {backgroundColor: theme.colors.textSecondary}]} />
                                   )}
                                   {/* @ts-ignore */}
                                   <Text style={[styles.matchTeamName, m.winnerTeam==2 && styles.boldText]} numberOfLines={1} ellipsizeMode="tail">
                                       {m.team2.map(id => getPlayerName(id, m)).join(' / ')}
                                   </Text>
                                   {/* @ts-ignore */}
                                   <Text style={[styles.matchScoreText, m.winnerTeam==2 && styles.scoreWinner]}>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 8,
    zIndex: 10,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
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
  clubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 0 },
  clubName: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 4 },
  roleTag: { backgroundColor: theme.colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
  roleText: { color: theme.colors.primary, fontSize: 10, fontWeight: 'bold' },
  settingsBtn: { padding: 4 },
  codeBox: { backgroundColor: theme.colors.surfaceHighlight, padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeLabel: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  codeValue: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },

  // Alert Card
  alertCard: {
      padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 16,
      borderColor: theme.colors.secondary, 
      backgroundColor: theme.colors.secondary + '15'
  },

  // Stats Grid
  dashboardGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  
  // -- NEW STYLE ADDITIONS FOR MODERN REDESIGN -- //
  
  // 1. Global Stats Strip 
  globalStatsStrip: {
      flexDirection: 'row', 
      justifyContent: 'space-around', 
      alignItems: 'center', 
      backgroundColor: theme.colors.surface, 
      borderRadius: 12, 
      paddingVertical: 12,
      marginVertical: 4, 
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1, 
      borderWidth: 1, 
      borderColor: theme.colors.surfaceHighlight
  },
  globalStatItem: { alignItems: 'center', flex: 1 },
  globalStatValue: { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary },
  globalStatLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
  vertDivider: { width: 1, height: 20 },

  // 2. Navigation
  navBtn: { padding: 4, backgroundColor: theme.colors.surfaceHighlight, borderRadius: 50 },

  // 3. Highlight Carousel Cards
  highlightCard: {
      width: 140, 
      height: 140, // Square shape
      padding: 12, 
      borderRadius: 20, 
      justifyContent: 'space-between',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
  },
  highlightVal: { fontSize: 32, fontWeight: '800', color: theme.colors.textPrimary },
  highlightLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary, opacity: 0.8 },
  highlightSub: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
  iconCircle: {
      width: 40, height: 40, borderRadius: 20, 
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 4
  },
  emptyHighlightBox: {
      height: 140, 
      borderRadius: 20, 
      borderWidth: 2, 
      borderStyle: 'dashed', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: theme.colors.surface + '80'
  },

  // 4. Misc
  dateSubtext: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
  addClubPill: { borderStyle: 'dashed', backgroundColor: 'transparent', width: 40, minWidth: 40, paddingHorizontal: 0 },

  // 5. Club Pills Overrides
  clubPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.surfaceHighlight,
      minWidth: 80,
      justifyContent: 'center',
  },

  // Legacy (Keep some for safety if cached)
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
  // statCard & clubPill removed (duplicates)
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

  // -- Club Dominance Styles --
  teamCard: {
      width: 220,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginRight: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: theme.colors.surfaceHighlight
  },
  teamRank: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      letterSpacing: 1,
      marginBottom: 4
  },
  teamName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      lineHeight: 20
  },
  teamStatBig: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.primary,
      lineHeight: 28
  },
  teamStatLabel: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      marginTop: 2
  },
  teamSubStat: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
  },
  
  footer: { alignItems: 'center', marginBottom: 20, marginTop: 20 },
  footerText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },

  // -- Performance Grid --
  performanceContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1, 
      borderColor: theme.colors.surfaceHighlight
  },
  performanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
  },
  perfItem: {
      flex: 1,
      alignItems: 'center',
  },
  perfLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginBottom: 4,
      marginTop: 8
  },
  perfValue: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.textPrimary
  },
  perfIcon: {
      width: 32, height: 32, borderRadius: 16,
      justifyContent: 'center', alignItems: 'center',
      marginBottom: 0
  }
});
