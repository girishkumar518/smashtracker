import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useClub } from '../context/ClubContext';
import { useMatch } from '../context/MatchContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';
import { isPersonalClubId } from '../services/personalClubService';

export default function MatchHistoryScreen() {
    const { activeClub, members } = useClub();
    const { matches } = useMatch();
    const { user } = useAuth();
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const isPersonal = isPersonalClubId(activeClub?.id || '');
    const displayedMatches = useMemo(() => (isPersonal ? matches.slice(0, 5) : matches), [isPersonal, matches]);

    const styles = useMemo(() => createStyles(theme), [theme]);

    const getPlayerName = (id: string, match?: any) => {
        // 1. Check if it's a Guest in THIS specific match
        if (match?.guestNames && match.guestNames[id]) {
            return match.guestNames[id];
        }

        // 2. Check if it's a known Member
        const member = members.find(m => m.id === id);
        if (member) return member.displayName;

        // 3. Guest Fallback
        if (id.startsWith('guest_')) return 'Guest Player';
        
        return 'Unknown';
    };

    const renderMatchItem = ({ item: m }: { item: any }) => (
        <TouchableOpacity 
           onPress={() => navigation.navigate('MatchOverview', { match: m })}
           onLongPress={() => {
               if (activeClub?.ownerId === user?.id || activeClub?.members.find((mem: any) => mem.userId === user?.id)?.role === 'admin') {
                   navigation.navigate('ManualScore', { match: m, isEdit: true });
               }
           }}
           activeOpacity={0.7}
           style={styles.matchItemContainer}
        >
          <View style={[styles.matchCard, { borderLeftColor: m.winnerTeam === 1 ? theme.colors.primary : theme.colors.surfaceHighlight }]}>
             <View style={styles.matchHeader}>
                 <Text style={styles.matchDate}>{new Date(m.date).toLocaleDateString()}</Text>
                 <View style={[styles.matchResultBadgeContainer, { backgroundColor: m.winnerTeam === 1 ? theme.colors.primary+'20' : theme.colors.surfaceHighlight }]}>
                     <Text style={[styles.matchResultBadge, {color: m.winnerTeam === 1 ? theme.colors.primary : theme.colors.textSecondary}]}>
                         {m.winnerTeam === 1 ? 'WON' : 'WON'}
                     </Text>
                 </View>
             </View>
             
             <View style={styles.matchBody}>
                  {/* Team 1 */}
                  <View style={styles.matchTeamRow}>
                      {m.winnerTeam === 1 ? (
                          <Ionicons name="trophy" size={14} color={theme.colors.secondary} style={{marginRight: 6}} />
                      ) : (
                          <View style={[styles.teamDot, {backgroundColor: theme.colors.textSecondary}]} />
                      )}
                      <Text style={[styles.matchTeamName, m.winnerTeam===1 && styles.boldText]} numberOfLines={1} ellipsizeMode="tail">
                          {m.team1.map((id: string) => getPlayerName(id, m)).join(' / ')}
                      </Text>
                      <Text style={[styles.matchScoreText, m.winnerTeam===1 && styles.scoreWinner]}>
                          {m.scores.map((s: any) => s.team1Score).join(' - ')}
                      </Text>
                  </View>

                  {/* Team 2 */}
                  <View style={styles.matchTeamRow}>
                      {m.winnerTeam === 2 ? (
                          <Ionicons name="trophy" size={14} color={theme.colors.secondary} style={{marginRight: 6}} />
                      ) : (
                          <View style={[styles.teamDot, {backgroundColor: theme.colors.textSecondary}]} />
                      )}
                      <Text style={[styles.matchTeamName, m.winnerTeam===2 && styles.boldText]} numberOfLines={1} ellipsizeMode="tail">
                          {m.team2.map((id: string) => getPlayerName(id, m)).join(' / ')}
                      </Text>
                      <Text style={[styles.matchScoreText, m.winnerTeam===2 && styles.scoreWinner]}>
                          {m.scores.map((s: any) => s.team2Score).join(' - ')}
                      </Text>
                  </View>
             </View>
          </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
            
            {!displayedMatches || displayedMatches.length === 0 ? (
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: theme.colors.textSecondary }}>No matches found</Text>
                </View>
            ) : (
                <FlatList
                    data={displayedMatches}
                    keyExtractor={(item, index) => item.id ?? index.toString()}
                    renderItem={renderMatchItem}
                    contentContainerStyle={{ padding: 16 }}
                />
            )}
        </SafeAreaView>
    );
}

const createStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
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
    matchTeamRow: { flexDirection: 'row', alignItems: 'center', justifyContent:'space-between' },
    teamDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    matchTeamName: { flex:1, color: theme.colors.textSecondary, fontSize: 14, marginRight: 8 },
    boldText: { color: theme.colors.textPrimary, fontWeight: '600' },
    matchScoreText: { color: theme.colors.textSecondary, fontWeight: 'bold', minWidth: 60, textAlign: 'right' },
    scoreWinner: { color: theme.colors.textPrimary },
});
