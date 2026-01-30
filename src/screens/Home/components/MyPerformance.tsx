import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../theme/theme';
import { StatsMode } from '../../../hooks/useHomeStats';

interface MyPerformanceProps {
    periodStats: any;
    isPersonalClub: boolean;
    statsMode: StatsMode;
    formattedDateLabel: string;
    theme: Theme;
}

const MyPerformance: React.FC<MyPerformanceProps> = ({ periodStats, isPersonalClub, statsMode, formattedDateLabel, theme }) => {
    const styles = useMemo(() => createStyles(theme), [theme]);

    if (!periodStats || !periodStats.myStats || periodStats.myStats.played === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.sectionTitle}>My Performance</Text>
                {!isPersonalClub && (
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeText}>
                            {statsMode === 'overall' ? 'ALL TIME' : formattedDateLabel.toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>

            {/* Rich Stats Card */}
            <View style={styles.performanceContainer}>
                <View style={styles.performanceRow}>
                    {/* Played */}
                    <View style={styles.perfItem}>
                        <View style={[styles.perfIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                            <Ionicons name="game-controller" size={16} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.perfValue}>{periodStats.myStats.played}</Text>
                        <Text style={styles.perfLabel}>Played</Text>
                    </View>

                    <View style={styles.vertDivider} />

                    {/* Wins */}
                    <View style={styles.perfItem}>
                        <View style={[styles.perfIcon, { backgroundColor: theme.colors.success + '15' }]}>
                            <Ionicons name="trophy" size={16} color={theme.colors.success} />
                        </View>
                        <Text style={[styles.perfValue, { color: theme.colors.success }]}>{periodStats.myStats.wins}</Text>
                        <Text style={styles.perfLabel}>Wins</Text>
                    </View>

                    <View style={styles.vertDivider} />

                    {/* Losses */}
                    <View style={styles.perfItem}>
                        <View style={[styles.perfIcon, { backgroundColor: theme.colors.error + '15' }]}>
                            <Ionicons name="close-circle" size={16} color={theme.colors.error} />
                        </View>
                        <Text style={[styles.perfValue, { color: theme.colors.error }]}>{periodStats.myStats.losses}</Text>
                        <Text style={styles.perfLabel}>Losses</Text>
                    </View>
                </View>

                {/* Win Rate Bar */}
                <View style={styles.winRateContainer}>
                    <View style={styles.winRateHeader}>
                        <Text style={styles.winRateLabel}>WIN RATE</Text>
                        <Text style={styles.winRateValue}>
                            {Math.round((periodStats.myStats.wins / periodStats.myStats.played) * 100)}%
                        </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[
                            styles.progressBarFill,
                            { width: `${Math.round((periodStats.myStats.wins / periodStats.myStats.played) * 100)}%` }
                        ]} />
                    </View>
                </View>
            </View>

            {/* Best Partner Card (Period) - Integrated Look */}
            {!isPersonalClub && periodStats.myBestPartner && (
                <View style={styles.partnerCard}>
                    <View style={styles.partnerInfo}>
                        <View style={styles.avatarSmall}>
                            <Text style={styles.avatarTextSmall}>{periodStats.myBestPartner.name.charAt(0)}</Text>
                        </View>
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.partnerLabel}>BEST PARTNER</Text>
                            <Text style={styles.partnerName}>{periodStats.myBestPartner.name}</Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.partnerRate}>{periodStats.myBestPartner.rate}%</Text>
                        <Text style={styles.partnerSub}>Win Rate</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const createStyles = (theme: Theme) => StyleSheet.create({
    container: { marginBottom: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginLeft: 4 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 0 },
    dateBadge: { backgroundColor: theme.colors.surfaceHighlight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    dateBadgeText: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary },

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
    perfIcon: {
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 0
    },
    perfValue: {
        fontSize: 24,
        fontWeight: '800',
        color: theme.colors.textPrimary
    },
    perfLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 4,
        marginTop: 8
    },
    vertDivider: { width: 1, height: 20 },
    winRateContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
    winRateHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    winRateLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
    winRateValue: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textPrimary },
    progressBarBg: { height: 6, backgroundColor: theme.colors.surfaceHighlight, borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: theme.colors.success },

    partnerCard: {
        backgroundColor: theme.colors.surface,
        padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 0, marginTop: 0, marginHorizontal: 0,
        borderWidth: 1, borderColor: theme.colors.surfaceHighlight,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    partnerInfo: { flexDirection: 'row', alignItems: 'center' },
    avatarSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#805AD5' },
    avatarTextSmall: { color: 'white', fontWeight: 'bold' },
    partnerLabel: { color: '#B794F4', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
    partnerName: { color: theme.colors.textPrimary, fontWeight: 'bold', fontSize: 16 },
    partnerRate: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
    partnerSub: { color: theme.colors.textSecondary, fontSize: 10 }
});

export default MyPerformance;
