import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../../../theme/theme';

interface StartMatchFABProps {
    theme: Theme;
}

const StartMatchFAB: React.FC<StartMatchFABProps> = ({ theme }) => {
    const navigation = useNavigation<any>();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <View style={styles.fabContainer}>
            <TouchableOpacity
                activeOpacity={0.8}
                style={styles.fab}
                onPress={() => navigation.navigate('MatchSetup')}
            >
                <View style={styles.glowRing} />
                <Ionicons name="play" size={32} color="white" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
        </View>
    );
};

const createStyles = (theme: Theme) => StyleSheet.create({
    fabContainer: {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fab: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    glowRing: {
        position: 'absolute',
        width: 84,
        height: 84,
        borderRadius: 42,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        opacity: 0.3,
    }
});

export default StartMatchFAB;
