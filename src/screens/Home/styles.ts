import { StyleSheet, Platform, StatusBar } from 'react-native';
import { Theme } from '../../theme/theme';

export const createStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    content: {
        padding: 16,
    },
    alertBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEEBC8',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FBD38D',
    },
    alertTitle: {
        color: '#744210',
        fontWeight: 'bold',
        fontSize: 14,
    },
    alertText: {
        color: '#744210',
        fontSize: 12,
    },
    alertCard: {
        padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 16,
        borderColor: theme.colors.secondary,
        backgroundColor: theme.colors.secondary + '15'
    },
    footer: { alignItems: 'center', marginBottom: 20, marginTop: 20 },
    footerText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
});
