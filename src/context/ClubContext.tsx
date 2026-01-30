import React, { createContext, useContext, ReactNode } from 'react';
import { Club, User } from '../models/types';
import { useAuth } from './AuthContext';
import { useClubActions } from './useClubActions';
import { useClubEffects } from './useClubEffects';
import { useClubState } from './useClubState';

interface ClubContextType {
  activeClub: Club | null;
  createClub: (name: string) => Promise<void>;
  joinClub: (code: string) => Promise<{success: boolean, message: string}>;
  members: User[]; 
  joinRequests: User[];
  allUsers: User[];
  approveRequest: (userId: string) => Promise<void>;
  rejectRequest: (userId: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  leaveClub: (clubId: string) => Promise<void>;
  deleteClub: (clubId: string) => Promise<void>;
  sendClubInvite: (phoneNumber: string) => Promise<boolean>; // Returns true if user found & invited
  acceptClubInvite: (clubId: string) => Promise<void>;
  pendingClubs: Club[];
  invitedClubs: Club[]; // New
  userClubs: Club[];
  setActiveClub: (club: Club) => void;
  updateClubName: (name: string) => Promise<void>;
  updateGuestToUser: (guestId: string, realUserId: string) => Promise<void>;
  addGuestPlayer: (name: string) => Promise<void>;
  removeGuestPlayer: (guestId: string) => Promise<void>;
  toggleAdminRole: (userId: string) => Promise<void>;
  guests: User[];
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export const ClubProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const {
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
    
  } = useClubState();

  useClubEffects({
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
  });

  const {
    createClub,
    joinClub,
    approveRequest,
    rejectRequest,
    removeMember,
    leaveClub,
    sendClubInvite,
    acceptClubInvite,
    deleteClub,
    updateClubName,
    updateGuestToUser,
    addGuestPlayer,
    removeGuestPlayer,
    toggleAdminRole
  } = useClubActions({
    user,
    activeClub,
    userClubs,
    setActiveClub
  });

  const setActiveClubHandler = (club: Club) => {
    setActiveClub(club);
  };

  return (
    <ClubContext.Provider value={{ 
        activeClub, 
        createClub, 
        joinClub, 
        members, 
        joinRequests,
        allUsers,
        approveRequest,
        rejectRequest,
        removeMember,
        leaveClub,
        sendClubInvite,
        acceptClubInvite,
        pendingClubs,
        invitedClubs,
        deleteClub,
        userClubs,
        setActiveClub: setActiveClubHandler,
        updateClubName,
        updateGuestToUser,
        addGuestPlayer,
        removeGuestPlayer,
        toggleAdminRole,
        guests,
        
    }}>
      {children}
    </ClubContext.Provider>
  );
};

export const useClub = () => {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
};
