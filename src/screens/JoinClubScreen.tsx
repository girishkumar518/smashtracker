import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Button from '../components/Button';
import Card from '../components/Card';
import { useClub } from '../context/ClubContext';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';

export default function JoinClubScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();
  const { joinClub } = useClub();
  const { theme, isDark } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleJoin = async () => {
    if (code.length < 6) {
      Alert.alert('Invalid Code', 'Club invite code must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await joinClub(code);
      if (result.success) {
        if (Platform.OS === 'web') {
            alert(result.message);
            navigation.replace('Home');
        } else {
            Alert.alert('Status', result.message, [
                { text: 'Go to Dashboard', onPress: () => navigation.replace('Home') }
            ]);
        }
      } else {
        const errorMsg = result.message || 'Invalid invite code. Please check and try again.';
        if (Platform.OS === 'web') alert(errorMsg);
        else Alert.alert('Error', errorMsg);
      }
    } catch (error) {
        if (Platform.OS === 'web') alert('Failed to join club. Please try again.');
        else Alert.alert('Error', 'Failed to join club. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      <View style={styles.container}>
        <Card style={styles.card}>
          <Text style={styles.title}>Join a Club</Text>
          <Text style={styles.subtitle}>Enter the invite code shared by your club admin.</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter Invite Code (e.g. AB12CD)"
            placeholderTextColor={theme.colors.textSecondary}
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={8}
          />

          <Button 
            title={loading ? "Joining..." : "Join Club"} 
            onPress={handleJoin} 
            disabled={loading || !code}
          />
          
          {loading && <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />}
        </Card>
        
        <Button 
          title="Cancel" 
          variant="outline" 
          onPress={() => navigation.goBack()} 
          style={{ marginTop: 20 }}
        />
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    padding: 24,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: theme.colors.surfaceHighlight, // Was #EDF2F7
    borderRadius: 8,
    padding: 16,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: theme.colors.textPrimary,
    marginBottom: 24,
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
