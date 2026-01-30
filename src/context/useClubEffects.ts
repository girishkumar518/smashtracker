import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Club, User } from '../models/types';
import { subscribeToClubs } from '../repositories/clubRepository';
import { getUsersByIds } from '../repositories/userRepository';

type SetState<T> = Dispatch<SetStateAction<T>>;

interface ClubEffectsParams {
  user: User | null | undefined;
  activeClub: Club | null;
  userClubs: Club[];
  setActiveClub: SetState<Club | null>;
  setMembers: SetState<User[]>;
  setJoinRequests: SetState<User[]>;
  setAllUsers: SetState<User[]>;
  setUserClubs: SetState<Club[]>;
  setPendingClubs: SetState<Club[]>;
  setInvitedClubs: SetState<Club[]>;
  setGuests: SetState<User[]>;
}

export const useClubEffects = ({
  user,
  activeClub,
  userClubs,
  setActiveClub,
  setMembers,
  setJoinRequests,
  setAllUsers,
  setUserClubs,
  setPendingClubs,
  setInvitedClubs,
  setGuests
}: ClubEffectsParams) => {
  // 1. Fetch Clubs the user belongs to
  useEffect(() => {
    if (!user) {
      setActiveClub(null);
      setMembers([]);
      setUserClubs([]);
      setPendingClubs([]);
      setInvitedClubs([]);
      return;
    }

    const unsubscribe = subscribeToClubs((allClubs) => {
      console.log("ClubContext: Snapshot received", allClubs.length, "docs");

      const myClubs = allClubs.filter(c => {
        const isMember = c.members && c.members.some(m => m.userId === user.id);
        return isMember;
      });

      console.log("ClubContext: My Clubs found:", myClubs.length);

      const myPending = allClubs.filter(c =>
        c.joinRequests && c.joinRequests.includes(user.id)
      );

      const myInvites = allClubs.filter(c =>
        user.clubInvites && user.clubInvites.includes(c.id)
      );

      setUserClubs(myClubs);
      setPendingClubs(myPending);
      setInvitedClubs(myInvites);
    }, (error) => {
      console.error("ClubContext: Snapshot Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Separate effect to handle auto-selection
  useEffect(() => {
    if (userClubs.length > 0 && !activeClub) {
      setActiveClub(userClubs[0]);
    } else if (activeClub) {
      const stillMember = userClubs.find(c => c.id === activeClub.id);
      if (!stillMember) {
        setActiveClub(null);
      } else {
        if (JSON.stringify(stillMember) !== JSON.stringify(activeClub)) {
          setActiveClub(stillMember);
        }
      }
    }
  }, [userClubs]);

  // 2. Fetch Matches & Members for Active Club
  useEffect(() => {
    if (!activeClub) {
      setMembers([]);
      return;
    }

    const fetchMembers = async () => {
      console.log("ClubContext: fetchMembers started for club", activeClub.id);
      const memberIds = activeClub.members.map(m => m.userId);
      const requestIds = activeClub.joinRequests || [];
      console.log("ClubContext: Request IDs to fetch:", requestIds);

      const uniqueIds = Array.from(new Set([...memberIds, ...requestIds]));

      const reallyUniqueIds = Array.from(new Set(uniqueIds));
      console.log("ClubContext: Total unique user IDs to fetch:", reallyUniqueIds.length);
      if (reallyUniqueIds.length === 0) return;

      try {
        const userDocs = await getUsersByIds(reallyUniqueIds);

        const allUsersWithDeleted: User[] = userDocs.map((d, index) => {
          if (d && d.exists()) {
            return { id: d.id, ...d.data() } as User;
          }
          return {
            id: reallyUniqueIds[index],
            displayName: 'Unknown User',
            email: '',
            photoURL: undefined
          } as User;
        });

        const resolvedRequests = allUsersWithDeleted.filter(u => requestIds.includes(u.id));
        console.log("ClubContext: Resolved requests objects:", resolvedRequests.length);

        setMembers(allUsersWithDeleted.filter(u => memberIds.includes(u.id)));
        setJoinRequests(resolvedRequests);
        setAllUsers(allUsersWithDeleted);
      } catch (e) {
        console.error("Error fetching members:", e);
        setJoinRequests(requestIds.map(id => ({ id, displayName: 'Error User', email: '' } as User)));
      }

      const guestMap = new Map<string, string>();

      if (activeClub.guestPlayers) {
        activeClub.guestPlayers.forEach(g => {
          guestMap.set(g.id, g.name);
        });
      }

      const guestList: User[] = Array.from(guestMap.entries()).map(([id, name]) => ({
        id,
        displayName: name,
        email: '',
      }));
      setGuests(guestList);
    };

    fetchMembers();

  }, [activeClub]);

  return {};
};