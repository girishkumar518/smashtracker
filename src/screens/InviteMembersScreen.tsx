import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, Alert, ActivityIndicator, Linking, TouchableOpacity, Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import { useClub } from '../context/ClubContext';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';

export default function InviteMembersScreen() {
  const { activeClub, sendClubInvite } = useClub();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contacts.Contact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
          setPermissionGranted(true);
          const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
          });

          // Sort by name
          const sorted = data.sort((a, b) => {
              const nameA = a.name || '';
              const nameB = b.name || '';
              return nameA.localeCompare(nameB);
          });
          
          setContacts(sorted);
          setFilteredContacts(sorted);
        } else {
             Alert.alert('Permission needed', 'Contacts permission is required to invite friends.');
        }
      } catch (error) {
          console.log(error);
          Alert.alert('Error', 'Failed to load contacts.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text) {
      setFilteredContacts(contacts);
    } else {
      const lower = text.toLowerCase();
      const filtered = contacts.filter(c => 
        (c.name && c.name.toLowerCase().includes(lower))
      );
      setFilteredContacts(filtered);
    }
  };

  const inviteContact = async (contact: Contacts.Contact) => {
      if (!activeClub) return;
      
      const rawPhone = contact.phoneNumbers?.[0]?.number;
      if (!rawPhone) {
          shareGeneric("Join my club!"); // Fallback if no phone
          return;
      }

      // Clean phone for better matching/linking
      // Keep + if present, remove spaces, dashes, parens
      const cleanedPhone = rawPhone.replace(/[^\d+]/g, '');

      try {
          // Attempt to find user and send push notification
          const inviteSent = await sendClubInvite(cleanedPhone);
          
          if (inviteSent) {
              Alert.alert('Invite Sent', `An in-app invite and push notification has been sent to ${contact.name}!`);
              return;
          }
      } catch (e) {
          console.log("Error sending app invite, falling back to SMS", e);
      }

      // If not found in app, invite via SMS / WhatsApp
      const message = `Hey, join my badminton club "${activeClub.name}" on SmashTracker! \n\nClub Code: ${activeClub.inviteCode} \n\nDownload the app and join!`;

      if (cleanedPhone) {
          const isAvailable = await SMS.isAvailableAsync();
          if (isAvailable) {
              const { result } = await SMS.sendSMSAsync(
                  [cleanedPhone],
                  message
              );
              return; // Success or cancelled
          }
      }

      // Fallback: WhatsApp or Share
      // Try WhatsApp first if we have a phone number? 
      if (cleanedPhone) {
           // Try opening whatsapp
           // clean phone number fully for URL schemes (usually just digits)
           const whatsappPhone = cleanedPhone.replace(/[^\d]/g, ''); 
           const url = `whatsapp://send?phone=${whatsappPhone}&text=${encodeURIComponent(message)}`;
           
           const supported = await Linking.canOpenURL(url);
           if (supported) {
               await Linking.openURL(url);
           } else {
               // Fallback to system share
               shareGeneric(message);
           }
      } else {
          // Email?
           shareGeneric(message);
      }
  };

  const shareGeneric = async (msg: string) => {
      // We can use the Share API which we imported in ClubManagement, but let's just re-import or use Linking msg
       // Actually simpler to just use no-op or alert
       Alert.alert("No phone number", "This contact doesn't have a phone number to message directly. Use the main 'Share Code' button instead.");
  };

  const renderItem = ({ item }: { item: Contacts.Contact }) => (
    <View style={styles.contactRow}>
      <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.charAt(0) || '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.contactName}>{item.name || 'Unknown'}</Text>
        <Text style={styles.contactDetail}>
            {item.phoneNumbers?.[0]?.number || item.emails?.[0]?.email || 'No details'}
        </Text>
      </View>
      <Button 
        title="Invite" 
        size="small" 
        variant="outline"
        onPress={() => inviteContact(item)} 
      />
    </View>
  );

  if (!permissionGranted && !loading) {
      return (
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: theme.colors.textPrimary, marginBottom: 20 }}>Permission to access contacts was denied.</Text>
              <Button title="Retry Permission" onPress={() => Linking.openSettings()} />
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput 
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={theme.colors.textSecondary}
            value={search}
            onChangeText={handleSearch}
        />
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.emptyText}>No contacts found.</Text>}
        />
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary, // Using primary color for avatar bg
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  contactDetail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 20,
  },
});
