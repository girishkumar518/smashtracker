import * as React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { ClubProvider } from './src/context/ClubContext';
import { MatchProvider } from './src/context/MatchContext';
import { StatsProvider } from './src/context/StatsContext';
import { ThemeProvider } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ClubProvider>
          <MatchProvider>
            <StatsProvider>
              <RootNavigator />
            </StatsProvider>
          </MatchProvider>
        </ClubProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
