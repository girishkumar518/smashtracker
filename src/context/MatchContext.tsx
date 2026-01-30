import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Match } from '../models/types';
import { addMatch, deleteMatch as deleteMatchDoc, subscribeMatchesByClub, subscribePersonalMatchesForUser } from '../repositories/matchRepository';
import { updateClub } from '../repositories/clubRepository';
import { sendPushNotification } from '../services/notificationService';
import { useClub } from './ClubContext';
import { useAuth } from './AuthContext';
import { ensurePersonalClub, isPersonalClubId } from '../services/personalClubService';
import { arrayUnion } from 'firebase/firestore';

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

		if (user && isPersonalClubId(activeClub.id)) {
			let personalMatches: Match[] = [];
			let ownClubMatches: Match[] = [];

			const updateCombined = () => {
				const filteredPersonal = personalMatches.filter(m => m.clubId?.startsWith('personal_'));
				const merged = new Map<string, Match>();
				[...filteredPersonal, ...ownClubMatches].forEach(m => merged.set(m.id, m));
				const sorted = Array.from(merged.values()).sort((a, b) => b.date - a.date);
				setMatches(sorted);
			};

			const unsubPersonal = subscribePersonalMatchesForUser(user.id, (matchesByParticipant) => {
				personalMatches = matchesByParticipant;
				updateCombined();
			});

			const unsubOwn = subscribeMatchesByClub(activeClub.id, (clubMatches) => {
				ownClubMatches = clubMatches;
				updateCombined();
			});

			return () => {
				unsubPersonal();
				unsubOwn();
			};
		}

		const unsub = subscribeMatchesByClub(activeClub.id, (clubMatches) => {
			setMatches(clubMatches);
		});

		return () => unsub();
	}, [activeClub?.id, user?.id]);

	const recordMatch = async (match: Match) => {
		if (!activeClub) return;
		try {
			let clubId = activeClub.id;
			let matchType: 'personal' | 'club' | 'tournament' = 'club';
			const isPersonal = user && isPersonalClubId(activeClub.id);
			if (isPersonal && user) {
				const personalClub = await ensurePersonalClub(user, activeClub.name);
				clubId = personalClub.id;
				matchType = 'personal';
			}

			const { id, ...matchData } = match;
			const docRef = await addMatch({
				...matchData,
				clubId,
				matchType,
			});

			if (isPersonal && user) {
				const personalClub = await ensurePersonalClub(user, activeClub.name);
				const existingMemberIds = new Set(personalClub.members.map(m => m.userId));
				const playerIds = [...(match.team1 || []), ...(match.team2 || [])]
					.filter(id => !id.startsWith('guest_') && id !== user.id);

				const newMembers = Array.from(new Set(playerIds))
					.filter(id => !existingMemberIds.has(id))
					.map(id => ({ userId: id, role: 'player', joinedAt: Date.now() }));

				const guestEntries = Object.entries(match.guestNames || {})
					.map(([id, name]) => ({ id, name, addedAt: Date.now() }));
				const existingGuestIds = new Set((personalClub.guestPlayers || []).map(g => g.id));
				const newGuests = guestEntries.filter(g => !existingGuestIds.has(g.id));

				const updates: any = {};
				if (newMembers.length > 0) {
					updates.members = arrayUnion(...newMembers);
				}
				if (newGuests.length > 0) {
					updates.guestPlayers = arrayUnion(...newGuests);
				}
				if (Object.keys(updates).length > 0) {
					await updateClub(personalClub.id, updates);
				}

			}

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
