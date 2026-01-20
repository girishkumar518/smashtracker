import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet, Platform, SafeAreaView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { COMMON_CODES } from '../constants/CountryCodes';

interface CountryCodePickerProps {
  selectedCode: string;
  onSelect: (code: string) => void;
  disabled?: boolean;
}

export default function CountryCodePicker({ selectedCode, onSelect, disabled }: CountryCodePickerProps) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { theme } = useTheme();

  const filteredCodes = COMMON_CODES.filter(c => 
    c.country.toLowerCase().includes(search.toLowerCase()) || 
    c.code.includes(search)
  );

  if (disabled) {
      return (
        <View style={[styles.trigger, { backgroundColor: theme.colors.surfaceHighlight, borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>{selectedCode}</Text>
        </View>
      );
  }

  return (
    <>
      <TouchableOpacity 
        style={[styles.trigger, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} 
        onPress={() => setVisible(true)}
      >
        <Text style={{ color: theme.colors.textPrimary, fontSize: 16, marginRight: 4 }}>{selectedCode}</Text>
        <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Select Country Code</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={{ color: theme.colors.primary, fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ padding: 12 }}>
             <TextInput 
                style={[styles.searchInput, { backgroundColor: theme.colors.surfaceHighlight, color: theme.colors.textPrimary }]}
                placeholder="Search country or code..."
                placeholderTextColor={theme.colors.textSecondary}
                value={search}
                onChangeText={setSearch}
             />
          </View>

          <FlatList
            data={filteredCodes}
            keyExtractor={item => item.country}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.item, { borderBottomColor: theme.colors.border }]}
                onPress={() => {
                  onSelect(item.code);
                  setVisible(false);
                }}
              >
                <Text style={{ fontSize: 20, marginRight: 12 }}>{item.flag}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 16 }}>{item.country}</Text>
                </View>
                <Text style={{ color: theme.colors.textSecondary, fontWeight: 'bold' }}>{item.code}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 80,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchInput: {
      padding: 12,
      borderRadius: 8,
      fontSize: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
