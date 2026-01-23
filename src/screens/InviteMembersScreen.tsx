import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Share, Alert, Clipboard, TouchableOpacity } from 'react-native';
import { useClub } from '../context/ClubContext';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';
import Button from '../components/Button';
import Card from '../components/Card';
import { Ionicons } from '@expo/vector-icons';

export default function InviteMembersScreen() {
  const { activeClub } = useClub();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const onShare = async () => {
    if (!activeClub) return;
    try {
      const message = `Join my badminton club "${activeClub.name}" on SmashTracker! \n\nClub Code: ${activeClub.inviteCode} \n\nDownload the app and join!`;
      await Share.share({
        message,
      });
    } catch (error: any) {
      Alert.alert(error.message);
    }
  };

  const copyToClipboard = () => {
      if (activeClub?.inviteCode) {
          Clipboard.setString(activeClub.inviteCode);
          Alert.alert("Copied!", "Invite code copied to clipboard.");
      }
  };

  if (!activeClub) {
      return (
          <View style={styles.container}>
              <Text style={{color: theme.colors.textPrimary}}>No active club selected.</Text>
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Invite Members</Text>
        <Text style={styles.subtitle}>
          Share this code with your friends to let them join <Text style={{fontWeight: 'bold'}}>{activeClub.name}</Text>.
        </Text>

        <TouchableOpacity onPress={copyToClipboard}>
            <View style={styles.codeContainer}>
                <Text style={styles.code}>{activeClub.inviteCode}</Text>
                <Ionicons name="copy-outline" size={20} color={theme.colors.textSecondary} style={{marginLeft: 10}} />
            </View>
        </TouchableOpacity>
        <Text style={styles.hint}>Tap code to copy</Text>

        <Button 
          title="Share Invite" 
          onPress={onShare} 
          style={{ marginTop: 20, width: '100%' }}
          icon={<Ionicons name="share-social-outline" size={20} color="white" style={{marginRight: 8}} />}
        />
      </Card>
      
      <View style={{marginTop: 30, paddingHorizontal: 20}}>
          <Text style={{color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22}}>
              When new members join using this code, they will automatically appear in your club's player list.
          </Text>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    padding: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  codeContainer: {
    backgroundColor: theme.colors.surfaceHighlight,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
  },
  code: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  hint: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 8,
  }
});