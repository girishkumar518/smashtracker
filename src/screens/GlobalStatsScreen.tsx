import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useClub } from '../context/ClubContext';
import { Theme } from '../theme/theme';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function GlobalStatsScreen() {
    const { theme, isDark } = useTheme();
    const { userTotalStats, allMatches, members, allUsers } = useClub();
    const { user } = useAuth();
    const navigation = useNavigation<any>();

    const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

    // Helper: Get Player Name (copied from HomeScreen logic, simplified)
    const getPlayerName = (id: string, match?: any) => {
        if (match?.guestNames && match.guestNames[id]) return match.guestNames[id];
        const member = members.find(m => m.id === id);
        if (member) return member.displayName;
        const u = allUsers?.find(u => u.id === id);
        if (u) return u.displayName;
        if (id.startsWith('guest_')) return 'Guest';
        return 'Unknown';
    };

    // Calculate Extended Stats
    const stats = useMemo(() => {
        if (!allMatches || !user) return null;

        let currentStreak = 0;
        let bestStreak = 0;
        let totalPoints = 0;
        let totalGames = 0; // sets played

        // Recent Form (Last 5)
        const recentForm = allMatches.slice(0, 5).map(m => {
             const inTeam1 = m.team1.includes(user.id);
             // @ts-ignore
             const won = (inTeam1 && m.winnerTeam == 1) || (!inTeam1 && m.winnerTeam == 2);
             return won ? 'W' : 'L';
        }).reverse(); // Oldest to Newest for display

        // Traverse all matches for deep stats
        // Matches are sorted DESC (newest first). For streaks, we prefer ASC (oldest first).
        const matchesAsc = [...allMatches].reverse();
        
        matchesAsc.forEach(m => {
            const inTeam1 = m.team1.includes(user.id);
            // @ts-ignore
            const won = (inTeam1 && m.winnerTeam == 1) || (!inTeam1 && m.winnerTeam == 2);

            if (won) {
                currentStreak++;
                if (currentStreak > bestStreak) bestStreak = currentStreak;
            } else {
                currentStreak = 0;
            }

            // Points
            // @ts-ignore
            if (m.winnerTeam == 1 || m.winnerTeam == 2) {
                // Approximate: 3 for win, 1 for play
                totalPoints += won ? 3 : 1;
            }
        });

        return {
            bestStreak,
            recentForm, // Array of 'W' | 'L'
            totalPoints
        };
    }, [allMatches, user]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Career Stats</Text>
                <View style={{width: 40}} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                
                {/* 1. Hero Cards Row */}
                <View style={styles.heroRow}>
                    {/* Win Rate Circle (Simulated) */}
                    <View style={styles.heroCard}>
                        <View style={styles.circleGraph}>
                             <View style={[styles.circleInner, { height: `${userTotalStats.winRate}%`, backgroundColor: theme.colors.primary }]} />
                             <Text style={styles.winRateText}>{userTotalStats.winRate}%</Text>
                             <Text style={styles.heroLabel}>Win Rate</Text>
                        </View>
                    </View>

                    {/* Counts */}
                    <View style={{flex: 1, gap: 12}}>
                        <View style={[styles.statBox, { backgroundColor: theme.colors.surface }]}>
                            <Text style={styles.statLabel}>Total Matches</Text>
                            <Text style={styles.statValueBig}>{userTotalStats.played}</Text>
                        </View>
                        <View style={{flexDirection: 'row', gap: 12}}>
                             <View style={[styles.statBox, { flex: 1, backgroundColor: '#EAFAEA' }]}>
                                 <Text style={[styles.statValue, {color: '#2F855A'}]}>{userTotalStats.wins}</Text>
                                 <Text style={[styles.statLabel, {color: '#276749'}]}>Wins</Text>
                             </View>
                             <View style={[styles.statBox, { flex: 1, backgroundColor: '#FFF5F5' }]}>
                                 <Text style={[styles.statValue, {color: '#C53030'}]}>{userTotalStats.losses}</Text>
                                 <Text style={[styles.statLabel, {color: '#9B2C2C'}]}>Losses</Text>
                             </View>
                        </View>
                    </View>
                </View>

                {/* 2. Visual Diagrams Section */}
                {stats && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Performance Analytics</Text>
                        
                        {/* A. Win/Loss Bar (Visual) */}
                        <View style={styles.barChartContainer}>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                                <Text style={styles.chartLabel}>Win / Loss Distribution</Text>
                                <Text style={styles.chartLabel}>{userTotalStats.wins}W - {userTotalStats.losses}L</Text>
                            </View>
                            <View style={styles.barTrack}>
                                <View style={[styles.barFill, { 
                                    flex: userTotalStats.played > 0 ? userTotalStats.wins / userTotalStats.played : 0.5,
                                    backgroundColor: theme.colors.primary 
                                }]} />
                                <View style={[styles.barFill, { 
                                    flex: userTotalStats.played > 0 ? userTotalStats.losses / userTotalStats.played : 0.5,
                                    backgroundColor: theme.colors.error 
                                }]} />
                            </View>
                        </View>

                        {/* B. Recent Form & Streak */}
                        <View style={styles.subStatsRow}>
                            <View style={styles.subStatCard}>
                                <MaterialCommunityIcons name="fire" size={24} color="#DD6B20" />
                                <Text style={styles.subStatVal}>{stats.bestStreak}</Text>
                                <Text style={styles.subStatLabel}>Best Streak</Text>
                            </View>
                            <View style={styles.subStatCard}>
                                <MaterialCommunityIcons name="star-circle" size={24} color="#D69E2E" />
                                <Text style={styles.subStatVal}>{stats.totalPoints}</Text>
                                <Text style={styles.subStatLabel}>Career Pts</Text>
                            </View>
                        </View>
                        
                        {/* C. Form History (Bubbles) */}
                        <View style={styles.formContainer}>
                            <Text style={styles.chartLabel}>Recent Form (Last 5)</Text>
                            <View style={styles.formBubbles}>
                                {stats.recentForm.map((result, i) => (
                                    <View key={i} style={[
                                        styles.formBubble, 
                                        { backgroundColor: result === 'W' ? theme.colors.success : theme.colors.error }
                                    ]}>
                                        <Text style={styles.formText}>{result}</Text>
                                    </View>
                                ))}
                                {stats.recentForm.length === 0 && <Text style={{color: theme.colors.textSecondary}}>No recent matches</Text>}
                            </View>
                        </View>
                    </View>
                )}

                {/* 3. Global Match History */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Recent Activity (All Clubs)</Text>
                    {allMatches && allMatches.length > 0 ? (
                        allMatches.slice(0, 10).map((m, i) => (
                         // @ts-ignore
                         <View key={m.id || i} style={[styles.matchRow, { borderLeftColor: (m.team1.includes(user?.id) && m.winnerTeam == 1) || (m.team2.includes(user?.id) && m.winnerTeam == 2) ? theme.colors.primary : theme.colors.surfaceHighlight }]}>
                              <View style={{flex: 1}}>
                                  <Text style={styles.matchDate}>{new Date(m.date).toLocaleDateString()}</Text>
                                  <Text style={styles.matchVersus} numberOfLines={1}>
                                      {m.team1.map(id => getPlayerName(id, m)).join('/')} vs {m.team2.map(id => getPlayerName(id, m)).join('/')}
                                  </Text>
                              </View>
                              <View style={styles.scoreBadge}>
                                  <Text style={styles.scoreText}>
                                      {m.scores.map(s => `${s.team1Score}-${s.team2Score}`).join(', ')}
                                  </Text>
                              </View>
                         </View>
                        ))
                    ) : (
                        <Text style={{textAlign: 'center', color: theme.colors.textSecondary, marginTop: 20}}>No matches found.</Text>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    backBtn: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: theme.colors.surfaceHighlight
    },
    headerTitle: {
        fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary
    },
    content: {
        padding: 20,
        paddingBottom: 40
    },
    heroRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
        height: 160
    },
    heroCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    circleGraph: {
        width: 100, height: 100, borderRadius: 50, borderWidth: 8, borderColor: theme.colors.surfaceHighlight,
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative'
    },
    circleInner: {
        position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.2
    },
    winRateText: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
    heroLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
    
    statBox: {
        flex: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 8
    },
    statValueBig: { fontSize: 32, fontWeight: '800', color: theme.colors.textPrimary },
    statValue: { fontSize: 20, fontWeight: '800' },
    statLabel: { fontSize: 12, color: theme.colors.textSecondary, textTransform: 'uppercase' },

    sectionContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
         shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 16 },
    
    barChartContainer: { marginBottom: 20 },
    chartLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 8 },
    barTrack: { height: 12, flexDirection: 'row', borderRadius: 6, overflow: 'hidden' },
    barFill: {},

    subStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    subStatCard: { flex: 1, backgroundColor: theme.colors.background, borderRadius: 12, padding: 12, alignItems: 'center' },
    subStatVal: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 4 },
    subStatLabel: { fontSize: 11, color: theme.colors.textSecondary },

    formContainer: {},
    formBubbles: { flexDirection: 'row', gap: 8 },
    formBubble: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    formText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

    matchRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
        borderLeftWidth: 4, paddingLeft: 12, marginBottom: 8, borderRadius: 4, backgroundColor: theme.colors.surface
    },
    matchDate: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 2 },
    matchVersus: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
    scoreBadge: { backgroundColor: theme.colors.surfaceHighlight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    scoreText: { fontWeight: '700', color: theme.colors.textPrimary, fontSize: 12 }
});
