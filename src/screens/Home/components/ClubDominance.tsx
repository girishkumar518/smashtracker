import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../theme/theme';

interface ClubDominanceProps {
    periodStats: any;
    isPersonalClub: boolean;
    getPlayerName: (id: string) => string;
    theme: Theme;
}

const ClubDominance: React.FC<ClubDominanceProps> = ({ periodStats, isPersonalClub, getPlayerName, theme }) => {
    const styles = useMemo(() => createStyles(theme), [theme]);

    if (!periodStats?.topTeams || periodStats.topTeams.length === 0 || isPersonalClub) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.sectionTitle}>Club Dominance</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>Top 2 Matches Min</Text>
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {periodStats.topTeams.map((team: any, i: number) => {
                    const isUnbeaten = (team.played - team.wins) === 0;
                    const winRate = Math.round((team.wins / team.played) * 100);
                    const isGold = i === 0;

                    return (
                        <View key={i} style={[
                            styles.teamCard,
                            isGold && styles.goldCard
                        ]}>
                            <View style={styles.cardHeader}>
                                {isUnbeaten ? (
                                    <Ionicons name="shield-checkmark" size={20} color={isGold ? '#FFD700' : theme.colors.success} />
                                ) : (
                                    <Ionicons name="trophy" size={20} color={isGold ? 'white' : theme.colors.textSecondary} />
                                )}
                            </View>

                            <View style={styles.nameRow}>
                                <Text style={[styles.teamRank, isGold && { color: 'rgba(255,255,255,0.7)' }]}>RANK #{i + 1}</Text>
                                <Text style={[styles.teamName, isGold && { color: 'white' }]} numberOfLines={2}>
                                    {team.ids.map((id: string) => getPlayerName(id)).join(' & ')}
                                </Text>
                            </View>

                            <View style={styles.statsRow}>
                                {/* Win Rate */}
                                <View>
                                    <Text style={[styles.teamStatBig, isGold && { color: 'white' }]}>{winRate}%</Text>
                                    <Text style={[styles.teamStatLabel, isGold && { color: 'rgba(255,255,255,0.8)' }]}>Win Rate</Text>
                                </View>

                                {/* Record */}
                                <View style={styles.recordCol}>
                                    <Text style={[styles.teamSubStat, isGold && { color: 'white' }]}>{team.wins}W - {team.losses}L</Text>
                                    <Text style={[styles.teamStatLabel, isGold && { color: 'rgba(255,255,255,0.8)' }]}>{team.played} Matches</Text>
                                </View>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const createStyles = (theme: Theme) => StyleSheet.create({
    container: { marginBottom: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginLeft: 4 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.textPrimary },
    badge: {
        backgroundColor: theme.colors.surfaceHighlight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: 8
    },
    badgeText: { fontSize: 10, color: theme.colors.textSecondary },
    scrollContent: { paddingRight: 20 },
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
    goldCard: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary
    },
    cardHeader: { position: 'absolute', top: 12, right: 12 },
    nameRow: { marginTop: 4, marginBottom: 16 },
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
    statsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
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
    recordCol: { alignItems: 'flex-end' },
    teamSubStat: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    }
});

export default ClubDominance;
