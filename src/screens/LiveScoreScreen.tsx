import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, StatusBar, Platform, Dimensions } from 'react-native';
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
            styles.playerBox, 
            isServing && styles.servingBox,
            isReceiving && styles.receivingBox
        ]}>
             <Text style={[
                 styles.playerText, 
                 isServing && {color: '#F6AD55'},
                 isReceiving && {color: '#63B3ED'}
             ]} numberOfLines={1}>
                 {player?.name || (isDoubles ? 'P'+(playerIdx+1) : '')}
             </Text>
             {isServing && <View style={styles.shuttleIcon} />}
             {isReceiving && <View style={styles.receiverDot} />}
        </View>
     );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A202C" />
      
      {/* Scoreboard */}
      <View style={styles.scoreboard}>
         <View style={styles.timerBar}>
             <Text style={styles.setLabel}>SET {currentSet}</Text>
         </View>
         
         <View style={[styles.scoreRow, servingTeam === 1 && styles.servingRow]}>
             <Text style={styles.sbTeamName} numberOfLines={1}>{team1.map(p => p.name).join(' / ')}</Text>
             <View style={styles.pointsContainer}>
                 {sets.map((s, i) => <Text key={i} style={styles.pastSetScore}>{s.t1}</Text>)}
                 <Text style={styles.currentScore}>{score1}</Text>
             </View>
         </View>

         <View style={styles.divider} />

         <View style={[styles.scoreRow, servingTeam === 2 && styles.servingRow]}>
             <Text style={styles.sbTeamName} numberOfLines={1}>{team2.map(p => p.name).join(' / ')}</Text>
             <View style={styles.pointsContainer}>
                 {sets.map((s, i) => <Text key={i} style={styles.pastSetScore}>{s.t2}</Text>)}
                 <Text style={styles.currentScore}>{score2}</Text>
             </View>
         </View>
      </View>

      {/* Court Visualisation */}
      <View style={styles.mainArea}>
          {/* Court */}
          <View style={styles.court}>
             {/* Team 2 Side (Top) */}
             <View style={styles.courtHalf}>
                 <View style={styles.courtRow}>
                     {/* Screen Left (T2 Right) */}
                     <View style={[styles.courtBox, styles.borderRight, styles.borderBottom]}>
                        {renderPlayerBox(2, 'L', true)}
                     </View>
                     {/* Screen Right (T2 Left) */}
                     <View style={[styles.courtBox, styles.borderBottom]}>
                        {renderPlayerBox(2, 'R', true)}
                     </View>
                 </View>
             </View>

             {/* Net */}
             <View style={styles.net} />

             {/* Team 1 Side (Bottom) */}
             <View style={styles.courtHalf}>
                 <View style={styles.courtRow}>
                     {/* Screen Left (T1 Left) */}
                     <View style={[styles.courtBox, styles.borderRight, styles.borderTop]}>
                        {renderPlayerBox(1, 'L', false)}
                     </View>
                     {/* Screen Right (T1 Right) */}
                     <View style={[styles.courtBox, styles.borderTop]}>
                        {renderPlayerBox(1, 'R', false)}
                     </View>
                 </View>
             </View>
          </View>

          {/* Right Controls */}
          <View style={styles.controlsColumn}>
              {/* Top - Team 2 */}
              <TouchableOpacity 
                style={[styles.controlHalfBtn, {backgroundColor: '#F56565'}]} 
                onPress={() => handleScore(2)}
              >
                  <Text style={styles.sideBtnText}>+1</Text>
                  <Text style={styles.sideBtnSub}>Team 2</Text>
              </TouchableOpacity>
              
              {/* Net Spacer */}
              <View style={styles.netSpacer} />

              {/* Bottom - Team 1 */}
              <TouchableOpacity 
                style={[styles.controlHalfBtn, {backgroundColor: '#4299E1'}]} 
                onPress={() => handleScore(1)}
              >
                  <Text style={styles.sideBtnText}>+1</Text>
                  <Text style={styles.sideBtnSub}>Team 1</Text>
              </TouchableOpacity>
          </View>
      </View>


      <View style={styles.controlBar}>
        <TouchableOpacity style={styles.controlBtn} onPress={undo} disabled={history.length === 0}>
             <Text style={[styles.controlText, history.length === 0 && { color: '#718096' }]}>↩ Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={() => Alert.alert('Swap Sides', 'Manually swap ends (not visualised yet)')}>
             <Text style={styles.controlText}>⇄ Swap</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={() => navigation.goBack()}>
             <Text style={styles.controlText}>End</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171923',
  },
  scoreboard: {
      backgroundColor: '#2D3748',
      margin: 10,
      borderRadius: 12,
      padding: 8,
      elevation: 4,
  },
  timerBar: { alignItems: 'center', marginBottom: 6 },
  setLabel: { color: '#A0AEC0', fontSize: 12, fontWeight: 'bold' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  servingRow: { },
  sbTeamName: { fontSize: 16, color: 'white', fontWeight: '600', flex: 1 },
  pointsContainer: { flexDirection: 'row', alignItems: 'center' },
  pastSetScore: { fontSize: 16, color: '#A0AEC0', marginRight: 12 },
  currentScore: { fontSize: 24, fontWeight: 'bold', color: 'white', width: 32, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#4A5568', marginVertical: 6 },

  mainArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingHorizontal: 4,
  },
  sideBtn: {
      width: 50,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 10,
  },
  sideBtnText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 24
  },
  sideBtnSub: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 10,
      fontWeight: '600',
      marginTop: 4
  },
  court: {
      flex: 1,
      marginRight: 8,
      marginVertical: 10,
      borderColor: 'white',
      borderWidth: 2,
      backgroundColor: '#2D3748'
  },
  controlsColumn: {
      width: 70,
      marginVertical: 10,
      justifyContent: 'space-between',
  },
  controlHalfBtn: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
  },
  netSpacer: {
      height: 8,
  },
  courtHalf: { flex: 1 },
  courtRow: { flex: 1, flexDirection: 'row' },
  courtBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  borderRight: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.3)' },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)' },
  borderTop: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)' },
  net: { height: 4, backgroundColor: 'rgba(255,255,255,0.6)', width: '100%' },
  
  playerBox: { alignItems: 'center' },
  emptyBox: {},
  servingBox: {  },
  playerText: { color: 'white', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  shuttleIcon: {
      width: 10, height: 10, borderRadius: 5, backgroundColor: '#F6AD55', marginTop: 4
  },
  receivingBox: {
      backgroundColor: 'rgba(99, 179, 237, 0.1)', // Light blue tint
      padding: 4,
      borderRadius: 4
  },
  receiverDot: {
      width: 6, height: 6, borderRadius: 3, backgroundColor: '#63B3ED', marginTop: 6
  },
  
  controlBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#2D3748' },
  controlBtn: { padding: 8 },
  controlText: { color: '#E2E8F0', fontSize: 14, fontWeight: '600' }
});
