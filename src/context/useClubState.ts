import { useState } from 'react';
import { Club, User } from '../models/types';

export const useClubState = () => {
  const [activeClub, setActiveClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [joinRequests, setJoinRequests] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  const [pendingClubs, setPendingClubs] = useState<Club[]>([]);
  const [invitedClubs, setInvitedClubs] = useState<Club[]>([]);
  const [guests, setGuests] = useState<User[]>([]);
  return {
    activeClub,
    setActiveClub,
    members,
    setMembers,
    joinRequests,
    setJoinRequests,
    allUsers,
    setAllUsers,
    userClubs,
    setUserClubs,
    pendingClubs,
    setPendingClubs,
    invitedClubs,
    setInvitedClubs,
    guests,
    setGuests,
  };
};