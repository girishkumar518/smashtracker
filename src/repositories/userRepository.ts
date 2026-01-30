import { User } from '../models/types';
import { db } from '../services/firebaseConfig';
import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';

export const getUserById = async (userId: string) => {
  return getDoc(doc(db, 'users', userId));
};

export const getUsersByIds = async (userIds: string[]) => {
  const promises = userIds.map(async (uid) => {
    try {
      return await getUserById(uid);
    } catch (e) {
      console.warn(`UserRepository: Failed to fetch user ${uid}`, e);
      return null;
    }
  });
  return Promise.all(promises);
};

export const findUserByPhone = async (phoneNumber: string) => {
  const snapshot = await getDocs(query(collection(db, 'users'), where('phoneNumber', '==', phoneNumber)));
  if (snapshot.empty) return null;
  const docItem = snapshot.docs[0];
  return { id: docItem.id, user: docItem.data() as User };
};

export const addClubInviteToUser = async (userId: string, clubId: string) => {
  return updateDoc(doc(db, 'users', userId), { clubInvites: arrayUnion(clubId) });
};

export const removeClubInviteFromUser = async (userId: string, clubId: string) => {
  return updateDoc(doc(db, 'users', userId), { clubInvites: arrayRemove(clubId) });
};
