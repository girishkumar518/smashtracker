import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateClubScreen from '../screens/CreateClubScreen';
import MatchSetupScreen from '../screens/MatchSetupScreen';
import LiveScoreScreen from '../screens/LiveScoreScreen';
import ManualScoreScreen from '../screens/ManualScoreScreen';
import JoinClubScreen from '../screens/JoinClubScreen';
import ClubManagementScreen from '../screens/ClubManagementScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MatchOverviewScreen from '../screens/MatchOverviewScreen';

import MatchHistoryScreen from '../screens/MatchHistoryScreen';
import GlobalStatsScreen from '../screens/GlobalStatsScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // App Stack (Authenticated)
          <Stack.Group>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
            <Stack.Screen name="CreateClub" component={CreateClubScreen} options={{ headerShown: true, title: 'Create New Club' }} />
            <Stack.Screen name="JoinClub" component={JoinClubScreen} options={{ headerShown: true, title: 'Join Existing Club' }} />
            <Stack.Screen name="MatchSetup" component={MatchSetupScreen} options={{ headerShown: true, title: 'New Match' }} />
            <Stack.Screen name="LiveScore" component={LiveScoreScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MatchOverview" component={MatchOverviewScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MatchHistory" component={MatchHistoryScreen} options={{ headerShown: true, title: 'Match History' }} />
            <Stack.Screen name="GlobalStats" component={GlobalStatsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ManualScore" component={ManualScoreScreen} options={{ headerShown: true, title: 'Record Result' }} />
            <Stack.Screen name="ClubManagement" component={ClubManagementScreen} options={{ headerShown: true, title: 'Manage Club' }} />

          </Stack.Group>
        ) : (
          // Auth Stack (Unauthenticated)
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
