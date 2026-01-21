import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const { theme, isDark } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      <View style={styles.keyboardView}>
        <View style={styles.header}>
          <Text style={styles.title}>SmashTracker</Text>
          <Text style={styles.subtitle}>Badminton Club Management</Text>
        </View>

        <View style={styles.form}>
           <Text style={{textAlign: 'center', color: theme.colors.textSecondary, marginBottom: 24}}>
             Sign in to manage your clubs, track scores, and view stats.
           </Text>

           <TouchableOpacity 
             style={[styles.button, { backgroundColor: '#DB4437', marginTop: 10, flexDirection: 'row', justifyContent: 'center' }]} 
             onPress={signInWithGoogle}
           >
             <Text style={[styles.buttonText, {marginLeft: 8}]}>Sign In with Google</Text>
           </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.surfaceHighlight,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  input: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
  },
  helper: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

