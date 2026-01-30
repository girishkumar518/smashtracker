import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient'; // Temporarily disabled to avoid rebuild
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../../../theme/theme';

interface StartMatchCardProps {
    theme: Theme;
}

const StartMatchCard: React.FC<StartMatchCardProps> = ({ theme }) => {
    const navigation = useNavigation<any>();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            style={styles.container}
            onPress={() => navigation.navigate('MatchSetup')}
        >
            <View
                style={styles.gradient}
            >
                {/* Decorative Circles */}
                <View style={styles.circle1} />
                <View style={styles.circle2} />

                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="badminton" size={40} color="white" style={styles.icon} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>Start New Match</Text>
                        <Text style={styles.subtitle}>Record your game stats now</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={28} color="rgba(255,255,255,0.8)" />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const createStyles = (theme: Theme) => StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 24,
        marginTop: 12,
        borderRadius: 24,
        shadowColor: "#38B2AC",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    gradient: {
        paddingVertical: 24,
        paddingHorizontal: 24,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#2C7A7B', // Fallback teal color
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 2
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        marginRight: 16
    },
    icon: {
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: 'white',
        letterSpacing: 0.5,
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2
    },
    subtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500'
    },
    // Decorative background elements
    circle1: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.05)',
        zIndex: 1
    },
    circle2: {
        position: 'absolute',
        bottom: -40,
        left: 20,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.03)',
        zIndex: 1
    }
});

export default StartMatchCard;
