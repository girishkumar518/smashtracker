import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, SafeAreaView, StatusBar, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Contexts
import { useAuth } from '../../context/AuthContext';
import { useClub } from '../../context/ClubContext';
import { useTheme } from '../../context/ThemeContext';
import { useMatch } from '../../context/MatchContext';

// Components
import HomeHeader from './components/HomeHeader';
import StatsFilter from './components/StatsFilter';
import PeriodStatsView from './components/PeriodStatsView';
import ClubDominance from './components/ClubDominance';
import MyPerformance from './components/MyPerformance';
import RecentMatches from './components/RecentMatches';

import EmptyHomeState from './components/EmptyHomeState';

import StartMatchFAB from './components/StartMatchFAB';

// Hooks & Styles
import { useHomeStats } from '../../hooks/useHomeStats';
import { createStyles } from './styles';
import { isPersonalClubId } from '../../services/personalClubService';

export default function HomeScreen() {
    const { user } = useAuth();
    const { activeClub, pendingClubs } = useClub();
    const { matches } = useMatch();
    const { theme, isDark } = useTheme();
    const navigation = useNavigation<any>();

    // Custom Hook for Logic
    const {
        statsMode,
        setStatsMode,
        statsDate,
        setStatsDate,
        changeDate,
        formattedDateLabel,
        periodStats,
        refreshing,
        onRefresh,
        getPlayerName
    } = useHomeStats();

    // Styles
    const styles = useMemo(() => createStyles(theme), [theme]);
    const isPersonalClub = isPersonalClubId(activeClub?.id || '');

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

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

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />

            <HomeHeader />

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
                            <View style={{ flex: 1, marginLeft: 10 }}>
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

                    {!activeClub ? (
                        <EmptyHomeState theme={theme} />
                    ) : (
                        <View>
                            {/* Admin Approval Notification */}
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
                                            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{activeClub.joinRequests.length}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: theme.colors.textPrimary, fontWeight: '600', fontSize: 14 }}>
                                                Membership Request{activeClub.joinRequests.length > 1 ? 's' : ''}
                                            </Text>
                                            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Tap to review approvals</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                )}

                            {/* Filter Controls */}
                            <StatsFilter
                                statsMode={statsMode}
                                setStatsMode={setStatsMode}
                                statsDate={statsDate}
                                setStatsDate={setStatsDate}
                                changeDate={changeDate}
                                formattedDateLabel={formattedDateLabel}
                                theme={theme}
                            />

                            {/* Stats Views */}
                            <PeriodStatsView
                                periodStats={periodStats}
                                isPersonalClub={isPersonalClub}
                                theme={theme}
                            />

                            <ClubDominance
                                periodStats={periodStats}
                                isPersonalClub={isPersonalClub}
                                getPlayerName={getPlayerName}
                                theme={theme}
                            />

                            <MyPerformance
                                periodStats={periodStats}
                                isPersonalClub={isPersonalClub}
                                statsMode={statsMode}
                                formattedDateLabel={formattedDateLabel}
                                theme={theme}
                            />

                            <StartMatchFAB theme={theme} />

                            {/* Recent Matches */}
                            <RecentMatches
                                matches={matches}
                                activeClub={activeClub}
                                user={user}
                                getPlayerName={getPlayerName}
                                theme={theme}
                            />
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
