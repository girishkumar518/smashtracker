import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, StatusBar, Animated, Easing } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Match } from '../models/types';
import { useClub } from '../context/ClubContext';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';

type MatchOverviewParams = {
  match: Match;
};

// Team Colors constants for specific match visualization (always Blue vs Red style)
const TEAM_COLORS = {
  t1: '#3182CE',
  t2: '#E53E3E',
  win: '#38A169',
};

export default function MatchOverviewScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { match } = route.params as MatchOverviewParams;
  const { allUsers, members } = useClub();
  const { theme, isDark } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      })
    ]).start();
  }, []);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const getPlayerName = (id: string) => {
    // 1. Check Guest Names Map specific to this match
    if (match.guestNames && match.guestNames[id]) {
        return match.guestNames[id];
    }
    
    // 2. Check Club Members
    const u = allUsers?.find(u => u.id === id) || members.find(m => m.id === id);
    if (u) return u.displayName;

    // 3. Guest Fallback
    if (id.startsWith('guest_')) return 'Guest Player';

    return 'Unknown';
  };

  const t1Names = useMemo(() => match.team1.map(id => getPlayerName(id)).join(' / '), [match.team1]);
  const t2Names = useMemo(() => match.team2.map(id => getPlayerName(id)).join(' / '), [match.team2]);

  // Derived Stats
  const t1TotalPoints = match.scores.reduce((acc, s) => acc + s.team1Score, 0);
  const t2TotalPoints = match.scores.reduce((acc, s) => acc + s.team2Score, 0);
  const totalPoints = t1TotalPoints + t2TotalPoints;

  const renderStatRow = (label: string, val1: string | number, val2: string | number) => (
    <View style={styles.statRow}>
      <Text style={[styles.statValue, { textAlign: 'left', color: TEAM_COLORS.t1 }]}>{val1}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { textAlign: 'right', color: TEAM_COLORS.t2 }]}>{val2}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Overview</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="share-social-outline" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Date Badge */}
            <View style={{alignItems: 'center', marginBottom: 20}}>
                <View style={styles.dateBadge}>
                    <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} style={{marginRight: 6}} />
                    <Text style={styles.dateText}>
                        {new Date(match.date).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric' })}  •  {new Date(match.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                </View>
            </View>

            {/* Score Card */}
            <View style={styles.scoreCard}>
            {/* Team 1 (Blue) */}
            <View style={[styles.teamRow, styles.teamRowBorder]}>
                <View style={[styles.teamIndicator, match.winnerTeam === 1 ? {backgroundColor: TEAM_COLORS.win} : {backgroundColor: 'transparent'}]} />
                <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
                    <View style={[styles.avatarPlaceholder, {backgroundColor: TEAM_COLORS.t1}]}>
                        <Text style={{color:'white', fontWeight:'bold'}}>{t1Names.charAt(0)}</Text>
                    </View>
                    <Text style={[styles.teamName, match.winnerTeam === 1 && styles.boldText]}>{t1Names}</Text>
                    {match.winnerTeam === 1 && <Ionicons name="checkmark-circle" size={18} color={TEAM_COLORS.win} style={{marginLeft: 8}} />}
                </View>
                <View style={styles.setScores}>
                    {match.scores.map((s, i) => (
                        <Text key={i} style={[styles.setScoreText, match.winnerTeam === 1 && styles.boldText]}>{s.team1Score}</Text>
                    ))}
                </View>
            </View>

            {/* Team 2 (Red) */}
            <View style={styles.teamRow}>
                <View style={[styles.teamIndicator, match.winnerTeam === 2 ? {backgroundColor: TEAM_COLORS.win} : {backgroundColor: 'transparent'}]} />
                <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
                    <View style={[styles.avatarPlaceholder, {backgroundColor: TEAM_COLORS.t2}]}>
                        <Text style={{color:'white', fontWeight:'bold'}}>{t2Names.charAt(0)}</Text>
                    </View>
                    <Text style={[styles.teamName, match.winnerTeam === 2 && styles.boldText]}>{t2Names}</Text>
                    {match.winnerTeam === 2 && <Ionicons name="checkmark-circle" size={18} color={TEAM_COLORS.win} style={{marginLeft: 8}} />}
                </View>
                <View style={styles.setScores}>
                    {match.scores.map((s, i) => (
                        <Text key={i} style={[styles.setScoreText, match.winnerTeam === 2 && styles.boldText]}>{s.team2Score}</Text>
                    ))}
                </View>
            </View>
            </View>

            {/* Stats Section */}
            <View style={styles.statsContainer}>
            <View style={styles.statsHeader}>
                <Text style={[styles.statsTeamName, {color: TEAM_COLORS.t1}]} numberOfLines={1}>{t1Names.split('/')[0]}</Text>
                <View style={styles.statsPill}>
                    <Text style={styles.statsPillText}>STATS COMPARISON</Text>
                </View>
                <Text style={[styles.statsTeamName, {textAlign: 'right', color: TEAM_COLORS.t2}]} numberOfLines={1}>{t2Names.split('/')[0]}</Text>
            </View>
            
            <View style={styles.statsBody}>
                {renderStatRow("Match Points", t1TotalPoints, t2TotalPoints)}
                <View style={styles.divider} />
                {renderStatRow("Max Streak", match.stats?.maxConsecutivePts.team1 ?? "-", match.stats?.maxConsecutivePts.team2 ?? "-")}
                <View style={styles.divider} />
                {renderStatRow("Points on Serve", match.stats?.pointsWonOnServe.team1 ?? "-", match.stats?.pointsWonOnServe.team2 ?? "-")}
                <View style={styles.divider} />
                {renderStatRow("Sets Won", match.winnerTeam === 1 ? (match.scores.length > 1 ? 2 : 1) : 0, match.winnerTeam === 2 ? (match.scores.length > 1 ? 2 : 1) : 0)} 
            </View>
            </View>
            
            {/* Simple Graph Placeholder */}
            {/* Only show if stats exist */}
            <View style={styles.graphCard}>
                <View style={styles.graphHeader}>
                    <Ionicons name="bar-chart-outline" size={18} color={theme.colors.textSecondary} style={{marginRight: 8}} />
                    <Text style={styles.graphTitle}>Performance Insight</Text>
                </View>
                <View style={styles.graphContainer}>
                    <Text style={{color: theme.colors.textSecondary, textAlign: 'center', marginVertical: 20, fontStyle:'italic'}}>
                        Detailed analytics coming soon...
                    </Text>
                </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceHighlight,
  },
  headerTitle: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  backButton: { padding: 8 },
  menuButton: { padding: 8 },
  
  content: { padding: 16 },
  
  // Date
  dateBadge: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceHighlight,
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  dateText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '500' },

  // Score Card
  scoreCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.surfaceHighlight,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    height: 70,
  },
  teamRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceHighlight,
  },
  teamIndicator: {
    width: 6, height: 40, borderRadius: 3, marginRight: 16,
  },
  avatarPlaceholder: {
      width: 32, height: 32, borderRadius: 16, marginRight: 12,
      justifyContent: 'center', alignItems: 'center'
  },
  teamName: { color: theme.colors.textPrimary, fontSize: 16, flex: 1, fontWeight: '500' },
  boldText: { fontWeight: 'bold' },
  setScores: { flexDirection: 'row', gap: 8 },
  setScoreText: {
     color: theme.colors.textSecondary, fontSize: 18, width: 30, textAlign: 'center', fontWeight: 'bold'
  },

  // Stats
  statsContainer: { marginBottom: 24 },
  statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statsTeamName: { flex: 1, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  statsPill: { backgroundColor: theme.colors.surfaceHighlight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statsPillText: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: 'bold' },
  
  statsBody: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 40 },
  divider: { height: 1, backgroundColor: theme.colors.surfaceHighlight, width: '100%' },
  statLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: 'bold', width: 40 },

  // Graph
  graphCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 30,
      borderWidth: 1,
      borderColor: theme.colors.surfaceHighlight,
  },
  graphHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  graphTitle: { color: theme.colors.textPrimary, fontWeight: 'bold', fontSize: 14 },
  graphContainer: { justifyContent: 'center', alignItems: 'center', height: 100 },
});
