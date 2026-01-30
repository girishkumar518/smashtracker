import { Match } from '../models/types';
import { db } from '../services/firebaseConfig';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where
} from 'firebase/firestore';

export const addMatch = async (data: Omit<Match, 'id'>) => {
  return addDoc(collection(db, 'matches'), data);
};

export const deleteMatch = async (matchId: string) => {
  return deleteDoc(doc(db, 'matches', matchId));
};

export const getMatchesByClub = async (clubId: string) => {
  const q = query(collection(db, 'matches'), where('clubId', '==', clubId));
  return getDocs(q);
};

export const getPersonalMatchesForUser = async (userId: string) => {
  const q = query(
    collection(db, 'matches'),
    where('matchType', '==', 'personal'),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() } as Match))
    .filter(m => (m.team1 && m.team1.includes(userId)) || (m.team2 && m.team2.includes(userId)));
};

export const subscribeMatchesByClub = (
  clubId: string,
  onNext: (matches: Match[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(
    collection(db, 'matches'),
    where('clubId', '==', clubId),
    orderBy('date', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const matches = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Match));
      onNext(matches);
    },
    (error) => {
      if (onError) onError(error as Error);
    }
  );
};

export const subscribePersonalMatchesForUser = (
  userId: string,
  onNext: (matches: Match[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(
    collection(db, 'matches'),
    where('matchType', '==', 'personal'),
    orderBy('date', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const matches = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Match))
        .filter(m => (m.team1 && m.team1.includes(userId)) || (m.team2 && m.team2.includes(userId)));
      onNext(matches);
    },
    (error) => {
      if (onError) onError(error as Error);
    }
  );
};
