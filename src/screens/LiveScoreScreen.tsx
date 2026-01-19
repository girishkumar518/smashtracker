import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, StatusBar, Platform, Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { useClub } from '../context/ClubContext';
import { Match, MatchSet } from '../models/types';

// Rich UI Theme
const THEME = {
  court: '#0F766E', // Deep Teal Green
  courtBorder: '#FFFFFF',
  lines: 'rgba(255,255,255,0.4)',
  net: 'rgba(255,255,255,0.9)',
  team1: '#3182CE', // Blue
  team2: '#E53E3E', // Red
  bg: '#171923',
  surface: '#2D3748',
  text: '#FFFFFF',
  accent: '#F6AD55', // Orange/Gold for shuttle
  scoreBg: '#000000',
};

// Types for params
type LiveScoreParams = {
  isDoubles: boolean;
  team1: { id: string; name: string }[];
  team2: { id: string; name: string }[];
  matchType?: 1 | 3;
  pointsPerSet?: number;
  goldenPoint?: boolean;
};

export default function LiveScoreScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { 
    team1, team2, matchType = 3, isDoubles, 
    pointsPerSet = 21, goldenPoint = false 
  } = route.params as LiveScoreParams;
  const { recordMatch, activeClub } = useClub();

  // Game State
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [sets, setSets] = useState<{ t1: number, t2: number }[]>([]);
  const [currentSet, setCurrentSet] = useState(1);
  const [setWins1, setSetWins1] = useState(0);
  const [setWins2, setSetWins2] = useState(0);
  
  // Advanced Service Logic
  // 1 or 2 (Team); 0 or 1 (Player Index)
  const [servingTeam, setServingTeam] = useState<1 | 2>(1);
  const [serverIdx, setServerIdx] = useState(0); // 0 or 1
  const [receiverIdx, setReceiverIdx] = useState(0); // 0 or 1

  // Player Positioning (simplified for UI: Even=Right, Odd=Left)
  // We can just imply position from Score % 2. 
  // But strictly, players swap sides only on OWN point win.
  // Let's manually track "Who is on Right Court".
  const [t1RightPlayerIdx, setT1RightPlayerIdx] = useState(0); // Start with P1 on Right (Even)
  const [t2RightPlayerIdx, setT2RightPlayerIdx] = useState(0); // Start with P1 on Right (Even)

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

    const isMidGameWin = (winningTeam === 1 && !checkSetWin(score1 + 1, score2)) ||
                         (winningTeam === 2 && !checkSetWin(score2 + 1, score1));

    if (winningTeam === 1) {
      // Team 1 Wins Point
      if (checkSetWin(score1 + 1, score2)) {
        winSet(1);
        return;
      }
      
      const newScore = score1 + 1;
      setScore1(newScore);

      if (servingTeam === 1) {
        // T1 served and won -> Swap sides
        if (isDoubles) {
          setT1RightPlayerIdx(prev => prev === 0 ? 1 : 0); // Swap
        }
      } else {
        // T2 served and lost (Sideout) -> T1 serves now
        setServingTeam(1);
        // Who serves? The one standing on the court corresponding to Even/Odd score
        // Even score -> Right Court. Odd score -> Left Court.
        const isEven = newScore % 2 === 0;
        
        if (!isDoubles) {
             setServerIdx(0);
        } else {
             // If isEven, the person on Right serves.
             // t1RightPlayerIdx tells us who is on Right.
             setServerIdx(isEven ? t1RightPlayerIdx : (t1RightPlayerIdx === 0 ? 1 : 0));
        }
      }

    } else {
      // Team 2 Wins Point
      if (checkSetWin(score2 + 1, score1)) {
        winSet(2);
        return;
      }

      const newScore = score2 + 1;
      setScore2(newScore);

      if (servingTeam === 2) {
        // T2 served and won -> Swap sides
        if (isDoubles) {
             setT2RightPlayerIdx(prev => prev === 0 ? 1 : 0); 
        }
      } else {
        // T1 served and lost (Sideout) -> T2 serves now
        setServingTeam(2);
        const isEven = newScore % 2 === 0;

        if (!isDoubles) {
             setServerIdx(0);
        } else { 
             // T2 Right Court is Screen Left. Even -> Right Court (Screen Left).
             // t2RightPlayerIdx is Screen Right (T2 Left Court).
             // So if Even, we want the OTHER player (Screen Left).
             const screenLeftIdx = t2RightPlayerIdx === 0 ? 1 : 0;
             setServerIdx(isEven ? screenLeftIdx : t2RightPlayerIdx);
        }
      }
    }
  };

  const checkSetWin = (s1: number, s2: number) => {
    if (goldenPoint) {
       // Sudden death at MAX_POINTS
       if (s1 >= MAX_POINTS) return true;
       return false;
    }

    // Standard Deuce Logic
    if (s1 >= MAX_POINTS) {
        if (s1 - s2 >= 2) return true;
        if (s1 === CAP_POINTS) return true; // Max cap (e.g. 30)
    }
    return false;
  };

  const winSet = (winner: 1 | 2) => {
    const finalSetScore = { team1Score: winner === 1 ? score1 + 1 : score1, team2Score: winner === 2 ? score2 + 1 : score2 };
    const newSets = [...sets, { t1: finalSetScore.team1Score, t2: finalSetScore.team2Score }];
    setSets(newSets);
    
    // Reset scores & Positions for next set
    setScore1(0);
    setScore2(0);
    setT1RightPlayerIdx(0); // Reset positions standard
    setT2RightPlayerIdx(0);
    // Winner serves first in next set? Or loser? Standard is winner serves.
    setServingTeam(winner); 
    setServerIdx(0); // Default to first player serving
    
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
        }
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
    
    // Restore Stats
    setCurrStreak1(prev.currStreak1);
    setCurrStreak2(prev.currStreak2);
    setMaxStreak1(prev.maxStreak1);
    setMaxStreak2(prev.maxStreak2);
    setServePoints1(prev.servePoints1);
    setServePoints2(prev.servePoints2);

    setHistory(history.slice(0, -1));
  };

  // Helper to render a player in a court box
  const renderPlayerBox = (team: 1 | 2, position: 'L' | 'R', isTop: boolean) => {
     let playerIdx = 0;
     if (team === 1) {
        // Team 1 (Bottom)
        // t1RightPlayerIdx tells us who is on Right.
        const rightIdx = t1RightPlayerIdx;
        const leftIdx = rightIdx === 0 ? 1 : 0;
        playerIdx = position === 'R' ? rightIdx : leftIdx;
     } else {
        // Team 2 (Top) - Inverted view?
        // Standard view: Top Right is "Left" from their perspective? 
        // Let's stick to screen-absolute Left/Right for simplicity.
        // Screen Right = Team 2's Left (if facing net).
        // Let's keep it abstract: "Right side of screen".
        const rightIdx = t2RightPlayerIdx;
        const leftIdx = rightIdx === 0 ? 1 : 0;
        playerIdx = position === 'R' ? rightIdx : leftIdx;
     }

     // If singles, we only use the 'Right' box (Even) and 'Left' box (Odd) to show position?
     // No, singles player takes whole court.
     // But we visualise service box.
     if (!isDoubles) {
         // In Singles, BOTH players position relative to the Server's Score (Diagonal Service)
         const servingScore = servingTeam === 1 ? score1 : score2;
         const isEvenServe = servingScore % 2 === 0;

         if (team === 1) {
             // Team 1 (Bottom)
             // Even Serve -> Right (BR). Odd Serve -> Left (BL).
             const shouldBeHere = (isEvenServe && position === 'R') || (!isEvenServe && position === 'L');
             if (!shouldBeHere) return <View style={styles.emptyBox} />;
             playerIdx = 0;
         }
         
         if (team === 2) {
             // Team 2 (Top)
             // Even Serve -> Left (TL/Screen Left). Odd Serve -> Right (TR/Screen Right).
             const shouldBeHere = (isEvenServe && position === 'L') || (!isEvenServe && position === 'R');
             if (!shouldBeHere) return <View style={styles.emptyBox} />;
             playerIdx = 0;
         }
     }

     const player = team === 1 ? team1[playerIdx] : team2[playerIdx];
     if (!player && isDoubles) return <View style={styles.emptyBox} />; // Short team?

     const isServing = servingTeam === team && serverIdx === playerIdx;
     
     // Highlight Receiver
     let isReceiving = false;
     if (team !== servingTeam) { 
         const servingScore = servingTeam === 1 ? score1 : score2;
         const isEvenScore = servingScore % 2 === 0;
         
         // Logic: Receiver is diagonal to Server
         if (servingTeam === 1) {
             // T1 Serves (Bottom)
             // Even Score (Right Court) -> Receives Top Left (L)
             // Odd Score (Left Court) -> Receives Top Right (R)
             if (isEvenScore && position === 'L') isReceiving = true;
             if (!isEvenScore && position === 'R') isReceiving = true;
         } else {
             // T2 Serves (Top)
             // Even Score (Right Court = Screen Left) -> Receives Bottom Right (R)
             // Odd Score (Left Court = Screen Right) -> Receives Bottom Left (L)
             
             // Wait, T2 Right Court is Screen Left.
             // Diagonal from Screen Left (Top) is Screen Right (Bottom).
             // So T2 Even Score -> Receives Bottom Right ('R').
             
             if (isEvenScore && position === 'R') isReceiving = true;
             if (!isEvenScore && position === 'L') isReceiving = true;
         }
     }

     return (
        <View style={[
            styles.playerPill,
            isServing && styles.servingPill,
            isReceiving && styles.receivingPill
        ]}>
             <View style={[styles.avatarCircle, { backgroundColor: team === 1 ? THEME.team1 : THEME.team2 }]}>
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
                     <Ionicons name="tennisball" size={14} color="#000" />
                 </View>
             )}
        </View>
     );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />
      
      {/* Header / Scoreboard */}
      <View style={styles.header}>
         <View style={styles.setBadge}>
             <Text style={styles.setBadgeTitle}>SET</Text>
             <Text style={styles.setBadgeValue}>{currentSet}</Text>
         </View>

         <View style={styles.scoreBoardResult}>
             {/* Team 1 Score (Blue) */}
             <View style={styles.scoreSide}>
                 <Text style={[styles.bigScore, {color: THEME.team1}]}>{score1}</Text>
                 <Text style={styles.teamNameLabel} numberOfLines={1}>{team1.map(p => p.name).join('/')}</Text>
                 <View style={styles.setsDots}>
                    {Array.from({length: setWins1}).map((_,i) => <View key={i} style={[styles.setDot, {backgroundColor: THEME.team1}]} />)}
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
                 <Text style={[styles.bigScore, {color: THEME.team2}]}>{score2}</Text>
                 <Text style={styles.teamNameLabel} numberOfLines={1}>{team2.map(p => p.name).join('/')}</Text>
                 <View style={styles.setsDots}>
                    {Array.from({length: setWins2}).map((_,i) => <View key={i} style={[styles.setDot, {backgroundColor: THEME.team2}]} />)}
                 </View>
             </View>
         </View>
      </View>

      {/* Court Visualisation */}
      <View style={styles.mainArea}>
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
                style={[styles.scoreBtn, {backgroundColor: THEME.team2}]} 
                onPress={() => handleScore(2)}
                activeOpacity={0.7}
              >
                  <Ionicons name="add" size={32} color="white" />
                  <Text style={styles.btnLabel}>T2</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.scoreBtn, {backgroundColor: THEME.team1}]} 
                onPress={() => handleScore(1)}
                activeOpacity={0.7}
              >
                  <Ionicons name="add" size={32} color="white" />
                  <Text style={styles.btnLabel}>T1</Text>
              </TouchableOpacity>
          </View>
      </View>

      <View style={styles.controlBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={undo} disabled={history.length === 0}>
             <Ionicons name="arrow-undo-outline" size={24} color={history.length===0 ? '#555' : 'white'} />
             <Text style={[styles.actionBtnText, history.length === 0 && { color: '#555' }]}>Undo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Stats', 'View detailed stats')}>
             <Ionicons name="stats-chart-outline" size={24} color="white" />
             <Text style={styles.actionBtnText}>Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.endBtn]} onPress={() => navigation.goBack()}>
             <Ionicons name="stop-circle-outline" size={24} color="#FEB2B2" />
             <Text style={[styles.actionBtnText, {color: '#FEB2B2'}]}>End</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  
  // Header
  header: {
      backgroundColor: THEME.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#4A5568',
      height: 90,
  },
  setBadge: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1A202C',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginRight: 10,
  },
  setBadgeTitle: { color: '#718096', fontSize: 10, fontWeight: 'bold' },
  setBadgeValue: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  scoreBoardResult: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  scoreSide: { flex: 1, alignItems: 'center' },
  bigScore: { fontSize: 36, fontWeight: '800' },
  teamNameLabel: { color: '#A0AEC0', fontSize: 12, marginTop: -4, maxWidth: 80, textAlign:'center' },
  setsDots: { flexDirection: 'row', marginTop: 4, height: 6 },
  setDot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 1 },

  vsContainer: { marginHorizontal: 10, alignItems: 'center' },
  vsText: { color: '#718096', fontWeight: '900', fontSize: 12, fontStyle:'italic' },
  setsHistory: { marginTop: 2 },
  historyText: { color: '#718096', fontSize: 10 },

  // Main Area
  mainArea: {
      flex: 1,
      flexDirection: 'row',
      padding: 8,
  },
  courtBorder: {
      flex: 1,
      padding: 4,
      backgroundColor: '#0F766E', // Match THEME.court
      borderRadius: 6,
      marginRight: 12,
      borderWidth: 1,
      borderColor: '#FFFFFF',
  },
  court: {
      flex: 1,
      borderColor: 'white',
      borderWidth: 2,
  },
  courtHalf: { flex: 1 },
  courtRow: { flex: 1, flexDirection: 'row' },
  courtBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Court Lines
  borderRight: { borderRightWidth: 2, borderRightColor: THEME.lines },
  borderBottom: { borderBottomWidth: 2, borderBottomColor: THEME.lines },
  borderTop: { borderTopWidth: 2, borderTopColor: THEME.lines },
  
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
      backgroundColor: 'rgba(30, 40, 50, 0.85)',
      borderColor: THEME.accent,
      transform: [{scale: 1.05}],
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
  },
  receivingPill: {
      backgroundColor: 'rgba(255,255,255,0.1)',
  },

  avatarCircle: {
      width: 24, height: 24, borderRadius: 12,
      justifyContent: 'center', alignItems: 'center',
      marginRight: 6,
  },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 10 },
  
  pillContent: { flex: 1 },
  playerName: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  roleText: { color: THEME.accent, fontSize: 8, fontWeight: '700', marginTop: 1 },
  
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
      backgroundColor: '#2D3748',
      borderTopWidth: 1,
      borderTopColor: '#4A5568'
  },
  actionBtn: { alignItems: 'center' },
  actionBtnText: { color: 'white', fontSize: 10, marginTop: 4, fontWeight: '600' },
  endBtn: {},
});
