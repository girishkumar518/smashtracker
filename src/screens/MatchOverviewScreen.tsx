import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Match } from '../models/types';
import { useClub } from '../context/ClubContext';

type MatchOverviewParams = {
  match: Match;
};

export default function MatchOverviewScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { match } = route.params as MatchOverviewParams;
  const { allUsers, members } = useClub();

  const getPlayerName = (id: string) => {
    const u = allUsers?.find(u => u.id === id) || members.find(m => m.id === id);
    return u ? u.displayName : 'Unknown';
  };

  const t1Names = useMemo(() => match.team1.map(id => getPlayerName(id)).join(' / '), [match.team1]);
  const t2Names = useMemo(() => match.team2.map(id => getPlayerName(id)).join(' / '), [match.team2]);

  // Derived Stats
  const t1TotalPoints = match.scores.reduce((acc, s) => acc + s.team1Score, 0);
  const t2TotalPoints = match.scores.reduce((acc, s) => acc + s.team2Score, 0);
  const totalPoints = t1TotalPoints + t2TotalPoints;

  const renderStatRow = (label: string, val1: string | number, val2: string | number) => (
    <View style={styles.statRow}>
      <Text style={styles.statValue}>{val1}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{val2}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A202C" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match overview</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Text style={styles.headerIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <Text style={[styles.tabText, styles.activeTabText]}>Match</Text>
        </TouchableOpacity>
        {match.scores.map((_, i) => (
          <TouchableOpacity key={i} style={styles.tab}>
            <Text style={styles.tabText}>Set {i + 1}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Date */}
        <View style={styles.dateContainer}>
           <Text style={styles.dateText}>📅 {new Date(match.date).toLocaleDateString()}  ⏱ {new Date(match.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
        </View>

        {/* Score Card */}
        <View style={styles.scoreCard}>
           {/* Team 1 */}
           <View style={[styles.teamRow, styles.teamRowBorder]}>
              <View style={[styles.teamIndicator, match.winnerTeam === 1 ? {backgroundColor: '#38A169'} : {backgroundColor: 'transparent'}]} />
              <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
                 {/* Flag placeholder */}
                 <View style={styles.flagPlaceholder} /> 
                 <Text style={[styles.teamName, match.winnerTeam === 1 && styles.boldText]}>{t1Names}</Text>
                 {match.winnerTeam === 1 && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <View style={styles.setScores}>
                 {match.scores.map((s, i) => (
                    <Text key={i} style={[styles.setScoreText, match.winnerTeam === 1 && styles.boldText]}>{s.team1Score}</Text>
                 ))}
              </View>
           </View>

           {/* Team 2 */}
           <View style={styles.teamRow}>
              <View style={[styles.teamIndicator, match.winnerTeam === 2 ? {backgroundColor: '#38A169'} : {backgroundColor: 'transparent'}]} />
              <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
                 <View style={styles.flagPlaceholder} />
                 <Text style={[styles.teamName, match.winnerTeam === 2 && styles.boldText]}>{t2Names}</Text>
                 {match.winnerTeam === 2 && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <View style={styles.setScores}>
                 {match.scores.map((s, i) => (
                    <Text key={i} style={[styles.setScoreText, match.winnerTeam === 2 && styles.boldText]}>{s.team2Score}</Text>
                 ))}
              </View>
           </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareBtn}>
           <Text style={styles.shareBtnText}>Share score</Text>
        </TouchableOpacity>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
           <View style={styles.statsHeader}>
              <Text style={styles.statsTeamName} numberOfLines={1}>{t1Names.split('/')[0]}...</Text>
              <View style={styles.statsPill}>
                 <Text style={styles.statsPillText}>Stats</Text>
              </View>
              <Text style={[styles.statsTeamName, {textAlign: 'right'}]} numberOfLines={1}>{t2Names.split('/')[0]}...</Text>
           </View>
           
           {renderStatRow("Match points", t1TotalPoints, t2TotalPoints)}
           {renderStatRow("Most consecutive points", match.stats?.maxConsecutivePts.team1 ?? "-", match.stats?.maxConsecutivePts.team2 ?? "-")}
           {renderStatRow("Points won on serve", match.stats?.pointsWonOnServe.team1 ?? "-", match.stats?.pointsWonOnServe.team2 ?? "-")}
           {renderStatRow("Total points played", totalPoints, totalPoints)}
        </View>
        
        {/* Simple Graph Placeholder */}
        <View style={styles.graphCard}>
             <View style={styles.graphHeader}>
                <Text style={styles.graphTitle}>Points Distribution</Text>
             </View>
             <View style={styles.graphContainer}>
                 {/* Simulating bars */}
                 <View style={styles.graphBarGroup}>
                    <View style={[styles.bar, {height: 100, backgroundColor: '#38B2AC'}]} />
                    <View style={[styles.bar, {height: 40, backgroundColor: '#F56565'}]} />
                    <View style={[styles.bar, {height: 60, backgroundColor: '#38B2AC'}]} />
                    <View style={[styles.bar, {height: 80, backgroundColor: '#F56565'}]} />
                 </View>
                 <Text style={{color: '#718096', marginTop: 10, textAlign: 'center'}}>Mock Data Visualization</Text>
             </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171923',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  headerTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
  },
  headerIcon: {
    fontSize: 24,
    color: 'white',
  },
  backButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: 'white',
  },
  tabText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    color: '#A0AEC0',
    fontSize: 12,
  },
  scoreCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    height: 60,
  },
  teamRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  teamIndicator: {
    width: 4,
    height: '100%',
    marginRight: 12,
    borderRadius: 2,
  },
  flagPlaceholder: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#4A5568',
      marginRight: 12,
  },
  teamName: {
    color: '#CBD5E0',
    fontSize: 14,
    flex: 1,
  },
  boldText: {
    color: 'white',
    fontWeight: 'bold',
  },
  checkMark: {
    color: '#38A169',
    fontSize: 16,
    marginRight: 12,
    fontWeight: 'bold',
  },
  setScores: {
    flexDirection: 'row',
  },
  setScoreText: {
     color: '#CBD5E0',
     fontSize: 16,
     width: 30,
     textAlign: 'center',
  },
  shareBtn: {
    backgroundColor: '#6B46C1', // Purple
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  shareBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTeamName: {
      flex: 1,
      color: '#718096',
      fontSize: 12,
  },
  statsPill: {
      backgroundColor: '#4A5568',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
  },
  statsPillText: {
      color: '#A0AEC0',
      fontSize: 12,
  },
  statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
  },
  statLabel: {
      color: '#A0AEC0',
      fontSize: 14,
  },
  statValue: {
      color: 'white',
      fontSize: 14,
      width: 40,
      textAlign: 'center',
  },
  graphCard: {
      backgroundColor: '#2D3748',
      borderRadius: 12,
      padding: 16,
  },
  graphHeader: {
      marginBottom: 16,
      alignItems: 'center'
  },
  graphTitle: {
      color: '#718096',
      fontWeight: '600',
  },
  graphContainer: {
      height: 200,
      justifyContent: 'flex-end',
      alignItems: 'center',
  },
  graphBarGroup: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 20
  },
  bar: {
      width: 20,
      borderRadius: 4,
  }
});
