import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../../../theme/theme';

interface EmptyHomeStateProps {
    theme: Theme;
}

const EmptyHomeState: React.FC<EmptyHomeStateProps> = ({ theme }) => {
    const navigation = useNavigation<any>();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <View style={styles.emptyState}>
            <Ionicons name="people-circle-outline" size={80} color={theme.colors.textSecondary} />

            <Text style={styles.emptyTitle}>No Club Found</Text>
            <Text style={styles.emptyText}>
                You are not currently a member of any badminton club.
                Create a new club to invite friends, or join an existing one.
            </Text>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.bigActionBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => navigation.navigate('CreateClub')}
                >
                    <Ionicons name="add-circle-outline" size={24} color="white" />
                    <Text style={styles.bigActionBtnText}>Create a Club</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.bigActionBtn, { backgroundColor: theme.colors.surfaceHighlight }]}
                    onPress={() => navigation.navigate('JoinClub')}
                >
                    <Ionicons name="search-outline" size={24} color={theme.colors.textPrimary} />
                    <Text style={[styles.bigActionBtnText, { color: theme.colors.textPrimary }]}>Join a Club</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const createStyles = (theme: Theme) => StyleSheet.create({
    emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
    emptyTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 12, marginTop: 16 },
    emptyText: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
    actionButtons: { width: '100%', gap: 16 },
    bigActionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 16, borderRadius: 12, elevation: 2
    },
    bigActionBtnText: { fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
});

export default EmptyHomeState;
