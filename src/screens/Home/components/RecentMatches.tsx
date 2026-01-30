import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../../../theme/theme';

interface RecentMatchesProps {
    matches: any[];
    activeClub: any;
    user: any;
    getPlayerName: (id: string, match?: any) => string;
    theme: Theme;
}

const RecentMatches: React.FC<RecentMatchesProps> = ({ matches, activeClub, user, getPlayerName, theme }) => {
    const navigation = useNavigation<any>();
    const styles = useMemo(() => createStyles(theme), [theme]);

    if (!matches || matches.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent History</Text>
                <TouchableOpacity onPress={() => navigation.navigate('MatchHistory')}>
                    <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
            </View>

            {matches.slice(0, 5).map((m, i) => (
                <TouchableOpacity
                    key={m.id || i}
                    onPress={() => navigation.navigate('MatchOverview', { match: m })}
                    onLongPress={() => {
                        if (activeClub?.ownerId === user?.id || activeClub?.members.find((mem: any) => mem.userId === user?.id)?.role === 'admin') {
                            navigation.navigate('ManualScore', { match: m, isEdit: true });
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
                            <View style={[styles.matchResultBadgeContainer, { backgroundColor: m.winnerTeam == 1 ? theme.colors.primary + '20' : theme.colors.surfaceHighlight }]}>
                                {/* @ts-ignore */}
                                <Text style={[styles.matchResultBadge, { color: m.winnerTeam == 1 ? theme.colors.primary : theme.colors.textSecondary }]}>
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
                                    <Ionicons name="trophy" size={14} color={theme.colors.secondary} style={{ marginRight: 6 }} />
                                ) : (
                                    <View style={[styles.teamDot, { backgroundColor: theme.colors.textSecondary }]} />
                                )}
                                {/* @ts-ignore */}
                                <Text style={[styles.matchTeamName, m.winnerTeam == 1 && styles.boldText]} numberOfLines={1} ellipsizeMode="tail">
                                    {m.team1.map((id: string) => getPlayerName(id, m)).join(' / ')}
                                </Text>
                                {/* @ts-ignore */}
                                <Text style={[styles.matchScoreText, m.winnerTeam == 1 && styles.scoreWinner]}>
                                    {m.scores.map((s: any) => s.team1Score).join(' - ')}
                                </Text>
                            </View>

                            {/* Team 2 */}
                            <View style={styles.matchTeamRow}>
                                {/* @ts-ignore */}
                                {m.winnerTeam == 2 ? (
                                    <Ionicons name="trophy" size={14} color={theme.colors.secondary} style={{ marginRight: 6 }} />
                                ) : (
                                    <View style={[styles.teamDot, { backgroundColor: theme.colors.textSecondary }]} />
                                )}
                                {/* @ts-ignore */}
                                <Text style={[styles.matchTeamName, m.winnerTeam == 2 && styles.boldText]} numberOfLines={1} ellipsizeMode="tail">
                                    {m.team2.map((id: string) => getPlayerName(id, m)).join(' / ')}
                                </Text>
                                {/* @ts-ignore */}
                                <Text style={[styles.matchScoreText, m.winnerTeam == 2 && styles.scoreWinner]}>
                                    {m.scores.map((s: any) => s.team2Score).join(' - ')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            ))}
            <Text style={styles.adminTip}>Long press a match to edit (Admin only)</Text>
        </View>
    );
};

const createStyles = (theme: Theme) => StyleSheet.create({
    container: { marginTop: 32, paddingBottom: 40 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
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
    matchTeamRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    teamDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    matchTeamName: { flex: 1, color: theme.colors.textSecondary, fontSize: 14, marginRight: 8 },
    boldText: { color: theme.colors.textPrimary, fontWeight: '600' },
    matchScoreText: { color: theme.colors.textSecondary, fontWeight: 'bold', minWidth: 60, textAlign: 'right' },
    scoreWinner: { color: theme.colors.textPrimary },

    adminTip: { textAlign: 'center', marginTop: 8, color: theme.colors.textSecondary, fontSize: 10, fontStyle: 'italic' },
});

export default RecentMatches;
