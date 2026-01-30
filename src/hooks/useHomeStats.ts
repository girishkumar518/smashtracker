import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import { useStats } from '../context/StatsContext';

export type StatsMode = 'overall' | 'day' | 'month';

export const useHomeStats = () => {
    const { user } = useAuth();
    const { members, allUsers } = useClub();
    const { refreshGlobalStats, allMatches } = useStats();

    const [statsMode, setStatsMode] = useState<StatsMode>('overall');
    const [statsDate, setStatsDate] = useState(new Date());
    const [refreshing, setRefreshing] = useState(false);

    // Data helpers
    const getPlayerName = useCallback((id: string, match?: any) => {
        // 1. Check if it's a Guest in THIS specific match
        if (match?.guestNames && match.guestNames[id]) {
            return match.guestNames[id];
        }
        
        // 2. Check if it's a known Member
        const member = members.find(m => m.id === id);
        if (member) return member.displayName;

        // 3. Check if it's in the global user cache (including past members)
        const userObj = allUsers?.find(u => u.id === id);
        if (userObj) return userObj.displayName;

        // 4. Fallback: Check if it LOOKS like a guest ID but name is missing
        if (id.startsWith('guest_')) return 'Guest Player';

        return 'Unknown';
    }, [members, allUsers]);

    const stats = useMemo(() => {
        if (!allMatches || !allMatches.length || !user) return { played: 0, winRate: 0, wins: 0, losses: 0, bestPartner: null };

        let played = 0;
        let wins = 0;
        const partnerStats: {[key: string]: {played: number, wins: number, name: string}} = {};

        allMatches.forEach(m => {
            const userId = user.id;
            const inTeam1 = m.team1.includes(userId);
            const inTeam2 = m.team2.includes(userId);

            if (inTeam1 || inTeam2) {
                played++;
                // @ts-ignore
                const won = (inTeam1 && m.winnerTeam == 1) || (inTeam2 && m.winnerTeam == 2);
                if (won) wins++;
                
                let partnerId = '';
                if (inTeam1 && m.team1.length > 1) {
                    partnerId = m.team1.find((id: string) => id !== userId) || '';
                } else if (inTeam2 && m.team2.length > 1) {
                    partnerId = m.team2.find((id: string) => id !== userId) || '';
                }

                if (partnerId) {
                    if (!partnerStats[partnerId]) {
                        partnerStats[partnerId] = { played: 0, wins: 0, name: getPlayerName(partnerId, m) };
                    }
                    // If the name was previously unknown/generic but this match has a better name (e.g. from guestNames), update it
                    if (partnerStats[partnerId].name === 'Unknown' || partnerStats[partnerId].name === 'Guest Player') {
                        const potentialName = getPlayerName(partnerId, m);
                        if (potentialName !== 'Unknown' && potentialName !== 'Guest Player') {
                            partnerStats[partnerId].name = potentialName;
                        }
                    }

                    partnerStats[partnerId].played++;
                    if (won) partnerStats[partnerId].wins++;
                }
            }
        });

        let bestPartner: { played: number; wins: number; name: string; rate: number } | null = null;
        let maxRate = -1;

        Object.keys(partnerStats).forEach(id => {
            const s = partnerStats[id];
            const rate = s.wins / s.played;
            if (rate > maxRate || (rate === maxRate && s.played > (bestPartner?.played || 0))) {
                maxRate = rate;
                bestPartner = { ...s, rate: Math.round(rate * 100) };
            }
        });

        return {
            played,
            winRate: played > 0 ? Math.round((wins / played) * 100) : 0,
            wins,
            losses: played - wins,
            bestPartner
        };
    }, [allMatches, user, getPlayerName]);

    const periodStats = useMemo(() => {
        // 1. Calculate Time Range
        let start = new Date(statsDate);
        let end = new Date(statsDate);
        
        if (statsMode === 'day') {
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
        } else if (statsMode === 'month') {
            // Month Mode: Start of month to End of month
            start.setDate(1);
            start.setHours(0,0,0,0);
            
            end.setMonth(end.getMonth() + 1);
            end.setDate(0); // Last day of previous month (which is current month in this calc)
            end.setHours(23,59,59,999);
        } else {
            // Overall: From beginning of time until now (end of today)
            start = new Date(0); // Epoch
            end = new Date();
            end.setHours(23,59,59,999); // Include all matches from today
        }

        const relevantMatches = allMatches?.filter(m => m.date >= start.getTime() && m.date <= end.getTime()) || [];

        if (relevantMatches.length === 0) return null;

        const playerStats: Record<string, { played: number; wins: number; points: number; name: string }> = {};
        const partnershipStats: Record<string, { wins: number; name: string }> = {};
        
        // User Specific Stats for Period
        const myStats = { played: 0, wins: 0, losses: 0, points: 0 };
        const myPartners: Record<string, { played: number, wins: number, name: string }> = {};

        // Sort ascending for streak calculation
        const sortedMatches = [...relevantMatches].sort((a, b) => a.date - b.date);
        const currentStreaks: Record<string, number> = {};
        const bestStreaks: Record<string, number> = {};
        const playerNames: Record<string, string> = {}; // cache names

        sortedMatches.forEach(m => {
            const t1 = (m.team1 || []);
            const t2 = (m.team2 || []);
            const allPlayers = [...t1, ...t2];
            const userId = user?.id;
            
            // Resolve Names
            allPlayers.forEach((pid: string) => {
                if (!playerNames[pid] || playerNames[pid] === 'Unknown' || playerNames[pid] === 'Guest Player') {
                        const name = getPlayerName(pid, m);
                        if (name && name !== 'Unknown' && name !== 'Guest Player') {
                            playerNames[pid] = name;
                        } else if (!playerNames[pid]) {
                            playerNames[pid] = 'Unknown';
                        }
                }
            });

            // Determine Winner Team (Handle potential string vs number values)
            let winnerTeam = m.winnerTeam;
            // @ts-ignore
            const winnerPlayers = winnerTeam == 1 ? t1 : (winnerTeam == 2 ? t2 : []);
            
            // --- 1. Basic Stats & Streaks ---
            allPlayers.forEach((pid: string) => {
                if (!playerStats[pid]) {
                    playerStats[pid] = { played: 0, wins: 0, points: 0, name: playerNames[pid] };
                    currentStreaks[pid] = 0;
                    bestStreaks[pid] = 0;
                }
                // Update Name if better found
                playerStats[pid].name = playerNames[pid];

                playerStats[pid].played++;
                
                // @ts-ignore
                if (winnerPlayers.includes(pid)) {
                    playerStats[pid].wins++;
                    playerStats[pid].points += 3; // Win 3 pts
                    
                    // Streak Update
                    currentStreaks[pid] = (currentStreaks[pid] || 0) + 1;
                    if (currentStreaks[pid] > bestStreaks[pid]) {
                        bestStreaks[pid] = currentStreaks[pid];
                    }
                } else {
                    playerStats[pid].points += 1; // Play 1 pt
                    // Streak Reset
                    currentStreaks[pid] = 0;
                }
            });

            // --- 1.5 Personal Stats Calculation ---
            // @ts-ignore
            if (userId && (t1.includes(userId) || t2.includes(userId))) {
                // @ts-ignore
                const myTeam = t1.includes(userId) ? t1 : t2;
                // @ts-ignore
                const iWon = (t1.includes(userId) && winnerTeam == 1) || (t2.includes(userId) && winnerTeam == 2);
                
                myStats.played++;
                if (iWon) myStats.wins++; else myStats.losses++;
                myStats.points += iWon ? 3 : 1;

                // Partner logic
                if (myTeam.length > 1) {
                    // @ts-ignore
                    const partnerId = myTeam.find((id: string) => id !== userId);
                    if (partnerId) {
                        if (!myPartners[partnerId]) myPartners[partnerId] = { played: 0, wins: 0, name: playerNames[partnerId] || 'Unknown' };
                        // update partner name if unknown
                        if (myPartners[partnerId].name === 'Unknown' && playerNames[partnerId]) myPartners[partnerId].name = playerNames[partnerId];

                        myPartners[partnerId].played++;
                        if (iWon) myPartners[partnerId].wins++;
                    }
                }
            }

            // --- 2. Partnership Stats (Doubles Only) ---
            if (t1.length === 2 && t2.length === 2) {
                    // @ts-ignore
                    const winningPair = winnerTeam == 1 ? t1 : (winnerTeam == 2 ? t2 : null);
                    if (winningPair) {
                        // @ts-ignore
                        const pairId = [...winningPair].sort().join('_'); // Unique ID for pair
                        if (!partnershipStats[pairId]) {
                            // @ts-ignore
                            const p1Name = playerNames[winningPair[0]]?.split(' ')[0] || 'Unknown';
                            // @ts-ignore
                            const p2Name = playerNames[winningPair[1]]?.split(' ')[0] || 'Unknown';
                            partnershipStats[pairId] = { wins: 0, name: `${p1Name} & ${p2Name}` };
                        }
                        partnershipStats[pairId].wins++;
                    }
            }
        });

        // --- 3. Top Teams (Club Dominance) from RELEVANT matches ---
        const teamStats: Record<string, { wins: number, played: number, ids: string[] }> = {};
        
        sortedMatches.forEach(m => {
            // Team 1 Pair
            if (m.team1 && m.team1.length === 2) {
                    const key = [...m.team1].sort().join(',');
                    if (!teamStats[key]) teamStats[key] = { wins: 0, played: 0, ids: m.team1 };
                    teamStats[key].played++;
                    // @ts-ignore
                    if (m.winnerTeam == 1) teamStats[key].wins++;
            }
            // Team 2 Pair
            if (m.team2 && m.team2.length === 2) {
                    const key = [...m.team2].sort().join(',');
                    if (!teamStats[key]) teamStats[key] = { wins: 0, played: 0, ids: m.team2 };
                    teamStats[key].played++;
                    // @ts-ignore
                    if (m.winnerTeam == 2) teamStats[key].wins++;
            }
        });

        // Filter & Sort for Top Teams
        // Min matches depends on period? Let's keep it 2 for now to show data.
        let qualified = Object.values(teamStats).filter(t => t.played >= 2);
        
        // Sort: Unbeaten > Win Rate > Volume
        qualified.sort((a, b) => {
            const aLosses = a.played - a.wins;
            const bLosses = b.played - b.wins;
            
            // 1. Unbeaten Check
            if (aLosses === 0 && bLosses > 0) return -1;
            if (bLosses === 0 && aLosses > 0) return 1;

            // 2. Win Rate
            const aRate = a.wins / a.played;
            const bRate = b.wins / b.played;
            if (bRate !== aRate) return bRate - aRate;

            // 3. Volume
            return b.wins - a.wins;
        });

        const topTeams = qualified.slice(0, 3);

        // FIND LEADERS
        let mostPlayed = { name: '-', val: 0 };
        let mostWins = { name: '-', val: 0 };
        let mostPoints = { name: '-', val: 0 };
        let bestPartnership = { name: '-', val: 0 };
        let longestStreak = { name: '-', val: 0 };

        // Find PERSONAL Best Partner
        let myBestPartner: { played: number; wins: number; name: string; rate: number } | null = null;
        let maxRate = -1;
        Object.values(myPartners).forEach(p => {
            const rate = p.wins / p.played;
            if (rate > maxRate || (rate === maxRate && p.played > (myBestPartner?.played || 0))) {
                maxRate = rate;
                myBestPartner = { ...p, rate: Math.round(rate * 100) };
            }
        });

        Object.values(playerStats).forEach(stat => {
            if (stat.played > mostPlayed.val) mostPlayed = { name: stat.name, val: stat.played };
            if (stat.wins > mostWins.val) mostWins = { name: stat.name, val: stat.wins };
            if (stat.points > mostPoints.val) mostPoints = { name: stat.name, val: stat.points };
        });

        Object.entries(bestStreaks).forEach(([pid, streak]) => {
                if (streak > longestStreak.val) {
                    longestStreak = { name: playerNames[pid] || 'Unknown', val: streak };
                }
        });

        Object.values(partnershipStats).forEach(stat => {
            if (stat.wins > bestPartnership.val) {
                bestPartnership = { name: stat.name, val: stat.wins };
            }
        });

        return {
            totalMatches: relevantMatches.length,
            mostPlayed,
            mostWins,
            mostPoints,
            bestPartnership,
            longestStreak,
            myStats, // Exposed
            myBestPartner, // Exposed
            topTeams // Exposed
        };
    }, [allMatches, statsMode, statsDate, getPlayerName, user]);

    const changeDate = (direction: -1 | 1) => {
        const newIn = new Date(statsDate);
        if (statsMode === 'day') {
            newIn.setDate(newIn.getDate() + direction);
        } else {
            newIn.setMonth(newIn.getMonth() + direction);
        }
        setStatsDate(newIn);
    };

    const formattedDateLabel = useMemo(() => {
        if (statsMode === 'overall') return "All Time";
        
        const today = new Date();
        if (statsMode === 'day') {
            if (statsDate.toDateString() === today.toDateString()) return "Today";
            const yest = new Date(); yest.setDate(yest.getDate() - 1);
            if (statsDate.toDateString() === yest.toDateString()) return "Yesterday";
            return statsDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        } else {
            if (statsDate.getMonth() === today.getMonth() && statsDate.getFullYear() === today.getFullYear()) return "This Month";
            return statsDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
    }, [statsDate, statsMode]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (refreshGlobalStats) {
            await refreshGlobalStats();
        }
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    }, [refreshGlobalStats]);

    return {
        statsMode,
        setStatsMode,
        statsDate,
        setStatsDate,
        refreshing,
        onRefresh,
        stats,
        periodStats,
        changeDate,
        formattedDateLabel,
        getPlayerName
    };
};
