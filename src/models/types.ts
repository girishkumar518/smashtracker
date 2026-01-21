export type Role = 'admin' | 'player';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  pushToken?: string;
  clubInvites?: string[]; // Array of Club IDs inviting the user
}

export interface ClubMember {
  userId: string;
  role: Role;
  joinedAt: number;
}

export interface Club {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  members: ClubMember[]; // In a real DB, this might be a sub-collection
  joinRequests?: string[]; // Array of User IDs requesting to join
}

export interface MatchSet {
  team1Score: number;
  team2Score: number;
}

export interface Match {
  id: string;
  clubId: string;
  date: number; // Timestamp
  team1: string[]; // User IDs
  team2: string[]; // User IDs
  scores: MatchSet[];
  winnerTeam: 1 | 2;
  isLive: boolean; // True if currently being played
  durationSeconds?: number;
  stats?: {
    maxConsecutivePts: { team1: number, team2: number };
    pointsWonOnServe: { team1: number, team2: number };
  };
  guestNames?: Record<string, string>; // Map of guest_ID to display name
}

export interface PlayerStats {
  userId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  points: number;
  rank: number; // Seed
}

export type SeededUser = User & PlayerStats;
