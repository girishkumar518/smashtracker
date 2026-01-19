import * as React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { ClubProvider } from './src/context/ClubContext';
import { ThemeProvider } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ClubProvider>
          <RootNavigator />
        </ClubProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
