import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import { useClub } from '../../../context/ClubContext';
import { useTheme } from '../../../context/ThemeContext';
import { isPersonalClubId } from '../../../services/personalClubService';
import { Theme } from '../../../theme/theme';

const HomeHeader = () => {
    const navigation = useNavigation<any>();
    const { user, signOut } = useAuth();
    const { activeClub, userClubs, setActiveClub } = useClub();
    const { theme, isDark, toggleTheme } = useTheme();

    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <View style={styles.header}>
            {/* Top: Avatar & Actions */}
            <View style={styles.topRow}>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user?.displayName?.charAt(0).toUpperCase() || 'P'}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.iconBtn} onPress={toggleTheme}>
                        <Ionicons name={isDark ? "sunny" : "moon"} size={20} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.error + '10' }]} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Middle: Prominent Greeting */}
            <View style={styles.greetingContainer}>
                <Text style={styles.greeting}>Hello, {user?.displayName?.split(' ')[0] || 'Player'}!</Text>

                {/* View Profile / Career Stats Link */}
                <TouchableOpacity onPress={() => navigation.navigate('GlobalStats')} style={styles.careerLink}>
                    <Ionicons name="stats-chart" size={16} color={theme.colors.primary} />
                    <Text style={styles.careerLinkText}>View Career Stats</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom: Context/Club Switcher */}
            <View>
                <Text style={styles.activeClubLabel}>
                    Active Club
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clubScrollContent}>
                    {/* Active Clubs */}
                    {userClubs.map(club => {
                        const isActive = activeClub?.id === club.id;
                        const isPersonal = isPersonalClubId(club.id);

                        return (
                            <TouchableOpacity
                                key={club.id}
                                style={[
                                    styles.clubPill,
                                    isActive && styles.activeClubPill
                                ]}
                                onPress={() => {
                                    if (!isActive) setActiveClub(club);
                                }}
                            >
                                {isPersonal && (
                                    <Ionicons name="heart" size={14} color={isActive ? 'white' : theme.colors.primary} style={styles.clubIcon} />
                                )}
                                <Text style={[
                                    styles.clubPillText,
                                    isActive && { color: 'white' }
                                ]}>{club.name}</Text>
                                {isActive && !isPersonal && <Ionicons name="settings-sharp" size={16} color="white" style={styles.settingsIcon} />}
                            </TouchableOpacity>
                        );
                    })}

                    <TouchableOpacity
                        style={[styles.clubPill, styles.addClubPill]}
                        onPress={() => navigation.navigate('CreateClub' as never)}
                    >
                        <Ionicons name="add" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.clubPill, styles.addClubPill]}
                        onPress={() => navigation.navigate('JoinClub' as never)}
                    >
                        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </View>
    );
};

const createStyles = (theme: Theme) => StyleSheet.create({
    header: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 24,
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        zIndex: 10,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    avatarContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    avatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary,
        justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    actionRow: {
        flexDirection: 'row',
        gap: 12
    },
    iconBtn: { padding: 8, backgroundColor: theme.colors.surfaceHighlight, borderRadius: 8 },
    greetingContainer: { marginBottom: 16 },
    greeting: {
        fontSize: 26,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        letterSpacing: -0.5,
    },
    careerLink: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        marginBottom: 14,
        marginTop: 8,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceHighlight
    },
    careerLinkText: { color: theme.colors.primary, fontWeight: '700', marginLeft: 8 },
    activeClubLabel: {
        fontSize: 12, fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5
    },
    clubScrollContent: { gap: 12 },
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
    activeClubPill: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    clubPillText: {
        color: theme.colors.textPrimary,
        fontWeight: '600',
        fontSize: 14,
    },
    addClubPill: { borderStyle: 'dashed', backgroundColor: 'transparent', width: 40, minWidth: 40, paddingHorizontal: 0 },
    clubIcon: { marginRight: 6 },
    settingsIcon: { marginLeft: 6, opacity: 0.9 }
});

export default HomeHeader;
