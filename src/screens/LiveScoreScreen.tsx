import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar, Dimensions, Animated, Easing, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
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
  const insets = useSafeAreaInsets();
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
  const scoreScale1 = useRef(new Animated.Value(1)).current;
  const scoreScale2 = useRef(new Animated.Value(1)).current;

  // Pulse Animation for Server
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Service Glide Animation
  const serviceAnimX = useRef(new Animated.Value(0)).current; 
  const serviceAnimY = useRef(new Animated.Value(0)).current;

  // Floating +1 Animation
  const [showPlusOne1, setShowPlusOne1] = useState(false);
  const [showPlusOne2, setShowPlusOne2] = useState(false);
  const plusOneY1 = useRef(new Animated.Value(0)).current;
  const plusOneOpacity1 = useRef(new Animated.Value(0)).current;
  const plusOneY2 = useRef(new Animated.Value(0)).current;
  const plusOneOpacity2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
    }).start();
    
    // Start looping pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);



  const triggerScoreAnim = (team: 1 | 2) => {
      const anim = team === 1 ? scoreScale1 : scoreScale2;
      Animated.sequence([
          Animated.timing(anim, { toValue: 1.5, duration: 150, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
          Animated.spring(anim, { toValue: 1, friction: 5, useNativeDriver: true })
      ]).start();
      
      // Trigger Floating +1
      const setVisible = team === 1 ? setShowPlusOne1 : setShowPlusOne2;
      const yAnim = team === 1 ? plusOneY1 : plusOneY2;
      const opAnim = team === 1 ? plusOneOpacity1 : plusOneOpacity2;

      setVisible(true);
      yAnim.setValue(0);
      opAnim.setValue(1);

      Animated.parallel([
          Animated.timing(yAnim, { toValue: -30, duration: 600, useNativeDriver: true }),
          Animated.timing(opAnim, { toValue: 0, duration: 600, useNativeDriver: true })
      ]).start(() => setVisible(false));
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Game State
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [sets, setSets] = useState<{ t1: number, t2: number }[]>([]);
  const [currentSet, setCurrentSet] = useState(1);
  const [setWins1, setSetWins1] = useState(0);
  const [setWins2, setSetWins2] = useState(0);
  
  // Setup Helper -> Removed Modal
  // Default state is Serving Team 1, Server Index 0
  const handlePlayerTap = (team: 1 | 2, tappedPlayerIdx: number) => {
      // Only allow at 0-0 start of match or set
      if (score1 !== 0 || score2 !== 0) return;

      // 1. If tapping the serving team -> Change Server
      if (team === servingTeam) {
          setServerIdx(tappedPlayerIdx);
          // Also Ensure they are in Right Box (for doubles) - simplified logic
          if (team === 1) setT1RightPlayerIdx(tappedPlayerIdx);
          else setT2RightPlayerIdx(tappedPlayerIdx);
      } 
      // 2. If tapping non-serving team -> Switch Serving Team
      else {
          setServingTeam(team);
          setServerIdx(tappedPlayerIdx);
          if (team === 1) setT1RightPlayerIdx(tappedPlayerIdx);
          else setT2RightPlayerIdx(tappedPlayerIdx);
      }
  };

  const manualSwapPositions = (team: 1 | 2) => {
       // Only allowed at 0-0
       if (score1 !== 0 || score2 !== 0) {
           Alert.alert("Cannot Swap", "Swapping positions is only allowed at the start of the set (0-0).");
           return;
       }
       
       if (team === 1) {
           const newRight = t1RightPlayerIdx === 0 ? 1 : 0;
           setT1RightPlayerIdx(newRight);
           if (servingTeam === 1) setServerIdx(newRight);
       } else {
           const newRight = t2RightPlayerIdx === 0 ? 1 : 0;
           setT2RightPlayerIdx(newRight);
           if (servingTeam === 2) setServerIdx(newRight);
       }
  };

  const toggleServingTeam = () => {
    const newTeam = servingTeam === 1 ? 2 : 1;
    setServingTeam(newTeam);
    
    // Auto-select correct server based on that team's score
    const newScore = newTeam === 1 ? score1 : score2;
    const isEven = newScore % 2 === 0;
    
    if (!isDoubles) {
         setServerIdx(0);
    } else {
         const currentRightIdx = newTeam === 1 ? t1RightPlayerIdx : t2RightPlayerIdx;
         setServerIdx(isEven ? currentRightIdx : (currentRightIdx === 0 ? 1 : 0));
    }
  };
  
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

  // View Mode ('SIDE' = Default, Left/Right | 'FRONT' = Old, Top/Bottom)
  const [viewMode, setViewMode] = useState<'SIDE' | 'FRONT'>('SIDE');
  
  // Stats Modal
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [endMatchModalVisible, setEndMatchModalVisible] = useState(false);

  // Update Service Position based on state
  useEffect(() => {
    let targetX = 0; // 0 = Left Column (or Left side of Row), 1 = Right Column/Side
    let targetY = 0; // 0 = Top Row (or Top of Col), 1 = Bottom Row/Side

    const isT1Serving = servingTeam === 1;
    // Determine if server is in the 'Right' pos (relative to team logic)
    // Team 1 Right Index vs Server Index
    const isT1Right = t1RightPlayerIdx === serverIdx;
    const isT2Right = t2RightPlayerIdx === serverIdx;

    if (viewMode === 'FRONT') {
        if (isT1Serving) {
            // Team 1 is Bottom Row
            targetY = 1; 
            targetX = isT1Right ? 1 : 0; // L=0, R=1
        } else {
            // Team 2 is Top Row
            targetY = 0;
            targetX = isT2Right ? 0 : 1; // R=0, L=1 (inverted view)
        }
    } else {
        // SIDE View
        if (isT1Serving) {
            // Team 1 is Left Column
            targetX = 0;
            targetY = isT1Right ? 1 : 0; // L=Top(0), R=Bottom(1)
        } else {
            // Team 2 is Right Column
            targetX = 1;
            targetY = isT2Right ? 0 : 1; // R=Top(0), L=Bottom(1)
        }
    }

    Animated.parallel([
        Animated.spring(serviceAnimX, { toValue: targetX, useNativeDriver: false, friction: 6, tension: 50 }),
        Animated.spring(serviceAnimY, { toValue: targetY, useNativeDriver: false, friction: 6, tension: 50 })
    ]).start();
  }, [servingTeam, serverIdx, t1RightPlayerIdx, t2RightPlayerIdx, viewMode]);

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
    
    // Animate Score
    triggerScoreAnim(winningTeam);

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
        isLive: false,
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
    setResetModalVisible(true);
  };

  const confirmReset = () => {
    setScore1(0);
    setScore2(0);
    setHistory([]);
    setT1RightPlayerIdx(0);
    setT2RightPlayerIdx(0);
    setResetModalVisible(false);
  };

  const handleEndMatch = (action: 'save' | 'discard') => {
      setEndMatchModalVisible(false);
      
      if (action === 'discard') {
          navigation.goBack();
          return;
      }

      // Save Logic
      let finalWinner: 1 | 2 = 1;
      if (setWins1 > setWins2) finalWinner = 1;
      else if (setWins2 > setWins1) finalWinner = 2;
      else {
          if (score1 >= score2) finalWinner = 1;
          else finalWinner = 2;
      }

      // Include current set in history if not empty
      const finalSets = [...sets];
      if (score1 > 0 || score2 > 0 || sets.length === 0) {
          finalSets.push({ t1: score1, t2: score2 });
      }

      const newMatch: Match = {
        id: Math.random().toString(),
        clubId: activeClub?.id || 'unknown',
        date: Date.now(),
        team1: team1.map(p => p.id), 
        team2: team2.map(p => p.id),
        scores: finalSets.map(s => ({ team1Score: s.t1, team2Score: s.t2 })),
        winnerTeam: finalWinner,
        isLive: false,
        stats: {
            maxConsecutivePts: { team1: maxStreak1, team2: maxStreak2 },
            pointsWonOnServe: { team1: servePoints1, team2: servePoints2 }
        },
        guestNames
      };
      
      recordMatch(newMatch);
      (navigation as any).replace('MatchOverview', { match: newMatch });
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
         
         // Standard Rules: Even -> Serve to Right Box. Odd -> Serve to Left Box.
         if (servingTeam === 1) {
             if (isEvenScore && position === 'R') isReceiving = true;
             if (!isEvenScore && position === 'L') isReceiving = true;
         } else {
             if (isEvenScore && position === 'R') isReceiving = true;
             if (!isEvenScore && position === 'L') isReceiving = true;
         }
     }

     return (
        <TouchableOpacity 
            activeOpacity={0.8}
            disabled={score1 !== 0 || score2 !== 0}
            onPress={() => handlePlayerTap(team, playerIdx)}
            style={[
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
                <Text style={styles.playerName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
                    {player?.name || (isDoubles ? 'P'+(playerIdx+1) : '')}
                </Text>
             </View>

             <View style={styles.roleIconContainer}>
                {isReceiving && (
                    <View style={[styles.roleBadge, {backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center'}]}>
                        <Text style={{fontSize: 14, lineHeight: 18}}>🏸</Text>
                    </View>
                )}
             </View>
        </TouchableOpacity>
     );
  };



  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Header / Scoreboard */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}>
         <View style={styles.setBadge}>
             <Text style={styles.setBadgeTitle}>SET</Text>
             <Text style={styles.setBadgeValue}>{currentSet}</Text>
         </View>

         <View style={styles.scoreBoardResult}>
             {/* Team 1 Score (Blue) */}
             <View style={styles.scoreSide}>
                 <Animated.Text style={[styles.bigScore, {color: TEAM_COLORS.team1, transform: [{scale: scoreScale1}]}]}>{score1}</Animated.Text>
                 {showPlusOne1 && (
                     <Animated.Text style={[styles.plusOneText, { opacity: plusOneOpacity1, transform: [{translateY: plusOneY1}] }]}>+1</Animated.Text>
                 )}
                 <Text style={styles.teamNameLabel} numberOfLines={2}  adjustsFontSizeToFit minimumFontScale={0.8}>{team1.map(p => p.name).join('/')}</Text>
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
                 <Animated.Text style={[styles.bigScore, {color: TEAM_COLORS.team2, transform: [{scale: scoreScale2}]}]}>{score2}</Animated.Text>
                 {showPlusOne2 && (
                     <Animated.Text style={[styles.plusOneText, { opacity: plusOneOpacity2, transform: [{translateY: plusOneY2}] }]}>+1</Animated.Text>
                 )}
                 <Text style={styles.teamNameLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{team2.map(p => p.name).join('/')}</Text>
                 <View style={styles.setsDots}>
                    {Array.from({length: setWins2}).map((_,i) => <View key={i} style={[styles.setDot, {backgroundColor: TEAM_COLORS.team2}]} />)}
                 </View>
             </View>
         </View>
      </View>

      {/* Court Visualisation */}
      <Animated.View style={[styles.mainArea, {opacity: fadeAnim}]}>
          <View style={styles.courtBorder}>
            <View style={[styles.court, {flexDirection: viewMode === 'SIDE' ? 'row' : 'column'}]}>
                
                {/* 
                    VIEW MODE LOGIC:
                    FRONT: Team 2 Top (Row), Net Horizontal, Team 1 Bottom (Row).
                    SIDE: Team 1 Left (Col), Net Vertical, Team 2 Right (Col).
                */}

                {viewMode === 'FRONT' ? (
                    <>
                        {/* Team 2 Side (Top) */}
                        <View style={[styles.courtHalf, { backgroundColor: TEAM_COLORS.team2 + '50' }]}>
                            <View style={styles.courtRow}>
                                <View style={[styles.courtBox, styles.borderRight, styles.borderBottom]}>
                                    {renderPlayerBox(2, 'R', true)}
                                </View>
                                <View style={[styles.courtBox, styles.borderBottom]}>
                                    {renderPlayerBox(2, 'L', true)}
                                </View>
                            </View>
                        </View>

                        {/* Net Horizontal */}
                        <View style={styles.netContainer}>
                            <View style={styles.netMesh} />
                            <View style={styles.netTopTape} />
                        </View>

                        {/* Team 1 Side (Bottom) */}
                        <View style={[styles.courtHalf, { backgroundColor: TEAM_COLORS.team1 + '50' }]}>
                            <View style={styles.courtRow}>
                                <View style={[styles.courtBox, styles.borderRight, styles.borderTop]}>
                                    {renderPlayerBox(1, 'L', false)}
                                </View>
                                <View style={[styles.courtBox, styles.borderTop]}>
                                    {renderPlayerBox(1, 'R', false)}
                                </View>
                            </View>
                        </View>
                    </>
                ) : (
                    <>
                        {/* Team 1 Side (Left) */}
                        <View style={[styles.courtHalf, { backgroundColor: TEAM_COLORS.team1 + '50' }]}>
                            <View style={[styles.courtRow, {flexDirection: 'column'}]}>
                                <View style={[styles.courtBox, styles.borderBottom, styles.borderRight]}>
                                    {renderPlayerBox(1, 'L', false)}
                                </View>
                                <View style={[styles.courtBox, styles.borderRight]}>
                                    {renderPlayerBox(1, 'R', false)}
                                </View>
                            </View>
                        </View>

                        {/* Net Vertical */}
                        <View style={styles.netContainerVertical}>
                            <View style={styles.netMeshVertical} />
                            <View style={styles.netTopTapeVertical} />
                        </View>

                        {/* Team 2 Side (Right) */}
                        <View style={[styles.courtHalf, { backgroundColor: TEAM_COLORS.team2 + '50' }]}>
                            <View style={[styles.courtRow, {flexDirection: 'column'}]}>
                                <View style={[styles.courtBox, styles.borderBottom, styles.borderLeft]}>
                                    {renderPlayerBox(2, 'R', true)} 
                                    {/* Note: T2 R is Top in side view? Let's check logic. 
                                        Facing Net (Left): Right is Top. So 'R' is Top box. */}
                                </View>
                                <View style={[styles.courtBox, styles.borderLeft]}>
                                    {renderPlayerBox(2, 'L', true)}
                                </View>
                            </View>
                        </View>
                    </>
                )}
                
                {/* Gliding Service Token */}
                <Animated.View style={[
                    styles.roleBadge, 
                    {
                        position: 'absolute',
                        backgroundColor: '#FFD700',
                        zIndex: 20,
                        width: 30, height: 30, borderRadius: 15,
                        left: serviceAnimX.interpolate({inputRange: [0, 1], outputRange: ['25%', '75%']}),
                        top: serviceAnimY.interpolate({inputRange: [0, 1], outputRange: ['25%', '75%']}),
                        transform: [
                            { translateX: -15 }, // Center anchor
                            { translateY: -15 },
                            { scale: pulseAnim }
                        ],
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4.65,
                        elevation: 8,
                    }
                ]}>
                    <MaterialCommunityIcons name="badminton" size={20} color="#000" />
                </Animated.View>

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

              {(score1 === 0 && score2 === 0) && (
                  <TouchableOpacity style={styles.miniSwapBtn} onPress={() => manualSwapPositions(2)}>
                      <Ionicons name="repeat" size={16} color="white" />
                  </TouchableOpacity>
              )}
              
              <View style={{flex: 0.1}} /> 

              {(score1 === 0 && score2 === 0) && (
                  <TouchableOpacity style={styles.miniSwapBtn} onPress={() => manualSwapPositions(1)}>
                      <Ionicons name="repeat" size={16} color="white" />
                  </TouchableOpacity>
              )}

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

      <View style={[styles.controlBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={undo} disabled={history.length === 0}>
             <Ionicons name="arrow-undo-outline" size={24} color={history.length===0 ? theme.colors.textSecondary : theme.colors.textPrimary} />
             <Text style={[styles.actionBtnText, { color: history.length === 0 ? theme.colors.textSecondary : theme.colors.textPrimary }]}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={resetSet}>
             <Ionicons name="refresh-outline" size={24} color={theme.colors.textPrimary} />
             <Text style={styles.actionBtnText}>Reset</Text>
        </TouchableOpacity>

        {(score1 === 0 && score2 === 0) && (
            <TouchableOpacity style={styles.actionBtn} onPress={toggleServingTeam}>
                 <Ionicons name="swap-horizontal-outline" size={24} color={theme.colors.textPrimary} />
                 <Text style={styles.actionBtnText}>Service</Text>
            </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionBtn} onPress={() => setViewMode(prev => prev === 'SIDE' ? 'FRONT' : 'SIDE')}>
             <Ionicons name={viewMode === 'SIDE' ? "phone-portrait-outline" : "phone-landscape-outline"} size={24} color={theme.colors.textPrimary} />
             <Text style={styles.actionBtnText}>{viewMode === 'SIDE' ? 'Side View' : 'Front View'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={() => setStatsModalVisible(true)}>
             <Ionicons name="stats-chart-outline" size={24} color={theme.colors.textPrimary} />
             <Text style={styles.actionBtnText}>Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.endBtn]} onPress={() => setEndMatchModalVisible(true)}>
             <Ionicons name="stop-circle-outline" size={24} color={theme.colors.error} />
             <Text style={[styles.actionBtnText, {color: theme.colors.error}]}>End</Text>
        </TouchableOpacity>
      </View>

      {/* End Match Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={endMatchModalVisible}
        onRequestClose={() => setEndMatchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>End Match Early?</Text>
                
                <Text style={styles.modalText}>
                    The match hasn't reached the winning score. How would you like to proceed?
                </Text>

                {(sets.length > 0 || score1 > 0 || score2 > 0) && (
                    <TouchableOpacity 
                        style={[styles.modalBtn, {backgroundColor: theme.colors.primary, marginBottom: 12}]} 
                        onPress={() => handleEndMatch('save')}
                    >
                        <Text style={styles.modalBtnText}>Save & End</Text>
                        <Text style={styles.modalBtnSubtext}>Records current score as final</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity 
                    style={[styles.modalBtn, {backgroundColor: theme.colors.error, marginBottom: 12}]} 
                    onPress={() => handleEndMatch('discard')}
                >
                    <Text style={styles.modalBtnText}>Discard Match</Text>
                    <Text style={styles.modalBtnSubtext}>Don't save any data</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.modalBtn, {backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.textSecondary}]} 
                    onPress={() => setEndMatchModalVisible(false)}
                >
                    <Text style={[styles.modalBtnText, {color: theme.colors.textPrimary}]}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={resetModalVisible}
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Reset Current Set?</Text>
                <Text style={{color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 20}}>
                    Are you sure you want to reset the current scores to 0-0? This action cannot be undone (you can clear local history though).
                </Text>

                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <TouchableOpacity 
                        style={[styles.closeButton, {backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.textSecondary, flex: 0.45}]} 
                        onPress={() => setResetModalVisible(false)}
                    >
                        <Text style={[styles.closeButtonText, {color: theme.colors.textPrimary}]}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.closeButton, {backgroundColor: theme.colors.error, flex: 0.45}]} 
                        onPress={confirmReset}
                    >
                        <Text style={styles.closeButtonText}>Reset</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={statsModalVisible}
        onRequestClose={() => setStatsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Match Statistics</Text>

                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Set Score</Text>
                    <View style={styles.statValueContainer}>
                        <Text style={[styles.statValue, {color: TEAM_COLORS.team1}]}>{setWins1}</Text>
                        <Text style={[styles.statValue, {color: TEAM_COLORS.team2}]}>{setWins2}</Text>
                    </View>
                </View>

                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Current Score</Text>
                    <View style={styles.statValueContainer}>
                        <Text style={[styles.statValue, {color: TEAM_COLORS.team1}]}>{score1}</Text>
                        <Text style={[styles.statValue, {color: TEAM_COLORS.team2}]}>{score2}</Text>
                    </View>
                </View>

                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Max Streak</Text>
                    <View style={styles.statValueContainer}>
                        <Text style={[styles.statValue, {color: TEAM_COLORS.team1}]}>{maxStreak1}</Text>
                        <Text style={[styles.statValue, {color: TEAM_COLORS.team2}]}>{maxStreak2}</Text>
                    </View>
                </View>

                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Points on Serve</Text>
                    <View style={styles.statValueContainer}>
                        <Text style={[styles.statValue, {color: TEAM_COLORS.team1}]}>{servePoints1}</Text>
                        <Text style={[styles.statValue, {color: TEAM_COLORS.team2}]}>{servePoints2}</Text>
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={() => setStatsModalVisible(false)}
                >
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
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
  teamNameLabel: { color: theme.colors.textSecondary, fontSize: 13, marginTop: -4, textAlign:'center', fontWeight: 'bold' },
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
  borderLeft: { borderLeftWidth: 2, borderLeftColor: theme.colors.court.lines },
  borderBottom: { borderBottomWidth: 2, borderBottomColor: theme.colors.court.lines },
  borderTop: { borderTopWidth: 2, borderTopColor: theme.colors.court.lines },
  
  netContainer: {
      height: 16,
      backgroundColor: 'rgba(0,0,0,0.15)',
      width: '100%',
      justifyContent: 'center',
      position: 'relative'
  },
  netMesh: {
      height: 4,
      borderStyle: 'dotted',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.7)',
      width: '100%',
      position: 'absolute',
      top: 6
  },
  netTopTape: {
      height: 2,
      backgroundColor: 'white',
      width: '100%',
      position: 'absolute',
      top: 0,
      opacity: 0.8
  },

  netContainerVertical: {
      width: 16,
      backgroundColor: 'rgba(0,0,0,0.15)',
      height: '100%',
      alignItems: 'center',
      position: 'relative'
  },
  netMeshVertical: {
      width: 4,
      borderStyle: 'dotted',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.7)',
      height: '100%',
      position: 'absolute',
      left: 6
  },
  netTopTapeVertical: {
      width: 2,
      backgroundColor: 'white',
      height: '100%',
      position: 'absolute',
      left: 0,
      opacity: 0.8
  },

  // Player Pill
  playerPill: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 24,
      minWidth: '70%',
      maxWidth: '95%',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.3)',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 3,
  },
  t1Pill: { borderColor: TEAM_COLORS.team1, borderLeftWidth: 4 },
  t2Pill: { borderColor: TEAM_COLORS.team2, borderLeftWidth: 4 },
  
  servingPill: { 
      backgroundColor: theme.colors.surface, 
      borderColor: theme.colors.secondary,
      borderLeftWidth: 4,
      transform: [{scale: 1.05}],
      shadowColor: theme.colors.secondary,
      shadowOpacity: 0.5,
      elevation: 8,
      zIndex: 10
  },
  receivingPill: {
      backgroundColor: 'rgba(0,0,0,0.85)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.5)'
  },

  avatarCircle: {
      width: 32, height: 32, borderRadius: 16,
      justifyContent: 'center', alignItems: 'center',
      marginRight: 10,
  },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  
  pillContent: { flex: 1, paddingRight: 4 },
  playerName: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },
  
  roleIconContainer: {
      marginLeft: 4,
      justifyContent: 'center', alignItems: 'center'
  },
  roleBadge: {
      width: 24, height: 24, 
      borderRadius: 12,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
  },

  // Controls
  controlsColumn: {
      width: 76,
      justifyContent: 'space-between',
      paddingVertical: 4,
      alignItems: 'center'
  },
  scoreBtn: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
      marginBottom: 8,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)'
  },
  miniSwapBtn: {
      backgroundColor: 'rgba(0,0,0,0.6)',
      width: 36, height: 36, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center',
      marginBottom: 8,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  btnLabel: { color: 'white', fontWeight: '900', fontSize: 24, marginTop: 4, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2 },

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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.surfaceHighlight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  statLabel: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      flex: 1,
  },
  statValueContainer: {
      flexDirection: 'row',
      width: 120,
      justifyContent: 'space-between',
  },
  statValue: {
      color: theme.colors.textPrimary,
      fontWeight: 'bold',
      fontSize: 16,
      width: 50,
      textAlign: 'center',
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalBtn: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
  },
  modalBtnText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
  },
  modalBtnSubtext: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12,
      marginTop: 2,
  },
  plusOneText: {
      position: 'absolute',
      top: -10,
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.secondary,
      zIndex: 10,
      textShadowColor: 'rgba(0,0,0,0.5)', 
      textShadowOffset: {width: 1, height: 1}, 
      textShadowRadius: 2 
  }
});
