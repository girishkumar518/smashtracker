import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Button from '../components/Button';
import { useClub } from '../context/ClubContext';
import { Match, MatchSet } from '../models/types';

// Types for params
type LiveScoreParams = {
  isDoubles: boolean;
  team1: { id: string; name: string }[];
  team2: { id: string; name: string }[];
  matchType?: 1 | 3;
};

export default function LiveScoreScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { team1, team2, matchType = 3 } = route.params as LiveScoreParams;
  const { recordMatch, activeClub } = useClub();

  // Game State
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [sets, setSets] = useState<{ t1: number, t2: number }[]>([]);
  const [currentSet, setCurrentSet] = useState(1);
  const [setWins1, setSetWins1] = useState(0);
  const [setWins2, setSetWins2] = useState(0);

  // History for Undo (simple stack)
  const [history, setHistory] = useState<any[]>([]);

  const MAX_POINTS = 21; // Standard
  const MAX_SETS = 3;

  const handleScore = (team: 1 | 2) => {
    // Save state for undo
    setHistory([...history, { score1, score2, setWins1, setWins2, currentSet, sets }]);

    if (team === 1) {
      if (checkSetWin(score1 + 1, score2)) {
        winSet(1);
      } else {
        setScore1(score1 + 1);
      }
    } else {
      if (checkSetWin(score2 + 1, score1)) {
        winSet(2);
      } else {
        setScore2(score2 + 1);
      }
    }
  };

  const checkSetWin = (s1: number, s2: number) => {
    // Normal win: 21 pts and lead by 2
    if (s1 >= MAX_POINTS && s1 - s2 >= 2) return true;
    // Cap at 30
    if (s1 === 30) return true;
    return false;
  };

  const winSet = (winner: 1 | 2) => {
    const finalSetScore = { team1Score: winner === 1 ? score1 + 1 : score1, team2Score: winner === 2 ? score2 + 1 : score2 };
    const newSets = [...sets, { t1: finalSetScore.team1Score, t2: finalSetScore.team2Score }];
    setSets(newSets);
    
    // Reset scores
    setScore1(0);
    setScore2(0);

    // Update Set Wins
    const newWins1 = winner === 1 ? setWins1 + 1 : setWins1;
    const newWins2 = winner === 2 ? setWins2 + 1 : setWins2;
    
    setSetWins1(newWins1);
    setSetWins2(newWins2);

    // Check match win
    const setsNeededToWin = matchType === 1 ? 1 : 2; 

    if (newWins1 === setsNeededToWin || newWins2 === setsNeededToWin) {
      const matchWinner = newWins1 > newWins2 ? 1 : 2;
      
      const newMatch: Match = {
        id: Math.random().toString(),
        clubId: activeClub?.id || 'unknown',
        date: Date.now(),
        team1: team1.map(p => p.id), 
        team2: team2.map(p => p.id),
        scores: newSets.map(s => ({ team1Score: s.t1, team2Score: s.t2 })),
        winnerTeam: matchWinner,
        isLive: true
      };
      
      recordMatch(newMatch);

      Alert.alert(
        'Match Over!',
        `${winner === 1 ? team1[0].name : team2[0].name} wins the match!`,
        [{ text: 'Exit', onPress: () => navigation.goBack() }]
      );
    } else {
      setCurrentSet(currentSet + 1);
      Alert.alert('Set Finished', `Set ${currentSet} won by Team ${winner}`);
    }
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setScore1(prev.score1);
    setScore2(prev.score2);
    setSetWins1(prev.setWins1);
    setSetWins2(prev.setWins2);
    setCurrentSet(prev.currentSet);
    setSets(prev.sets);
    setHistory(history.slice(0, -1));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.setLabel}>Set {currentSet}</Text>
        <Text style={styles.matchScore}>Sets: {setWins1} - {setWins2}</Text>
      </View>

      <View style={styles.court}>
        {/* Team 1 Score Area */}
        <TouchableOpacity style={[styles.scoreArea, styles.team1Bg]} onPress={() => handleScore(1)}>
          <Text style={styles.scoreText}>{score1}</Text>
          <Text style={styles.teamName}>{team1.map(p => p.name).join(' & ')}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Team 2 Score Area */}
        <TouchableOpacity style={[styles.scoreArea, styles.team2Bg]} onPress={() => handleScore(2)}>
          <Text style={styles.scoreText}>{score2}</Text>
          <Text style={styles.teamName}>{team2.map(p => p.name).join(' & ')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <Button title="Undo" onPress={undo} variant="outline" disabled={history.length === 0} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    height: 60,
    backgroundColor: '#1A202C',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  setLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  matchScore: {
    color: '#CBD5E0',
    fontSize: 16,
  },
  court: {
    flex: 1,
  },
  scoreArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  team1Bg: {
    backgroundColor: '#2B6CB0', // Blue
  },
  team2Bg: {
    backgroundColor: '#C53030', // Red
  },
  divider: {
    height: 4,
    backgroundColor: 'white',
  },
  scoreText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: 'white',
  },
  teamName: {
    fontSize: 24,
    color: 'white',
    fontWeight: '600',
    marginTop: -10,
  },
  controls: {
    padding: 20,
    backgroundColor: '#1A202C',
  },
});
