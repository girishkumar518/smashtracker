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
