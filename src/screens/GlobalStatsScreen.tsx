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
    const [visibleCount, setVisibleCount] = React.useState(5);

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

    // Filter matches first
    const myMatches = useMemo(() => {
        if (!allMatches || !user) return [];
        return allMatches.filter(m => 
            m.team1.includes(user.id) || m.team2.includes(user.id)
        );
    }, [allMatches, user]);

    // Calculate Extended Stats
    const stats = useMemo(() => {
        if (myMatches.length === 0 || !user) return null;

        let currentStreak = 0;
        let bestStreak = 0;
        
        let totalPointsWon = 0;
        let totalPointsLost = 0;
        let setsWon = 0;
        let setsLost = 0;
        let closeSetsWon = 0;
        let closeSetsTotal = 0;
        let matchMaxStreak = 0; // Max consecutive points ever in a single match
        let servicePoints = 0;

        // Recent Form (Last 5)
        const recentForm = myMatches.slice(0, 5).map(m => {
             const inTeam1 = m.team1.includes(user.id);
             // @ts-ignore
             const won = (inTeam1 && m.winnerTeam == 1) || (!inTeam1 && m.winnerTeam == 2);
             return won ? 'W' : 'L';
        }).reverse(); // Oldest to Newest for display

        // Traverse all matches for deep stats
        // Matches are sorted DESC (newest first). For streaks, we prefer ASC (oldest first).
        const matchesAsc = [...myMatches].reverse();
        
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

            // Stats Parsing
            if (m.scores) {
                m.scores.forEach(s => {
                    const myScore = inTeam1 ? s.team1Score : s.team2Score;
                    const opScore = inTeam1 ? s.team2Score : s.team1Score;
                    
                    totalPointsWon += myScore;
                    totalPointsLost += opScore;

                    if (myScore > opScore) setsWon++;
                    else if (opScore > myScore) setsLost++;
                    
                    // Close Set (Diff <= 2)
                    if (Math.abs(myScore - opScore) <= 2) {
                        closeSetsTotal++;
                        if (myScore > opScore) closeSetsWon++;
                    }
                });
            }

            // Live Stats Extract
            if (m.stats) {
                if (m.stats.pointsWonOnServe) {
                    servicePoints += inTeam1 ? m.stats.pointsWonOnServe.team1 : m.stats.pointsWonOnServe.team2;
                }
                if (m.stats.maxConsecutivePts) {
                    const myStreak = inTeam1 ? m.stats.maxConsecutivePts.team1 : m.stats.maxConsecutivePts.team2;
                    if (myStreak > matchMaxStreak) matchMaxStreak = myStreak;
                }
            }
        });

        const totalSets = setsWon + setsLost;
        const setWinRate = totalSets > 0 ? Math.round((setsWon / totalSets) * 100) : 0;
        const avgPoints = myMatches.length > 0 ? (totalPointsWon / myMatches.length).toFixed(1) : '0';
        const clutchRate = closeSetsTotal > 0 ? Math.round((closeSetsWon / closeSetsTotal) * 100) : 0;
        
        // Serve Stats
        // Filter out matches that don't have stats to avoid skewing the average/percentage
        const matchesWithStats = myMatches.filter(m => m.stats && m.stats.pointsWonOnServe);
        const avgServePoints = matchesWithStats.length > 0 ? (servicePoints / matchesWithStats.length).toFixed(1) : '0';
        
        // Calculate what % of points won came from serve (for matches that track it)
        // We need total points won specifically for matchesWithStats
        let pointsWonInTrackedMatches = 0;
        matchesWithStats.forEach(m => {
             const inTeam1 = m.team1.includes(user.id);
             if (m.scores) {
                 m.scores.forEach(s => pointsWonInTrackedMatches += (inTeam1 ? s.team1Score : s.team2Score));
             }
        });
        const servePointPercentage = pointsWonInTrackedMatches > 0 ? Math.round((servicePoints / pointsWonInTrackedMatches) * 100) : 0;

        return {
            bestStreak, // Match Win Streak
            recentForm,
            totalPoints: totalPointsWon,
            totalPointsLost,
            sets: { won: setsWon, lost: setsLost, rate: setWinRate },
            avgPoints,
            clutchRate,
            matchMaxStreak, // Best In-Game Point Streak
            servicePoints,
            avgServePoints,
            servePointPercentage
        };
    }, [myMatches, user]);

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

                        {/* B. Advanced Stats Grid */}
                        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20}}>
                            <View style={styles.gridStatCard}>
                                <Text style={styles.gridStatLabel}>Set Win Rate</Text>
                                <Text style={[styles.gridStatValue, {color: stats.sets.rate >= 50 ? theme.colors.success : theme.colors.error}]}>
                                    {stats.sets.rate}%
                                </Text>
                                <Text style={styles.gridStatSub}>{stats.sets.won}W - {stats.sets.lost}L</Text>
                            </View>
                            <View style={styles.gridStatCard}>
                                <Text style={styles.gridStatLabel}>Avg Pts/Match</Text>
                                <Text style={styles.gridStatValue}>{stats.avgPoints}</Text>
                                <Text style={styles.gridStatSub}>Total: {stats.totalPoints}</Text>
                            </View>
                            <View style={styles.gridStatCard}>
                                <Text style={styles.gridStatLabel}>Clutch Rate</Text>
                                <Text style={[styles.gridStatValue, {color: stats.clutchRate >= 50 ? '#D69E2E' : theme.colors.textPrimary}]}>
                                    {stats.clutchRate}%
                                </Text>
                                <Text style={styles.gridStatSub}>Close Sets</Text>
                            </View>
                            <View style={styles.gridStatCard}>
                                <Text style={styles.gridStatLabel}>Best In-Game Streak</Text>
                                <Text style={[styles.gridStatValue, {color: '#DD6B20'}]}>{stats.matchMaxStreak}</Text>
                                <Text style={styles.gridStatSub}>Consecutive Pts</Text>
                            </View>
                        </View>
                        
                        {/* C. Service Stats Row (If available) */}
                        {Number(stats.avgServePoints) > 0 && (
                            <View style={[styles.subStatsRow, {marginTop: -10}]}>
                                 <View style={[styles.subStatCard, {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16}]}>
                                     <View style={{flex: 1}}>
                                        <Text style={styles.subStatLabel}>Service Effectiveness</Text>
                                        <Text style={styles.subStatSub}>{stats.servePointPercentage}% of your points won on serve</Text>
                                     </View>
                                     <View style={{alignItems: 'flex-end'}}>
                                          <Text style={[styles.subStatVal, {marginTop: 0, fontSize: 24, color: theme.colors.primary}]}>{stats.avgServePoints}</Text>
                                          <Text style={styles.subStatSub}>Avg Pts / Match</Text>
                                     </View>
                                 </View>
                            </View>
                        )}
                        
                        {/* D. Recent Form (Bubbles) */}
                        <View style={styles.formContainer}>
                            <Text style={styles.chartLabel}>Recent Match Results (Last 5)</Text>
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
                    <Text style={styles.sectionTitle}>Match History</Text>

                    {myMatches && myMatches.length > 0 ? (
                        <>
                            {myMatches.slice(0, visibleCount).map((m, i) => (
                                // @ts-ignore
                                <View key={m.id || i} style={[styles.matchRow, { borderLeftColor: (m.team1.includes(user?.id) && m.winnerTeam == 1) || (m.team2.includes(user?.id) && m.winnerTeam == 2) ? theme.colors.primary : theme.colors.surfaceHighlight }]}>
                                    <View style={{flex: 1, paddingVertical: 4}}>
                                        <Text style={styles.matchDate}>{new Date(m.date).toLocaleDateString()}</Text>
                                        <View style={{marginTop: 2}}>
                                            <Text style={[styles.matchVersus, {textAlign: 'left'}]} numberOfLines={1}>
                                                    {m.team1.map(id => getPlayerName(id, m)).join('/')}
                                            </Text>
                                            <Text style={{fontSize: 10, color: theme.colors.textSecondary, fontStyle: 'italic', marginVertical: 2}}>vs</Text>
                                            <Text style={[styles.matchVersus, {textAlign: 'left'}]} numberOfLines={1}>
                                                    {m.team2.map(id => getPlayerName(id, m)).join('/')}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.scoreBadge}>
                                        <Text style={styles.scoreText}>
                                            {m.scores.map(s => `${s.team1Score}-${s.team2Score}`).join(', ')}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                            
                            {visibleCount < myMatches.length && (
                                <TouchableOpacity 
                                    onPress={() => setVisibleCount(prev => prev + 5)}
                                    style={{paddingVertical: 12, alignItems: 'center', marginTop: 8}}
                                >
                                    <Text style={{color: theme.colors.primary, fontWeight: '600', fontSize: 13}}>
                                        Load More ({myMatches.length - visibleCount} remaining)
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </>
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
    subStatLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
    subStatSub: { fontSize: 10, color: theme.colors.textSecondary },

    gridStatCard: { width: '48%', backgroundColor: theme.colors.background, borderRadius: 12, padding: 12, alignItems: 'center' },
    gridStatLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', marginBottom: 4 },
    gridStatValue: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
    gridStatSub: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2},

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
