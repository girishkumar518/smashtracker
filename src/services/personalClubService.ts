import { Club, ClubMember, User } from '../models/types';
import { getClubById, setClubById } from '../repositories/clubRepository';

export const getPersonalClubId = (userId: string) => `personal_${userId}`;

export const isPersonalClubId = (clubId: string) => clubId.startsWith('personal_');

export const buildPersonalClubStub = (user: User, name = 'Friendly Matches'): Club => {
  const member: ClubMember = { userId: user.id, role: 'admin', joinedAt: Date.now() };
  return {
    id: getPersonalClubId(user.id),
    name,
    ownerId: user.id,
    inviteCode: 'PERSONAL',
    members: [member],
    joinRequests: [],
    guestPlayers: []
  };
};

export const ensurePersonalClub = async (user: User, name?: string): Promise<Club> => {
  const clubId = getPersonalClubId(user.id);
  const snap = await getClubById(clubId);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as Club;
  }

  const personalClub = buildPersonalClubStub(user, name);
  const { id, ...data } = personalClub;
  await setClubById(clubId, data);
  return personalClub;
}
