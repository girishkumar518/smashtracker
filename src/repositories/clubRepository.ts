import { Club } from '../models/types';
import { db } from '../services/firebaseConfig';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where
} from 'firebase/firestore';

export const subscribeToClubs = (
  onNext: (clubs: Club[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(collection(db, 'clubs'));
  return onSnapshot(
    q,
    (snapshot) => {
      const allClubs = snapshot.docs.map(docItem => ({ id: docItem.id, ...docItem.data() } as Club));
      onNext(allClubs);
    },
    (error) => {
      if (onError) onError(error as Error);
    }
  );
};

export const addClub = async (data: Omit<Club, 'id'>) => {
  return addDoc(collection(db, 'clubs'), data);
};

export const updateClub = async (clubId: string, data: Partial<Club>) => {
  return updateDoc(doc(db, 'clubs', clubId), data);
};

export const deleteClub = async (clubId: string) => {
  return deleteDoc(doc(db, 'clubs', clubId));
};

export const getClubsByInviteCode = async (inviteCode: string) => {
  const q = query(collection(db, 'clubs'), where('inviteCode', '==', inviteCode));
  return getDocs(q);
};

