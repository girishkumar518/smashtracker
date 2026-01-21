import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, StatusBar, Dimensions, Animated, Easing } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useClub } from '../context/ClubContext';
import { Match, MatchSet } from '../models/types';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';

// Types for params
type LiveScoreParams = {
  isDoubles: boolean;
  team1: { id: string; name: string }[];
  team2: { id: string; name: string }[];
  matchType?: 1 | 3;
  pointsPerSet?: number;
  goldenPoint?: boolean;
  guestNames?: Record<string, string>;
};

// Team Colors (Independent of App Theme for clarity)
const TEAM_COLORS = {
    team1: '#3182CE', // Blue
    team2: '#E53E3E', // Red
};

export default function LiveScoreScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  
  const { 
    team1, team2, matchType = 3, isDoubles, 
    pointsPerSet = 21, goldenPoint = false, guestNames
  } = route.params as LiveScoreParams;
  const { recordMatch, activeClub } = useClub();

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
    }).start();
  }, []);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Game State
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [sets, setSets] = useState<{ t1: number, t2: number }[]>([]);
  const [currentSet, setCurrentSet] = useState(1);
  const [setWins1, setSetWins1] = useState(0);
  const [setWins2, setSetWins2] = useState(0);
  
  // Advanced Service Logic
  const [servingTeam, setServingTeam] = useState<1 | 2>(1);
  const [serverIdx, setServerIdx] = useState(0); // 0 or 1
  const [receiverIdx, setReceiverIdx] = useState(0); // 0 or 1

  // Player Positioning
  const [t1RightPlayerIdx, setT1RightPlayerIdx] = useState(0); 
  const [t2RightPlayerIdx, setT2RightPlayerIdx] = useState(0); 

  // History for Undo
  const [history, setHistory] = useState<any[]>([]);

  // Stats Tracking
  const [currStreak1, setCurrStreak1] = useState(0);
  const [currStreak2, setCurrStreak2] = useState(0);
  const [maxStreak1, setMaxStreak1] = useState(0);
  const [maxStreak2, setMaxStreak2] = useState(0);
  const [servePoints1, setServePoints1] = useState(0);
  const [servePoints2, setServePoints2] = useState(0);

  const MAX_POINTS = pointsPerSet; 
  const CAP_POINTS = 30; // Hard cap usually

  const handleScore = (winningTeam: 1 | 2) => {
    // Snapshot state
    setHistory([...history, { 
      score1, score2, setWins1, setWins2, currentSet, sets, 
      servingTeam, serverIdx, receiverIdx, t1RightPlayerIdx, t2RightPlayerIdx,
      currStreak1, currStreak2, maxStreak1, maxStreak2, servePoints1, servePoints2
    }]);

    // Update Stats
    let newServePoints1 = servePoints1;
    let newServePoints2 = servePoints2;
    let newMaxStreak1 = maxStreak1;
    let newMaxStreak2 = maxStreak2;
    let newCurrStreak1 = currStreak1;
    let newCurrStreak2 = currStreak2;

    if (winningTeam === 1) {
        if (servingTeam === 1) newServePoints1++;
        newCurrStreak1++;
        newCurrStreak2 = 0;
        if (newCurrStreak1 > newMaxStreak1) newMaxStreak1 = newCurrStreak1;
    } else {
        if (servingTeam === 2) newServePoints2++;
        newCurrStreak2++;
        newCurrStreak1 = 0;
        if (newCurrStreak2 > newMaxStreak2) newMaxStreak2 = newCurrStreak2;
    }

    setServePoints1(newServePoints1);
    setServePoints2(newServePoints2);
    setCurrStreak1(newCurrStreak1);
    setCurrStreak2(newCurrStreak2);
    setMaxStreak1(newMaxStreak1);
    setMaxStreak2(newMaxStreak2);

    if (winningTeam === 1) {
      if (checkSetWin(score1 + 1, score2)) {
        winSet(1);
        return;
      }
      
      const newScore = score1 + 1;
      setScore1(newScore);

      if (servingTeam === 1) {
        if (isDoubles) {
          setT1RightPlayerIdx(prev => prev === 0 ? 1 : 0); // Swap
        }
      } else {
        setServingTeam(1);
        const isEven = newScore % 2 === 0;
        if (!isDoubles) {
             setServerIdx(0);
        } else {
             setServerIdx(isEven ? t1RightPlayerIdx : (t1RightPlayerIdx === 0 ? 1 : 0));
        }
      }

    } else {
      if (checkSetWin(score2 + 1, score1)) {
        winSet(2);
        return;
      }

      const newScore = score2 + 1;
      setScore2(newScore);

      if (servingTeam === 2) {
        if (isDoubles) {
             setT2RightPlayerIdx(prev => prev === 0 ? 1 : 0); 
        }
      } else {
        setServingTeam(2);
        const isEven = newScore % 2 === 0;
        if (!isDoubles) {
             setServerIdx(0);
        } else { 
             const screenLeftIdx = t2RightPlayerIdx === 0 ? 1 : 0;
             setServerIdx(isEven ? screenLeftIdx : t2RightPlayerIdx);
        }
      }
    }
  };

  const checkSetWin = (s1: number, s2: number) => {
    if (goldenPoint) {
       if (s1 >= MAX_POINTS) return true;
       return false;
    }
    if (s1 >= MAX_POINTS) {
        if (s1 - s2 >= 2) return true;
        if (s1 === CAP_POINTS) return true; 
    }
    return false;
  };

  const winSet = (winner: 1 | 2) => {
    const finalSetScore = { team1Score: winner === 1 ? score1 + 1 : score1, team2Score: winner === 2 ? score2 + 1 : score2 };
    const newSets = [...sets, { t1: finalSetScore.team1Score, t2: finalSetScore.team2Score }];
    setSets(newSets);
    
    // Reset for next set
    setScore1(0);
    setScore2(0);
    setT1RightPlayerIdx(0); 
    setT2RightPlayerIdx(0);
    setServingTeam(winner); 
    setServerIdx(0); 
    setHistory([]); // Prevent undoing previous set
    
    const newWins1 = winner === 1 ? setWins1 + 1 : setWins1;
    const newWins2 = winner === 2 ? setWins2 + 1 : setWins2;
    setSetWins1(newWins1);
    setSetWins2(newWins2);

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
        isLive: true,
        stats: {
            maxConsecutivePts: { team1: maxStreak1, team2: maxStreak2 },
            pointsWonOnServe: { team1: servePoints1, team2: servePoints2 }
        },
        guestNames
      };
      recordMatch(newMatch);
      (navigation as any).replace('MatchOverview', { match: newMatch });
    } else {
      setCurrentSet(currentSet + 1);
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
    setServingTeam(prev.servingTeam);
    setServerIdx(prev.serverIdx);
    setReceiverIdx(prev.receiverIdx);
    setT1RightPlayerIdx(prev.t1RightPlayerIdx);
    setT2RightPlayerIdx(prev.t2RightPlayerIdx);
    
    setCurrStreak1(prev.currStreak1);
    setCurrStreak2(prev.currStreak2);
    setMaxStreak1(prev.maxStreak1);
    setMaxStreak2(prev.maxStreak2);
    setServePoints1(prev.servePoints1);
    setServePoints2(prev.servePoints2);

    setHistory(history.slice(0, -1));
  };

  const resetSet = () => {
    Alert.alert('Reset Set', 'Are you sure you want to reset the current set scores to 0-0?', [
        { text: 'Cancel', style: 'cancel' },
        { 
            text: 'Reset', 
            style: 'destructive', 
            onPress: () => {
                setScore1(0);
                setScore2(0);
                setHistory([]);
                setT1RightPlayerIdx(0);
                setT2RightPlayerIdx(0);
                // Keep serving team as is, or reset? Usually reset to initial server of the set? 
                // Let's just reset scores and history.
            } 
        }
    ]);
  };

  const renderPlayerBox = (team: 1 | 2, position: 'L' | 'R', isTop: boolean) => {
     let playerIdx = 0;
     if (team === 1) {
        const rightIdx = t1RightPlayerIdx;
        const leftIdx = rightIdx === 0 ? 1 : 0;
        playerIdx = position === 'R' ? rightIdx : leftIdx;
     } else {
        const rightIdx = t2RightPlayerIdx;
        const leftIdx = rightIdx === 0 ? 1 : 0;
        playerIdx = position === 'R' ? rightIdx : leftIdx;
     }

     if (!isDoubles) {
         const servingScore = servingTeam === 1 ? score1 : score2;
         const isEvenServe = servingScore % 2 === 0;

         if (team === 1) {
             const shouldBeHere = (isEvenServe && position === 'R') || (!isEvenServe && position === 'L');
             if (!shouldBeHere) return <View style={styles.emptyBox} />;
             playerIdx = 0;
         }
         
         if (team === 2) {
             const shouldBeHere = (isEvenServe && position === 'L') || (!isEvenServe && position === 'R');
             if (!shouldBeHere) return <View style={styles.emptyBox} />;
             playerIdx = 0;
         }
     }

     const player = team === 1 ? team1[playerIdx] : team2[playerIdx];
     if (!player && isDoubles) return <View style={styles.emptyBox} />; 

     const isServing = servingTeam === team && serverIdx === playerIdx;
     
     let isReceiving = false;
     if (team !== servingTeam) { 
         const servingScore = servingTeam === 1 ? score1 : score2;
         const isEvenScore = servingScore % 2 === 0;
         
         if (servingTeam === 1) {
             if (isEvenScore && position === 'L') isReceiving = true;
             if (!isEvenScore && position === 'R') isReceiving = true;
         } else {
             if (isEvenScore && position === 'R') isReceiving = true;
             if (!isEvenScore && position === 'L') isReceiving = true;
         }
     }

     return (
        <View style={[
            styles.playerPill,
            isServing && styles.servingPill,
            isReceiving && styles.receivingPill,
            team === 1 ? styles.t1Pill : styles.t2Pill
        ]}>
             <View style={[styles.avatarCircle, { backgroundColor: team === 1 ? TEAM_COLORS.team1 : TEAM_COLORS.team2 }]}>
                 <Text style={styles.avatarText}>
                    {player?.name?.charAt(0).toUpperCase() || 'P'}
                 </Text>
             </View>
             
             <View style={styles.pillContent}>
                <Text style={styles.playerName} numberOfLines={1}>
                    {player?.name || (isDoubles ? 'P'+(playerIdx+1) : '')}
                </Text>
                {isServing && <Text style={styles.roleText}>SERVING</Text>}
             </View>

             {isServing && (
                 <View style={styles.shuttleBadge}>
                     <MaterialCommunityIcons name="badminton" size={14} color="#000" />
                 </View>
             )}
        </View>
     );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Header / Scoreboard */}
      <View style={styles.header}>
         <View style={styles.setBadge}>
             <Text style={styles.setBadgeTitle}>SET</Text>
             <Text style={styles.setBadgeValue}>{currentSet}</Text>
         </View>

         <View style={styles.scoreBoardResult}>
             {/* Team 1 Score (Blue) */}
             <View style={styles.scoreSide}>
                 <Text style={[styles.bigScore, {color: TEAM_COLORS.team1}]}>{score1}</Text>
                 <Text style={styles.teamNameLabel} numberOfLines={1}>{team1.map(p => p.name).join('/')}</Text>
                 <View style={styles.setsDots}>
                    {Array.from({length: setWins1}).map((_,i) => <View key={i} style={[styles.setDot, {backgroundColor: TEAM_COLORS.team1}]} />)}
                 </View>
             </View>

             <View style={styles.vsContainer}>
                 <Text style={styles.vsText}>VS</Text>
                 <View style={styles.setsHistory}>
                    {sets.map((s, i) => (
                        <Text key={i} style={styles.historyText}>{s.t1}-{s.t2}</Text>
                    ))}
                 </View>
             </View>

             {/* Team 2 Score (Red) */}
             <View style={styles.scoreSide}>
                 <Text style={[styles.bigScore, {color: TEAM_COLORS.team2}]}>{score2}</Text>
                 <Text style={styles.teamNameLabel} numberOfLines={1}>{team2.map(p => p.name).join('/')}</Text>
                 <View style={styles.setsDots}>
                    {Array.from({length: setWins2}).map((_,i) => <View key={i} style={[styles.setDot, {backgroundColor: TEAM_COLORS.team2}]} />)}
                 </View>
             </View>
         </View>
      </View>

      {/* Court Visualisation */}
      <Animated.View style={[styles.mainArea, {opacity: fadeAnim}]}>
          <View style={styles.courtBorder}>
            <View style={styles.court}>
                {/* Team 2 Side (Top) */}
                <View style={styles.courtHalf}>
                    <View style={styles.courtRow}>
                        <View style={[styles.courtBox, styles.borderRight, styles.borderBottom]}>
                            {renderPlayerBox(2, 'L', true)}
                        </View>
                        <View style={[styles.courtBox, styles.borderBottom]}>
                            {renderPlayerBox(2, 'R', true)}
                        </View>
                    </View>
                </View>

                {/* Net */}
                <View style={styles.netLine}>
                    <View style={styles.netMesh} />
                </View>

                {/* Team 1 Side (Bottom) */}
                <View style={styles.courtHalf}>
                    <View style={styles.courtRow}>
                        <View style={[styles.courtBox, styles.borderRight, styles.borderTop]}>
                            {renderPlayerBox(1, 'L', false)}
                        </View>
                        <View style={[styles.courtBox, styles.borderTop]}>
                            {renderPlayerBox(1, 'R', false)}
                        </View>
                    </View>
                </View>
            </View>
          </View>

          {/* Right Controls (Floating Buttons) */}
          <View style={styles.controlsColumn}>
              <TouchableOpacity 
                style={[styles.scoreBtn, {backgroundColor: TEAM_COLORS.team2}]} 
                onPress={() => handleScore(2)}
                activeOpacity={0.7}
              >
                  <Ionicons name="add" size={32} color="white" />
                  <Text style={styles.btnLabel}>T2</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.scoreBtn, {backgroundColor: TEAM_COLORS.team1}]} 
                onPress={() => handleScore(1)}
                activeOpacity={0.7}
              >
                  <Ionicons name="add" size={32} color="white" />
                  <Text style={styles.btnLabel}>T1</Text>
              </TouchableOpacity>
          </View>
      </Animated.View>

      <View style={styles.controlBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={undo} disabled={history.length === 0}>
             <Ionicons name="arrow-undo-outline" size={24} color={history.length===0 ? theme.colors.textSecondary : theme.colors.textPrimary} />
             <Text style={[styles.actionBtnText, { color: history.length === 0 ? theme.colors.textSecondary : theme.colors.textPrimary }]}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={resetSet}>
             <Ionicons name="refresh-outline" size={24} color={theme.colors.textPrimary} />
             <Text style={styles.actionBtnText}>Reset</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Stats', 'View detailed stats')}>
             <Ionicons name="stats-chart-outline" size={24} color={theme.colors.textPrimary} />
             <Text style={styles.actionBtnText}>Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.endBtn]} onPress={() => navigation.goBack()}>
             <Ionicons name="stop-circle-outline" size={24} color={theme.colors.error} />
             <Text style={[styles.actionBtnText, {color: theme.colors.error}]}>End</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  // Header
  header: {
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceHighlight,
      height: 90,
  },
  setBadge: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceHighlight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginRight: 10,
  },
  setBadgeTitle: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: 'bold' },
  setBadgeValue: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: 'bold' },

  scoreBoardResult: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  scoreSide: { flex: 1, alignItems: 'center' },
  bigScore: { fontSize: 36, fontWeight: '800' },
  teamNameLabel: { color: theme.colors.textSecondary, fontSize: 12, marginTop: -4, maxWidth: 80, textAlign:'center' },
  setsDots: { flexDirection: 'row', marginTop: 4, height: 6 },
  setDot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 1 },

  vsContainer: { marginHorizontal: 10, alignItems: 'center' },
  vsText: { color: theme.colors.textSecondary, fontWeight: '900', fontSize: 12, fontStyle:'italic' },
  setsHistory: { marginTop: 2 },
  historyText: { color: theme.colors.textSecondary, fontSize: 10 },

  // Main Area
  mainArea: {
      flex: 1,
      flexDirection: 'row',
      padding: 8,
  },
  courtBorder: {
      flex: 1,
      padding: 4,
      backgroundColor: theme.colors.court.background,
      borderRadius: 6,
      marginRight: 12,
      borderWidth: 1,
      borderColor: theme.colors.court.lines,
  },
  court: {
      flex: 1,
      borderColor: theme.colors.court.lines,
      borderWidth: 2,
  },
  courtHalf: { flex: 1 },
  courtRow: { flex: 1, flexDirection: 'row' },
  courtBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { flex: 1 },
  
  // Court Lines
  borderRight: { borderRightWidth: 2, borderRightColor: theme.colors.court.lines },
  borderBottom: { borderBottomWidth: 2, borderBottomColor: theme.colors.court.lines },
  borderTop: { borderTopWidth: 2, borderTopColor: theme.colors.court.lines },
  
  netLine: { 
      height: 12, 
      backgroundColor: 'rgba(0,0,0,0.1)', 
      width: '100%', 
      justifyContent: 'center' 
  },
  netMesh: {
      height: 2,
      borderStyle: 'dotted',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.9)',
      width: '100%',
  },

  // Player Pill
  playerPill: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: 20,
      minWidth: 90,
      maxWidth: 130,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
  },
  t1Pill: { borderColor: 'rgba(66, 153, 225, 0.4)' },
  t2Pill: { borderColor: 'rgba(245, 101, 101, 0.4)' },
  
  servingPill: { 
      backgroundColor: theme.colors.surface, 
      borderColor: theme.colors.secondary,
      transform: [{scale: 1.05}],
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
  },
  receivingPill: {
      backgroundColor: theme.colors.primary + '60', 
  },

  avatarCircle: {
      width: 24, height: 24, borderRadius: 12,
      justifyContent: 'center', alignItems: 'center',
      marginRight: 6,
  },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 10 },
  
  pillContent: { flex: 1 },
  playerName: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  roleText: { color: theme.colors.secondary, fontSize: 8, fontWeight: '700', marginTop: 1 },
  
  shuttleBadge: {
      marginLeft: 4,
      width: 16, height: 16, 
      justifyContent: 'center', alignItems: 'center'
  },

  // Controls
  controlsColumn: {
      width: 70,
      justifyContent: 'space-between',
      paddingVertical: 4,
  },
  scoreBtn: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 16,
      marginBottom: 8,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
  },
  btnLabel: { color: 'white', fontWeight: '900', fontSize: 16, marginTop: 4 },

  controlBar: { 
      flexDirection: 'row', 
      justifyContent: 'space-around', 
      paddingVertical: 12, 
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.surfaceHighlight
  },
  actionBtn: { alignItems: 'center' },
  actionBtnText: { color: theme.colors.textPrimary, fontSize: 10, marginTop: 4, fontWeight: '600' },
  endBtn: {},
});
