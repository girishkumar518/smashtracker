import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../../theme/theme';

interface PeriodStatsViewProps {
    periodStats: any;
    isPersonalClub: boolean;
    theme: Theme;
}

const PeriodStatsView: React.FC<PeriodStatsViewProps> = ({ periodStats, isPersonalClub, theme }) => {
    const styles = useMemo(() => createStyles(theme), [theme]);

    if (isPersonalClub) return null;

    if (!periodStats || !periodStats.totalMatches) {
        return (
            <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={theme.colors.textSecondary} style={styles.emptyIcon} />
                <Text style={styles.emptyText}>No activity for this period.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Performance Highlights</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Hot Streak */}
                {periodStats.longestStreak?.val > 0 && (
                    <View style={[styles.highlightCard, { backgroundColor: '#FFF5F5', borderColor: '#FED7D7', borderWidth: 1 }]}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FFF5F5' }]}>
                            <MaterialCommunityIcons name="fire" size={24} color="#E53E3E" />
                        </View>
                        <View>
                            <Text style={[styles.highlightVal, { color: '#C53030' }]}>{periodStats.longestStreak.val}</Text>
                            <Text style={[styles.highlightLabel, { color: '#9B2C2C' }]}>HOT STREAK</Text>
                            <Text style={[styles.highlightSub, { color: '#9B2C2C' }]}>Wins in a row</Text>
                        </View>
                    </View>
                )}

                {/* Best Duo */}
                {!isPersonalClub && periodStats.bestPartnership?.val > 0 && (
                    <View style={[styles.highlightCard, { backgroundColor: '#F0FFF4', borderColor: '#C6F6D5', borderWidth: 1 }]}>
                        <View style={[styles.iconCircle, { backgroundColor: '#F0FFF4' }]}>
                            <MaterialCommunityIcons name="account-group" size={24} color="#38A169" />
                        </View>
                        <View>
                            <Text style={[styles.highlightVal, { color: '#2F855A' }]}>{periodStats.bestPartnership.val}</Text>
                            <Text style={[styles.highlightLabel, { color: '#276749' }]}>Best Duo Wins</Text>
                            <Text style={[styles.highlightSub, { color: '#276749' }]} numberOfLines={1}>
                                {periodStats.bestPartnership.name}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Most Points */}
                {periodStats.mostPoints?.val > 0 && (
                    <View style={[styles.highlightCard, { backgroundColor: '#FFFFF0', borderColor: '#FEFCBF', borderWidth: 1 }]}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FFFFF0' }]}>
                            <MaterialCommunityIcons name="star" size={24} color="#D69E2E" />
                        </View>
                        <Text style={[styles.highlightVal, { color: '#B7791F' }]}>{periodStats.mostPoints.val}</Text>
                        <Text style={[styles.highlightLabel, { color: '#975A16' }]}>League Points</Text>
                        <Text style={[styles.highlightSub, { color: '#975A16' }]} numberOfLines={1}>{periodStats.mostPoints.name}</Text>
                    </View>
                )}

                {/* Most Matches */}
                {!isPersonalClub && periodStats.mostplayed?.matches > 0 && (
                    <View style={[styles.highlightCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceHighlight }]}>
                            <MaterialCommunityIcons name="shoe-sneaker" size={24} color={theme.colors.textSecondary} />
                        </View>
                        <View>
                            <Text style={styles.highlightVal}>{periodStats.mostplayed.matches}</Text>
                            <Text style={styles.highlightLabel} numberOfLines={1}>{periodStats.mostplayed.name}</Text>
                            <Text style={styles.highlightSub}>Most Matches</Text>
                        </View>
                    </View>
                )}

                {/* Most Wins (Fallback if not covered) */}
                {periodStats.mostWins?.val > 0 && (
                    <View style={[styles.highlightCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceHighlight }]}>
                            <MaterialCommunityIcons name="trophy-outline" size={24} color={theme.colors.textSecondary} />
                        </View>
                        <Text style={styles.highlightVal}>{periodStats.mostWins.val}</Text>
                        <Text style={styles.highlightLabel}>Most Wins</Text>
                        <Text style={styles.highlightSub} numberOfLines={1}>{periodStats.mostWins.name}</Text>
                    </View>
                )}

            </ScrollView>
        </View>
    );
};

const createStyles = (theme: Theme) => StyleSheet.create({
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 32,
        opacity: 0.7,
        marginBottom: 24,
        borderColor: theme.colors.border,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 20
    },
    emptyIcon: { opacity: 0.5 },
    emptyText: { color: theme.colors.textSecondary, marginTop: 12 },
    container: { marginBottom: 24 },
    sectionTitle: { marginLeft: 4, marginBottom: 12, fontSize: 18, fontWeight: 'bold', color: theme.colors.textPrimary },
    scrollContent: { gap: 12, paddingRight: 20 },
    highlightCard: {
        width: 140,
        height: 140,
        padding: 12,
        borderRadius: 20,
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    iconCircle: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 4
    },
    highlightVal: { fontSize: 32, fontWeight: '800', color: theme.colors.textPrimary },
    highlightLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary, opacity: 0.8 },
    highlightSub: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
});

export default PeriodStatsView;
