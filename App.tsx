import * as React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { ClubProvider } from './src/context/ClubContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <ClubProvider>
        <RootNavigator />
      </ClubProvider>
    </AuthProvider>
  );
}
