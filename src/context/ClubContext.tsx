import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { Club, User, Match, SeededUser } from '../models/types';
import { useAuth } from './AuthContext';
import { db } from '../services/firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  updateDoc, 
  arrayUnion, 
  getDocs,
  doc,
  documentId,
  arrayRemove,
  deleteDoc,
  getDoc,
  or
} from 'firebase/firestore';

import { sendPushNotification } from '../services/notificationService';

interface ClubContextType {
  activeClub: Club | null;
  createClub: (name: string) => Promise<void>;
  joinClub: (code: string) => Promise<{success: boolean, message: string}>;
  members: User[]; 
  joinRequests: User[];
  allUsers: User[];
  matches: Match[];
  recordMatch: (match: Match) => void;
  deleteMatch: (matchId: string) => Promise<void>;
  seededMembers: SeededUser[];
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
  const [activeClub, setActiveClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [joinRequests, setJoinRequests] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  const [pendingClubs, setPendingClubs] = useState<Club[]>([]);
  const [invitedClubs, setInvitedClubs] = useState<Club[]>([]); // New
  const [guests, setGuests] = useState<User[]>([]);

  // 1. Fetch Clubs the user belongs to
  useEffect(() => {
    if (!user) {
       setActiveClub(null);
       setMembers([]);
       setMatches([]);
       setUserClubs([]);
       setPendingClubs([]);
       setInvitedClubs([]);
       return;
    }

    // Query clubs where 'members' array contains user ID
    // Note: 'members' in Firestore is an array of objects
    // Firestore unfortunately cannot simply use array-contains on objects easily if we don't know the full object
    // SOLUTION: We should store a separate 'memberIds' array in the Club document for easier querying
    // OR: Query all clubs and filter client side (OK for MVP)
    // BETTER: Store 'memberIds' array on Club creation/join
    
    // For now, let's assume we read all clubs (MVP) or query where ownerId == user.id OR just try to fix schema
    // Let's TRY to query. A better schema is needed: 'memberIds' array of strings.
    
    const q = query(collection(db, 'clubs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log("ClubContext: Snapshot received", snapshot.size, "docs");
        const allClubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        
        // Filter client-side for MVP where user is in members.userId
        const myClubs = allClubs.filter(c => {
            const isMember = c.members && c.members.some(m => m.userId === user.id);
            // console.log(`Club ${c.name} (${c.id}): isMember?`, isMember);
            return isMember;
        });

        console.log("ClubContext: My Clubs found:", myClubs.length);

        // Filter for Pending Clubs
        const myPending = allClubs.filter(c => 
            c.joinRequests && c.joinRequests.includes(user.id)
        );

        // Filter for Invited Clubs
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
  }, [user]); // Re-run if user object changes (e.g. invites array updates)

  // Separate effect to handle auto-selection to avoid re-subscribing loop
  useEffect(() => {
    if (userClubs.length > 0 && !activeClub) {
        setActiveClub(userClubs[0]);
    } else if (activeClub) {
        // If active club removed/left, unselect
        const stillMember = userClubs.find(c => c.id === activeClub.id);
        if (!stillMember) {
            setActiveClub(null);
        } else {
            // Update active club data if it changed (deep check to avoid loop, strictly by ID/content)
             if (JSON.stringify(stillMember) !== JSON.stringify(activeClub)) {
                 setActiveClub(stillMember);
             }
        }
    }
  }, [userClubs]); // dependent on userClubs only, removed activeClub form dep array to avoid loops

  // 2. Fetch Matches & Members for Active Club
  useEffect(() => {
      if (!activeClub) {
          setMatches([]);
          setMembers([]);
          return;
      }

      // Fetch Matches
      const qMatches = query(
          collection(db, 'matches'), 
          where('clubId', '==', activeClub.id), // Ensure matches have clubId
          orderBy('date', 'desc')
      );
      
      const unsubMatches = onSnapshot(qMatches, (snapshot) => {
          setMatches(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Match)));
      });

      // Fetch Members Details
      /* 
         We have a list of userIds in activeClub.members.
         We need to fetch their displayNames from 'users' collection.
      */
      const fetchMembers = async () => {
          console.log("ClubContext: fetchMembers started for club", activeClub.id);
          const memberIds = activeClub.members.map(m => m.userId);
          const requestIds = activeClub.joinRequests || [];
          console.log("ClubContext: Request IDs to fetch:", requestIds);
          
          const uniqueIds = Array.from(new Set([...memberIds, ...requestIds]));

          // Also include users from matches (for displaying names of former/deleted players)
          const matchUserIds = new Set<string>();
          matches.forEach(m => {
            m.team1.forEach(id => matchUserIds.add(id));
            m.team2.forEach(id => matchUserIds.add(id));
          });
          matchUserIds.forEach(id => uniqueIds.push(id));

          // Dedup again
          const reallyUniqueIds = Array.from(new Set(uniqueIds));
          console.log("ClubContext: Total unique user IDs to fetch:", reallyUniqueIds.length);
          if (reallyUniqueIds.length === 0) return;

          try {
              // Use robust fetching that doesn't fail if one doc fails
              const userDocsPromises = reallyUniqueIds.map(async (uid) => {
                  try {
                      return await getDoc(doc(db, 'users', uid));
                  } catch (e) {
                      console.warn(`ClubContext: Failed to fetch user ${uid}`, e);
                      return null;
                  }
              });
              
              const userDocs = await Promise.all(userDocsPromises);
              
              const allUsersWithDeleted: User[] = userDocs.map((d, index) => {
                  if (d && d.exists()) {
                      return { id: d.id, ...d.data() } as User;
                  }
                  // Fallback for missing or error-prone user docs
                  return {
                      id: reallyUniqueIds[index],
                      displayName: 'Unknown User',
                      email: '',
                      photoURL: undefined
                  } as User;
              });
              
              const resolvedRequests = allUsersWithDeleted.filter(u => requestIds.includes(u.id));
              console.log("ClubContext: Resolved requests objects:", resolvedRequests.length);
              
              setMembers(allUsersWithDeleted.filter(u => memberIds.includes(u.id))); // Filter for current members only
              setJoinRequests(resolvedRequests);
              setAllUsers(allUsersWithDeleted); // New State for History Lookup
          } catch (e) {
              console.error("Error fetching members:", e);
              // Fallback to avoid infinite loading state
              setJoinRequests(requestIds.map(id => ({ id, displayName: 'Error User', email: '' } as User)));
          }
          
          // EXTRACT GUESTS 
          // 1. From Matches (Legacy / On-the-fly)
          const guestMap = new Map<string, string>();
          matches.forEach(m => {
              if (m.guestNames) {
                  Object.entries(m.guestNames).forEach(([id, name]) => {
                      guestMap.set(id, name);
                  });
              }
          });
          
          // 2. From Club Document (Explicitly Added)
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

      return () => unsubMatches();
  }, [activeClub, matches?.length]); // removed specific activeClub fields, just depend on activeClub since we need guestPlayers


  const seededMembers: SeededUser[] = useMemo(() => {
    // 1. Initialize stats for everyone
    const statsMap = new Map<string, { wins: number; losses: number; points: number }>();
    members.forEach(m => {
      statsMap.set(m.id, { wins: 0, losses: 0, points: 0 });
    });

    // 2. Process matches
    matches.forEach(match => {
      if (match.isLive) return; // Skip live matches for seeding

       // Determine winner/loser arrays
       const winners = match.winnerTeam === 1 ? match.team1 : match.team2;
       const losers = match.winnerTeam === 1 ? match.team2 : match.team1;

       winners.forEach(id => {
           const s = statsMap.get(id);
           if (s) {
               s.wins++;
               s.points += 3; // 3 points for win
           }
       });

       losers.forEach(id => {
           const s = statsMap.get(id);
           if (s) {
               s.losses++;
               s.points += 1; // 1 point for loss (participation)
           }
       });
    });

    // 3. Convert to array and sort
    const withStats = members.map(m => {
        const s = statsMap.get(m.id) || { wins: 0, losses: 0, points: 0 };
        return {
            ...m,
            userId: m.id,
            matchesPlayed: s.wins + s.losses,
            wins: s.wins,
            losses: s.losses,
            points: s.points,
            rank: 0 // placeholder
        };
    });

    // Sort: Higher points first. Tie-breaker: Win Rate? or Total Wins?
    withStats.sort((a, b) => b.points - a.points || b.wins - a.wins);

    // 4. Assign Ranks
    return withStats.map((player, index) => ({
        ...player,
        rank: index + 1
    }));

  }, [members, matches]);

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
        const docRef = await addDoc(collection(db, 'clubs'), newClubData);
        console.log("createClub: Success, ID:", docRef.id);
    } catch (e) {
        console.error("error creating club:", e);
        throw e;
    }
  };

  const joinClub = async (code: string): Promise<{success: boolean, message: string}> => {
     if (!user) return { success: false, message: "Not logged in" };
     try {
         // Query by invite code
         const q = query(collection(db, 'clubs'), where('inviteCode', '==', code.toUpperCase()));
         const snapshot = await getDocs(q);
         
         if (snapshot.empty) return { success: false, message: "Invalid Invite Code" };

         const clubDoc = snapshot.docs[0];
         const clubData = clubDoc.data() as Club;

         // Check if already member
         if (clubData.members.some(m => m.userId === user.id)) {
             return { success: true, message: "You are already a member!" }; 
         }
         
         // Check if already requested
         if (clubData.joinRequests && clubData.joinRequests.includes(user.id)) {
             return { success: true, message: "Request already sent! Please wait for approval." };
         }
         
         // Add user to joinRequests instead of members directly
         await updateDoc(doc(db, 'clubs', clubDoc.id), {
             joinRequests: arrayUnion(user.id)
         });
         return { success: true, message: "Join request sent! An admin will approve you shortly." };
     } catch (e) {
         console.error("Error joining club:", e);
         return { success: false, message: "Error sending request." };
     }
  };

  const approveRequest = async (userId: string) => {
      if (!activeClub || !user) return;
      // Only admin check (client side is weak, but ok for MVP)
      if (activeClub.ownerId !== user.id && !activeClub.members.find(m => m.userId === user.id && m.role === 'admin')) {
          alert('Only Admins can approve requests.');
          return;
      }

      try {
          await updateDoc(doc(db, 'clubs', activeClub.id), {
              joinRequests: arrayRemove(userId),
              members: arrayUnion({
                  userId: userId,
                  role: 'player',
                  joinedAt: Date.now()
              })
          });
      } catch (e) {
          console.error("Error approving:", e);
      }
  };

  const rejectRequest = async (userId: string) => {
      if (!activeClub) return;
      try {
          await updateDoc(doc(db, 'clubs', activeClub.id), {
              joinRequests: arrayRemove(userId)
          });
      } catch (e) {
          console.error("Error rejecting:", e);
      }
  };

  const removeMember = async (userId: string) => {
      if (!activeClub) return;
       // Find member object to remove
       const memberToRemove = activeClub.members.find(m => m.userId === userId);
       if (!memberToRemove) return;

      try {
          await updateDoc(doc(db, 'clubs', activeClub.id), {
              members: arrayRemove(memberToRemove)
          });
      } catch (e) {
          console.error("Error removing member:", e);
      }
  };

  const leaveClub = async (clubId: string) => {
      if (!user) return;
      
      const club = userClubs.find(c => c.id === clubId) || activeClub; 
      if (!club || club.id !== clubId) return; // Ensure we have the right club
      
      if (club.ownerId === user.id) {
          throw new Error("Owner cannot leave the club. You must delete the club or transfer ownership.");
      }

      const memberToRemove = club.members.find(m => m.userId === user.id);
      if (!memberToRemove) return;

      try {
          await updateDoc(doc(db, 'clubs', clubId), {
              members: arrayRemove(memberToRemove)
          });
          
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

      // Normalize input: remove all non-digits except '+'
      // e.g. "(555) 123-4567" -> "5551234567"
      // e.g. "+1-555-123-4567" -> "+15551234567"
      const cleaned = phoneNumber.replace(/[^\d+]/g, '');

      try {
          // Try finding the user with multiple variations
          let snapshot = await getDocs(query(collection(db, 'users'), where('phoneNumber', '==', cleaned)));

          // If not found and doesn't start with +, try prepending +1 (assuming US/Canada default)
          if (snapshot.empty && !cleaned.startsWith('+')) {
              // Try with +Code (e.g. +1)
              const withUS = '+1' + cleaned;
              snapshot = await getDocs(query(collection(db, 'users'), where('phoneNumber', '==', withUS)));
              
              // Also try just + prefix? (e.g. +91...)
              if (snapshot.empty) {
                  const withPlus = '+' + cleaned;
                  snapshot = await getDocs(query(collection(db, 'users'), where('phoneNumber', '==', withPlus)));
              }
          }

          if (snapshot.empty) return false;

          const targetUserDoc = snapshot.docs[0];
          const targetUser = targetUserDoc.data() as User;
          
          // 2. Add invite to user's profile
          await updateDoc(doc(db, 'users', targetUserDoc.id), {
              clubInvites: arrayUnion(activeClub.id)
          });
          
          // 3. Send Push Notification
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
          // 1. Add to Club Members
          await updateDoc(doc(db, 'clubs', clubId), {
              members: arrayUnion({
                  userId: user.id,
                  role: 'player',
                  joinedAt: Date.now()
              })
          });
          
          // 2. Remove from User Invites
          await updateDoc(doc(db, 'users', user.id), {
              clubInvites: arrayRemove(clubId)
          });
          
          // 3. Refresh logic will pick up the new club
      } catch (e) {
          console.error("Error accepting invite:", e);
          throw e;
      }
  };

  const deleteClub = async (clubId: string) => {
    if (!user) return;
    
    // Double security check
    const club = userClubs.find(c => c.id === clubId);
    if (!club || club.ownerId !== user.id) {
        throw new Error("Only the owner can delete the club.");
    }

    try {
        // 1. Delete all matches associated with the club
        const qMatches = query(collection(db, 'matches'), where('clubId', '==', clubId));
        const snapshot = await getDocs(qMatches);
        
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // 2. Delete the club document
        await deleteDoc(doc(db, 'clubs', clubId));
        
        // 3. Reset active state if needed
        if (activeClub?.id === clubId) {
            setActiveClub(null);
        }

    } catch (e) {
        console.error("Error deleting club:", e);
        throw e;
    }
  };

  const deleteMatch = async (matchId: string) => {
      if (!activeClub) return;
      try {
          await deleteDoc(doc(db, 'matches', matchId));
      } catch (e) {
          console.error("Error deleting match:", e);
      }
  };

  const recordMatch = async (match: Match) => {
    if (!activeClub) return;
    try {
        const { id, ...matchData } = match; 
        // Ensure match has clubId
        await addDoc(collection(db, 'matches'), {
            ...matchData,
            clubId: activeClub.id
        });
    } catch (e) {
        console.error("Error adding match: ", e);
    }
  };

  const setActiveClubHandler = (club: Club) => {
      setActiveClub(club);
  };

  const updateClubName = async (name: string) => {
      if (!activeClub) return;
      try {
          await updateDoc(doc(db, 'clubs', activeClub.id), {
              name: name
          });
          // Update local state if needed, though onSnapshot updates it
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
          const functions = getFunctions(undefined, 'us-central1'); // Region defaults to us-central1
          // NOTE: The function name must match exactly what you deploy in python (usually snake_case or camelCase depending on config)
          // In main.py we defined it as 'merge_guest_history'.
          const mergeGuestHistory = httpsCallable(functions, 'merge_guest_history');
          
          const result = await mergeGuestHistory({
              clubId: activeClub.id,
              guestId: guestId,
              realUserId: realUserId
          });
          
          console.log(`Cloud Function Result:`, result.data);
          
      } catch (e) {
          console.error("Error calling mergeGuestHistory cloud function:", e);
          throw e; // Rethrow to show alert in UI
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
          await updateDoc(doc(db, 'clubs', activeClub.id), {
              guestPlayers: arrayUnion(newGuest)
          });
      } catch (e) {
          console.error("Error adding guest player:", e);
          throw e;
      }
  };

  const removeGuestPlayer = async (guestId: string) => {
      if (!activeClub) return;
      
      // Need exact object reference to remove from array, but we only have ID
      // So we filter the current guests from activeClub and update the whole array
      const currentGuests = activeClub.guestPlayers || [];
      const newGuests = currentGuests.filter(g => g.id !== guestId);
      
      try {
        await updateDoc(doc(db, 'clubs', activeClub.id), {
            guestPlayers: newGuests
        });
      } catch (e) {
        console.error("Error removing guest player:", e);
        throw e;
      }
  };

  const toggleAdminRole = async (targetUserId: string) => {
      if (!activeClub || !user) return;
      
      // Security Check: Only owners can promote/demote admins
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

      // Create new array with updated role
      const updatedMembers = [...currentMembers];
      updatedMembers[memberIndex] = { ...member, role: newRole };

      try {
          await updateDoc(doc(db, 'clubs', activeClub.id), {
              members: updatedMembers
          });
      } catch (e) {
          console.error("Error toggling admin role:", e);
          throw e;
      }
  };

  return (
    <ClubContext.Provider value={{ 
        activeClub, 
        createClub, 
        joinClub, 
        members, 
        joinRequests,
        allUsers,
        matches, 
        recordMatch, 
        deleteMatch,
        seededMembers,
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
        setActiveClub,
        updateClubName,
        updateGuestToUser,
        addGuestPlayer,
        removeGuestPlayer,
        toggleAdminRole,
        guests
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
