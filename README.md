# SmashTracker

A digital hub for badminton clubs that simplifies scoring, centralizes match data, and provides players with deep insights into their performance.

## Features

- **Club Management**: Create clubs, invite members, and manage rosters.
- **Dual-Mode Scoring**:
  - **Live Score**: Real-time scoring interface with set tracking and match conclusion.
  - **Post-Match Entry**: Log past match results manually.
- **Dashboard & Analytics**:
  - View win rates and match history.
  - Analyze performance with different partners (Doubles).
  - Track recent form.
- **Authentication**: Secure login and profile management.

- **Friendly Matches (Personal Club)**:
  - Play matches outside of official clubs with any user ("friendlies").
  - Each user has a "Personal Club" automatically created for them.
  - Personal Club always appears in the club list for quick access.
  - Members of the Personal Club are aggregated from all clubs the user is part of, allowing you to play with any known player.
  - Friendly matches are marked with `matchType: 'personal'` in the database.
  - Friendly matches are shown in match history and statistics, but are kept separate from official club matches.
  - You can add new players to your Personal Club from the Match Setup screen (by email or as guests).
  - Security PIN verification is supported for adding players to your Personal Club.
  - All friendly match logic is handled in context, repository, and service layers for maintainability.

## Prerequisites

- Node.js
- Expo Go app on your mobile device (or iOS Simulator / Android Emulator)

## Getting Started

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Start the project:
    ```bash
    npx expo start
    ```

## Project Structure

- `src/screens`: Application screens (Home, Profile, Match Setup, etc.)
- `src/components`: Reusable UI components
- `src/context`: Application state management
- `src/navigation`: Navigation configuration
- `src/services`: External services integration (Firebase)

### Friendly Match (Personal Club) Logic

- `src/services/personalClubService.ts`: Helpers for personal club ID, stub creation, and Firestore sync.
- `src/context/useClubEffects.ts`: Ensures the personal club always appears in the club list and aggregates members from all clubs for friendlies.
- `src/context/MatchContext.tsx`: Subscribes to both club and personal matches, aggregates and sorts them for display.
- `src/repositories/matchRepository.ts`: Queries and subscribes to personal matches using `matchType: 'personal'` and filters by team membership.
- `src/screens/MatchSetupScreen.tsx`: Allows selection of any known player for friendlies, supports adding by email or as guest, and handles PIN verification.
- `src/screens/HomeScreen.tsx`: Displays both club and friendly matches in the user's match history and statistics.

## Production Deployment (Vercel)

If you see `auth/unauthorized-domain` error:
1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Authentication** > **Settings** > **Authorized domains**.
3.  Add your Vercel domain (e.g., `your-app.vercel.app`).
