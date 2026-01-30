import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Match, SeededUser } from '../models/types';
import { useAuth } from './AuthContext';
import { useClub } from './ClubContext';
import { useMatch } from './MatchContext';
import { getMatchesByClub, getPersonalMatchesForUser } from '../repositories/matchRepository';

interface StatsContextType {
	seededMembers: SeededUser[];
	userTotalStats: { played: number; wins: number; losses: number; winRate: number };
	allMatches: Match[];
	refreshGlobalStats: () => Promise<void>;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export const StatsProvider = ({ children }: { children: ReactNode }) => {
	const { user } = useAuth();
	const { members, userClubs } = useClub();
	const { matches } = useMatch();
	const [userTotalStats, setUserTotalStats] = useState({ played: 0, wins: 0, losses: 0, winRate: 0 });
	const [allMatches, setAllMatches] = useState<Match[]>([]);

	const seededMembers: SeededUser[] = useMemo(() => {
		const statsMap = new Map<string, { wins: number; losses: number; points: number }>();
		members.forEach(m => {
			statsMap.set(m.id, { wins: 0, losses: 0, points: 0 });
		});

		matches.forEach(match => {
			if (match.isLive) return;

			const winners = match.winnerTeam === 1 ? match.team1 : match.team2;
			const losers = match.winnerTeam === 1 ? match.team2 : match.team1;

			winners.forEach(id => {
				const s = statsMap.get(id);
				if (s) {
					s.wins++;
					s.points += 3;
				}
			});

			losers.forEach(id => {
				const s = statsMap.get(id);
				if (s) {
					s.losses++;
					s.points += 1;
				}
			});
		});

		const withStats = members.map(m => {
			const s = statsMap.get(m.id) || { wins: 0, losses: 0, points: 0 };
			return {
				...m,
				userId: m.id,
				matchesPlayed: s.wins + s.losses,
				wins: s.wins,
				losses: s.losses,
				points: s.points,
				rank: 0
			};
		});

		withStats.sort((a, b) => b.points - a.points || b.wins - a.wins);

		return withStats.map((player, index) => ({
			...player,
			rank: index + 1
		}));
	}, [members, matches]);

	const refreshGlobalStats = async () => {
		if (!user) {
			setUserTotalStats({ played: 0, wins: 0, losses: 0, winRate: 0 });
			setAllMatches([]);
			return;
		}

		if (userClubs.length === 0) {
			setUserTotalStats({ played: 0, wins: 0, losses: 0, winRate: 0 });
			setAllMatches([]);
			return;
		}

		console.log("StatsContext: Aggregating Global Stats from", userClubs.length, "clubs");

		try {
			const matchesPromises = userClubs.map(club => getMatchesByClub(club.id));
			const clubSnapshots = await Promise.all(matchesPromises);
			const personalMatches = await getPersonalMatchesForUser(user.id);

			const uniqueMatches = new Map<string, Match>();

			clubSnapshots.forEach(chap => {
				if (!chap || !chap.docs) return;
				chap.docs.forEach(d => {
					const m = { id: d.id, ...d.data() } as Match;
					const playedInT1 = m.team1 && m.team1.includes(user.id);
					const playedInT2 = m.team2 && m.team2.includes(user.id);

					if (playedInT1 || playedInT2) {
						uniqueMatches.set(d.id, m);
					}
				});
			});

			if (Array.isArray(personalMatches)) {
				personalMatches.forEach(m => {
					uniqueMatches.set(m.id, m);
				});
			}

			console.log(`StatsContext: Found ${uniqueMatches.size} unique matches across active clubs.`);

			let wins = 0;
			let losses = 0;

			uniqueMatches.forEach(m => {
				const isActuallyLive = m.isLive && (m.winnerTeam !== 1 && m.winnerTeam !== 2);

				if (isActuallyLive) {
					console.log(`StatsContext: Skipping Match ${m.id} (Status: Live & No Winner)`);
					return;
				}

				let winner = m.winnerTeam;

				// @ts-ignore
				if (winner != 1 && winner != 2) {
					if (m.scores && Array.isArray(m.scores)) {
						let s1Wins = 0, s2Wins = 0;
						m.scores.forEach(s => {
							if (s.team1Score > s.team2Score) s1Wins++;
							else if (s.team2Score > s.team2Score) s2Wins++;
						});
						if (s1Wins > s2Wins) winner = 1;
						else if (s2Wins > s1Wins) winner = 2;
					}
				}

				// @ts-ignore
				if (winner != 1 && winner != 2) {
					console.log(`StatsContext: Skipping Match ${m.id} - Invalid Winner & Score Repair Failed. Winner: ${m.winnerTeam}, Scores:`, m.scores);
					return;
				}

				const inTeam1 = m.team1.includes(user.id);
				const inTeam2 = m.team2.includes(user.id);

				if (inTeam1) {
					// @ts-ignore
					if (winner == 1) wins++;
					else losses++;
				} else if (inTeam2) {
					// @ts-ignore
					if (winner == 2) wins++;
					else losses++;
				} else {
					console.log(`StatsContext: Skipping Match ${m.id} - User ${user.id} not found in teams. T1: ${m.team1}, T2: ${m.team2}`);
				}
			});

			const played = wins + losses;
			const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

			setUserTotalStats({ played, wins, losses, winRate });
			const allMatchesList = Array.from(uniqueMatches.values()).sort((a, b) => b.date - a.date);
			setAllMatches(allMatchesList);
		} catch (e) {
			console.error("Error fetching global stats:", e);
		}
	};

	useEffect(() => {
		refreshGlobalStats();
	}, [user, matches, userClubs]);

	return (
		<StatsContext.Provider value={{ seededMembers, userTotalStats, allMatches, refreshGlobalStats }}>
			{children}
		</StatsContext.Provider>
	);
};

export const useStats = () => {
	const context = useContext(StatsContext);
	if (context === undefined) {
		throw new Error('useStats must be used within a StatsProvider');
	}
	return context;
};
