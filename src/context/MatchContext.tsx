import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Match } from '../models/types';
import { addMatch, deleteMatch as deleteMatchDoc, subscribeMatchesByClub } from '../repositories/matchRepository';
import { sendPushNotification } from '../services/notificationService';
import { useClub } from './ClubContext';
import { useAuth } from './AuthContext';

interface MatchContextType {
	matches: Match[];
	recordMatch: (match: Match) => Promise<void>;
	deleteMatch: (matchId: string) => Promise<void>;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export const MatchProvider = ({ children }: { children: ReactNode }) => {
	const { user } = useAuth();
	const { activeClub, members, guests } = useClub();
	const [matches, setMatches] = useState<Match[]>([]);

	useEffect(() => {
		if (!activeClub) {
			setMatches([]);
			return;
		}

		const unsub = subscribeMatchesByClub(activeClub.id, (clubMatches) => {
			setMatches(clubMatches);
		});

		return () => unsub();
	}, [activeClub?.id]);

	const recordMatch = async (match: Match) => {
		if (!activeClub) return;
		try {
			const { id, ...matchData } = match;
			const docRef = await addMatch({
				...matchData,
				clubId: activeClub.id
			});

			const playerIds = [...(match.team1 || []), ...(match.team2 || [])];

			const recipients = members.filter(m =>
				playerIds.includes(m.id) &&
				m.pushToken &&
				m.id !== user?.id
			);

			if (recipients.length > 0) {
				const getName = (uid: string) => {
					const m = members.find(u => u.id === uid);
					if (m) return m.displayName;
					if (match.guestNames && match.guestNames[uid]) return match.guestNames[uid];
					const g = guests.find(u => u.id === uid);
					if (g) return g.displayName;
					return 'Unknown Player';
				};

				const t1Names = match.team1.map(getName).join(' & ');
				const t2Names = match.team2.map(getName).join(' & ');

				let scoreStr = '';
				if (match.scores && match.scores.length > 0) {
					scoreStr = match.scores.map(s => `${s.team1Score}-${s.team2Score}`).join(', ');
				}

				const title = `Match Result: ${activeClub.name}`;
				const body = `${t1Names} vs ${t2Names}\nScore: ${scoreStr}`;

				recipients.forEach(r => {
					if (r.pushToken) {
						sendPushNotification(r.pushToken, title, body, { matchId: docRef.id });
					}
				});
			}
		} catch (e) {
			console.error("Error adding match: ", e);
		}
	};

	const deleteMatch = async (matchId: string) => {
		if (!activeClub) return;
		try {
			await deleteMatchDoc(matchId);
		} catch (e) {
			console.error("Error deleting match:", e);
		}
	};

	return (
		<MatchContext.Provider value={{ matches, recordMatch, deleteMatch }}>
			{children}
		</MatchContext.Provider>
	);
};

export const useMatch = () => {
	const context = useContext(MatchContext);
	if (context === undefined) {
		throw new Error('useMatch must be used within a MatchProvider');
	}
	return context;
};
