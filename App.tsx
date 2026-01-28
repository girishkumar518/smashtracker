import * as React from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AuthProvider } from './src/context/AuthContext';
import { ClubProvider } from './src/context/ClubContext';
import { ThemeProvider } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  React.useEffect(() => {
    // Lock app to Portrait by default
    const lockPortrait = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch (error) {
        console.warn("Failed to lock portrait mode:", error);
      }
    };
    lockPortrait();
  }, []);

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
