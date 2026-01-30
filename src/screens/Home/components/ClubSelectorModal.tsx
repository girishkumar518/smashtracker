import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../theme/theme';
import { Club } from '../../../models/types';
import { isPersonalClubId } from '../../../services/personalClubService';

interface ClubSelectorModalProps {
    visible: boolean;
    onClose: () => void;
    userClubs: Club[];
    activeClub: Club | null;
    onSelect: (club: Club) => void;
    onCreateClub: () => void;
    onJoinClub: () => void;
    theme: Theme;
}

const ClubSelectorModal: React.FC<ClubSelectorModalProps> = ({
    visible, onClose, userClubs, activeClub, onSelect, onCreateClub, onJoinClub, theme
}) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                            <View style={styles.handleContainer}>
                                <View style={styles.handle} />
                            </View>

                            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Switch Club</Text>

                            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                                {userClubs.map(club => {
                                    const isActive = activeClub?.id === club.id;
                                    const isPersonal = isPersonalClubId(club.id);

                                    return (
                                        <TouchableOpacity
                                            key={club.id}
                                            style={[
                                                styles.clubItem,
                                                { backgroundColor: isActive ? theme.colors.primary + '10' : 'transparent' }
                                            ]}
                                            onPress={() => {
                                                onSelect(club);
                                                onClose();
                                            }}
                                        >
                                            <View style={[styles.clubIcon, { backgroundColor: isPersonal ? theme.colors.secondary : theme.colors.primary }]}>
                                                <Text style={styles.clubIconText}>{club.name.substring(0, 2).toUpperCase()}</Text>
                                            </View>

                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={[styles.clubName, { color: theme.colors.textPrimary, fontWeight: isActive ? 'bold' : '600' }]}>
                                                    {club.name}
                                                </Text>
                                                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                                                    {isPersonal ? 'Personal Space' : `${club.members.length} Members`}
                                                </Text>
                                            </View>

                                            {isActive && <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { borderColor: theme.colors.border }]}
                                    onPress={() => { onClose(); onCreateClub(); }}
                                >
                                    <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
                                    <Text style={[styles.actionBtnText, { color: theme.colors.textPrimary }]}>New Club</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionBtn, { borderColor: theme.colors.border }]}
                                    onPress={() => { onClose(); onJoinClub(); }}
                                >
                                    <Ionicons name="enter-outline" size={20} color={theme.colors.textPrimary} />
                                    <Text style={[styles.actionBtnText, { color: theme.colors.textPrimary }]}>Join Club</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingTop: 12,
        paddingBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    handleContainer: { alignItems: 'center', marginBottom: 12 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },

    clubItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    clubIcon: {
        width: 40, height: 40,
        borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    clubIconText: { color: 'white', fontWeight: 'bold' },
    clubName: { fontSize: 16 },

    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)'
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    actionBtnText: { fontWeight: '600', marginLeft: 8 }
});

export default ClubSelectorModal;
