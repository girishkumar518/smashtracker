import type { Dispatch, SetStateAction } from 'react';
import { Club, User } from '../models/types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { addClub, deleteClub as deleteClubDoc, getClubsByInviteCode, updateClub } from '../repositories/clubRepository';
import { deleteMatch as deleteMatchDoc, getMatchesByClub } from '../repositories/matchRepository';
import { addClubInviteToUser, findUserByPhone, removeClubInviteFromUser } from '../repositories/userRepository';
import { arrayRemove, arrayUnion } from 'firebase/firestore';
import { sendPushNotification } from '../services/notificationService';

interface ClubActionsParams {
  user: User | null | undefined;
  activeClub: Club | null;
  userClubs: Club[];
  setActiveClub: Dispatch<SetStateAction<Club | null>>;
}

export const useClubActions = ({
  user,
  activeClub,
  userClubs,
  setActiveClub
}: ClubActionsParams) => {
  const createClub = async (name: string) => {
    if (!user) {
      throw new Error("User not authenticated");
    }
    console.log("createClub: Starting creation for", name);
    try {
      const newClubData = {
        name,
        ownerId: user.id,
        inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        createdAt: Date.now(),
        members: [
          { userId: user.id, role: 'admin', joinedAt: Date.now() }
        ]
      };
      console.log("createClub: Writing to Firestore...");
      const docRef = await addClub(newClubData as Omit<Club, 'id'>);
      console.log("createClub: Success, ID:", docRef.id);
    } catch (e) {
      console.error("error creating club:", e);
      throw e;
    }
  };

  const joinClub = async (code: string): Promise<{ success: boolean, message: string }> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const snapshot = await getClubsByInviteCode(code.toUpperCase());

      if (snapshot.empty) return { success: false, message: "Invalid Invite Code" };

      const clubDoc = snapshot.docs[0];
      const clubData = clubDoc.data() as Club;

      if (clubData.members.some(m => m.userId === user.id)) {
        return { success: true, message: "You are already a member!" };
      }

      if (clubData.joinRequests && clubData.joinRequests.includes(user.id)) {
        return { success: true, message: "Request already sent! Please wait for approval." };
      }

      await updateClub(clubDoc.id, { joinRequests: arrayUnion(user.id) as any });
      return { success: true, message: "Join request sent! An admin will approve you shortly." };
    } catch (e) {
      console.error("Error joining club:", e);
      return { success: false, message: "Error sending request." };
    }
  };

  const approveRequest = async (userId: string) => {
    if (!activeClub || !user) return;
    if (activeClub.ownerId !== user.id && !activeClub.members.find(m => m.userId === user.id && m.role === 'admin')) {
      alert('Only Admins can approve requests.');
      return;
    }

    try {
      await updateClub(activeClub.id, {
        joinRequests: arrayRemove(userId) as any,
        members: arrayUnion({
          userId: userId,
          role: 'player',
          joinedAt: Date.now()
        }) as any
      });
    } catch (e) {
      console.error("Error approving:", e);
    }
  };

  const rejectRequest = async (userId: string) => {
    if (!activeClub) return;
    try {
      await updateClub(activeClub.id, { joinRequests: arrayRemove(userId) as any });
    } catch (e) {
      console.error("Error rejecting:", e);
    }
  };

  const removeMember = async (userId: string) => {
    if (!activeClub) return;
    const memberToRemove = activeClub.members.find(m => m.userId === userId);
    if (!memberToRemove) return;

    try {
      await updateClub(activeClub.id, { members: arrayRemove(memberToRemove) as any });
    } catch (e) {
      console.error("Error removing member:", e);
    }
  };

  const leaveClub = async (clubId: string) => {
    if (!user) return;

    const club = userClubs.find(c => c.id === clubId) || activeClub;
    if (!club || club.id !== clubId) return;

    if (club.ownerId === user.id) {
      throw new Error("Owner cannot leave the club. You must delete the club or transfer ownership.");
    }

    const memberToRemove = club.members.find(m => m.userId === user.id);
    if (!memberToRemove) return;

    try {
      await updateClub(clubId, { members: arrayRemove(memberToRemove) as any });

      if (activeClub?.id === clubId) {
        setActiveClub(null);
      }
    } catch (e) {
      console.error("Error leaving club:", e);
      throw e;
    }
  };

  const sendClubInvite = async (phoneNumber: string): Promise<boolean> => {
    if (!user || !activeClub) return false;

    const cleaned = phoneNumber.replace(/[^\d+]/g, '');

    try {
      let targetUserRecord = await findUserByPhone(cleaned);

      if (!targetUserRecord && !cleaned.startsWith('+')) {
        const withUS = '+1' + cleaned;
        targetUserRecord = await findUserByPhone(withUS);

        if (!targetUserRecord) {
          const withPlus = '+' + cleaned;
          targetUserRecord = await findUserByPhone(withPlus);
        }
      }

      if (!targetUserRecord) return false;

      const targetUserDoc = targetUserRecord.id;
      const targetUser = targetUserRecord.user;

      await addClubInviteToUser(targetUserDoc, activeClub.id);

      if (targetUser.pushToken) {
        await sendPushNotification(
          targetUser.pushToken,
          "Club Invitation",
          `${user.displayName} invited you to join ${activeClub.name}`,
          { clubId: activeClub.id }
        );
      }

      return true;
    } catch (e) {
      console.error("Error sending invite:", e);
      throw e;
    }
  };

  const acceptClubInvite = async (clubId: string) => {
    if (!user) return;

    try {
      await updateClub(clubId, {
        members: arrayUnion({
          userId: user.id,
          role: 'player',
          joinedAt: Date.now()
        }) as any
      });

      await removeClubInviteFromUser(user.id, clubId);
    } catch (e) {
      console.error("Error accepting invite:", e);
      throw e;
    }
  };

  const deleteClub = async (clubId: string) => {
    if (!user) return;

    const club = userClubs.find(c => c.id === clubId);
    if (!club || club.ownerId !== user.id) {
      throw new Error("Only the owner can delete the club.");
    }

    try {
      const snapshot = await getMatchesByClub(clubId);

      const deletePromises = snapshot.docs.map(docItem => deleteMatchDoc(docItem.id));
      await Promise.all(deletePromises);

      await deleteClubDoc(clubId);

      if (activeClub?.id === clubId) {
        setActiveClub(null);
      }
    } catch (e) {
      console.error("Error deleting club:", e);
      throw e;
    }
  };


  const updateClubName = async (name: string) => {
    if (!activeClub) return;
    try {
      await updateClub(activeClub.id, { name: name });
      setActiveClub(prev => prev ? { ...prev, name } : null);
    } catch (e) {
      console.error("Error updating club name:", e);
      throw e;
    }
  };

  const updateGuestToUser = async (guestId: string, realUserId: string) => {
    if (!activeClub) return;
    console.log(`Converting Guest ${guestId} to User ${realUserId} via Cloud Function`);

    try {
      const functions = getFunctions(undefined, 'us-central1');
      const mergeGuestHistory = httpsCallable(functions, 'merge_guest_history');

      const result = await mergeGuestHistory({
        clubId: activeClub.id,
        guestId: guestId,
        realUserId: realUserId
      });

      console.log(`Cloud Function Result:`, result.data);
    } catch (e) {
      console.error("Error calling mergeGuestHistory cloud function:", e);
      throw e;
    }
  };

  const addGuestPlayer = async (name: string) => {
    if (!activeClub) return;
    const newGuest = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name,
      addedAt: Date.now()
    };

    try {
      await updateClub(activeClub.id, { guestPlayers: arrayUnion(newGuest) as any });
    } catch (e) {
      console.error("Error adding guest player:", e);
      throw e;
    }
  };

  const removeGuestPlayer = async (guestId: string) => {
    if (!activeClub) return;

    const currentGuests = activeClub.guestPlayers || [];
    const newGuests = currentGuests.filter(g => g.id !== guestId);

    try {
      await updateClub(activeClub.id, { guestPlayers: newGuests as any });
    } catch (e) {
      console.error("Error removing guest player:", e);
      throw e;
    }
  };

  const toggleAdminRole = async (targetUserId: string) => {
    if (!activeClub || !user) return;

    if (activeClub.ownerId !== user.id) {
      throw new Error("Only the Club Owner can manage admin roles.");
    }

    if (targetUserId === activeClub.ownerId) {
      throw new Error("Owner role cannot be changed here.");
    }

    const currentMembers = activeClub.members || [];
    const memberIndex = currentMembers.findIndex(m => m.userId === targetUserId);

    if (memberIndex === -1) return;

    const member = currentMembers[memberIndex];
    const newRole = member.role === 'admin' ? 'player' : 'admin';

    const updatedMembers = [...currentMembers];
    updatedMembers[memberIndex] = { ...member, role: newRole };

    try {
      await updateClub(activeClub.id, { members: updatedMembers as any });
    } catch (e) {
      console.error("Error toggling admin role:", e);
      throw e;
    }
  };

  return {
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
  };
};