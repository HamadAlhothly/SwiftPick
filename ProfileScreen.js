// SwiftPick — Profile Screen (Parent & Driver)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../../utils/constants';
import { listStyles, SPACING, RADIUS } from '../../utils/listStyles';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
    const { user, logout } = useAuth();

    function handleLogout() {
        Alert.alert('Logout', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
        ]);
    }

    const roleLabels = {
        parent: '👨‍👩‍👧 Parent',
        driver: '🚌 Driver',
        teacher: '👩‍🏫 Teacher',
        admin: '🛡️ Admin',
    };

    return (
        <View style={styles.container}>
            {/* Avatar */}
            <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                </View>
                <Text style={styles.name}>{user?.full_name}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{roleLabels[user?.role] || user?.role}</Text>
                </View>
            </View>

            {/* Info Cards */}
            <View style={styles.infoSection}>
                <View style={listStyles.card}>
                    <Text style={listStyles.sectionTitle}>Email</Text>
                    <Text style={listStyles.title}>{user?.email}</Text>
                </View>
                <View style={listStyles.card}>
                    <Text style={listStyles.sectionTitle}>Phone</Text>
                    <Text style={listStyles.title}>{user?.phone || 'Not set'}</Text>
                </View>
                <View style={listStyles.card}>
                    <Text style={listStyles.sectionTitle}>Account ID</Text>
                    <Text style={listStyles.title}>#{user?.id}</Text>
                </View>
            </View>

            {/* App Info */}
            <View style={styles.appInfo}>
                <Text style={styles.appInfoText}>SwiftPick v1.0.0</Text>
                <Text style={styles.appInfoSubtext}>School Pickup & Bus Tracking System</Text>
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg, padding: 20 },
    avatarSection: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
    avatar: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center', marginBottom: 14,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
    name: { fontSize: 22, fontWeight: '700', color: COLORS.text },
    roleBadge: {
        backgroundColor: COLORS.primary + '22', paddingHorizontal: 16, paddingVertical: 6,
        borderRadius: 20, marginTop: 8, borderWidth: 1, borderColor: COLORS.primary + '44',
    },
    roleText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
    infoSection: { gap: SPACING.xs, marginBottom: 30 },
    appInfo: { alignItems: 'center', marginBottom: 24 },
    appInfoText: { color: COLORS.textMuted, fontSize: 13 },
    appInfoSubtext: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
    logoutBtn: {
        borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.md,
        padding: 14, alignItems: 'center',
    },
    logoutText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
});
