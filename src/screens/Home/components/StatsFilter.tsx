import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../../theme/theme';
import { StatsMode } from '../../../hooks/useHomeStats';

interface StatsFilterProps {
    statsMode: StatsMode;
    setStatsMode: (mode: StatsMode) => void;
    statsDate: Date;
    setStatsDate: (date: Date) => void;
    changeDate: (days: any) => void;
    formattedDateLabel: string;
    theme: Theme;
}

const StatsFilter: React.FC<StatsFilterProps> = ({ statsMode, setStatsMode, setStatsDate, changeDate, formattedDateLabel, theme }) => {
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <View style={styles.container}>
            {/* Mode Selector */}
            <View style={styles.modeSelector}>
                {(['overall', 'month', 'day'] as StatsMode[]).map((mode) => (
                    <TouchableOpacity
                        key={mode}
                        style={[
                            styles.modeBtn,
                            statsMode === mode && styles.activeModeBtn
                        ]}
                        onPress={() => { setStatsMode(mode); setStatsDate(new Date()); }}
                    >
                        <Text style={[
                            styles.modeBtnText,
                            statsMode === mode && styles.activeModeBtnText
                        ]}>
                            {mode === 'overall' ? 'All Time' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Date Navigator (only for Month/Day) */}
            {statsMode !== 'overall' && (
                <View style={styles.dateNav}>
                    <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navBtn}>
                        <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>

                    <View style={styles.dateLabelContainer}>
                        <Text style={styles.dateLabel}>{formattedDateLabel}</Text>
                        <Text style={styles.dateSubLabel}>
                            {statsMode === 'month' ? 'Monthly Overview' : 'Daily Report'}
                        </Text>
                    </View>

                    <TouchableOpacity onPress={() => changeDate(1)} style={styles.navBtn}>
                        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const createStyles = (theme: Theme) => StyleSheet.create({
    container: { marginBottom: 16 },
    modeSelector: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceHighlight,
        padding: 4,
        borderRadius: 12,
        marginBottom: 16,
        alignSelf: 'center'
    },
    modeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    activeModeBtn: {
        backgroundColor: theme.colors.surface,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    modeBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'capitalize'
    },
    activeModeBtnText: {
        color: theme.colors.textPrimary,
        fontWeight: '700'
    },
    dateNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16
    },
    navBtn: { padding: 4, backgroundColor: theme.colors.surfaceHighlight, borderRadius: 50 },
    dateLabelContainer: { alignItems: 'center' },
    dateLabel: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
    dateSubLabel: { fontSize: 12, color: theme.colors.textSecondary }
});

export default StatsFilter;
