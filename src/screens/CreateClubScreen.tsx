import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableWithoutFeedback, Keyboard, SafeAreaView } from 'react-native';
import Button from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { useClub } from '../context/ClubContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';

export default function CreateClubScreen() {
  const [clubName, setClubName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { createClub } = useClub();
  const { theme, isDark } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleCreate = async () => {
    if (!clubName.trim()) {
      Alert.alert('Error', 'Please enter a club name');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to create club:', clubName);
      
      const timeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timed out. Check your internet or Firebase settings.')), 10000);
      });

      await Promise.race([createClub(clubName), timeout]);

      Alert.alert('Success', `Club "${clubName}" created!`);
      navigation.goBack();
    } catch (error: any) {
      console.error("Create Club Error:", error);
      Alert.alert('Error', error.message || 'Failed to create club. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Create New Club</Text>
            <Text style={styles.subtitle}>Start your own community</Text>
        </View>

        <View style={styles.form}>
            <Text style={styles.label}>CLUB NAME</Text>
            <View style={styles.inputContainer}>
                <Ionicons name="people-circle-outline" size={24} color={theme.colors.textSecondary} style={{marginRight: 12}} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Downtown Smashers"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={clubName}
                  onChangeText={setClubName}
                  autoFocus
                />
            </View>

            <Button 
              title={loading ? "Creating..." : "Create Club"} 
              onPress={handleCreate} 
              disabled={loading}
              style={{marginTop: 24, backgroundColor: theme.colors.primary}}
            />
            
            <Button 
                title="Cancel"
                variant="outline"
                onPress={() => navigation.goBack()}
                style={{marginTop: 12, borderColor: theme.colors.surfaceHighlight}}
                textStyle={{color: theme.colors.textSecondary}}
            />
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  header: {
      marginTop: 40,
      marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
  },
  form: {
      backgroundColor: theme.colors.surface,
      padding: 24,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceHighlight, // inputBg replacement
      borderRadius: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.colors.surfaceHighlight
  },
  input: {
    flex: 1,
    height: 50,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
});

