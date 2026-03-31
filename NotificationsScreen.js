// SwiftPick — Notifications Screen
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import { listStyles, SPACING } from '../../utils/listStyles';
import { notificationService } from '../../services/notificationService';
import { NotificationItem, LoadingSpinner } from '../../components';

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => { loadNotifications(); }, [])
    );

    async function loadNotifications() {
        try {
            const result = await notificationService.getNotifications();
            setNotifications(result.data || []);
        } catch (e) {
            console.log('Failed to load notifications:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function handlePress(notification) {
        if (!notification.is_read) {
            try {
                await notificationService.markAsRead(notification.id);
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notification.id ? { ...n, is_read: 1 } : n
                    )
                );
            } catch (e) { }
        }
    }

    if (loading) return <LoadingSpinner message="Loading notifications..." />;

    return (
        <View style={styles.container}>
            <FlatList
                data={notifications}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); loadNotifications(); }}
                        tintColor={COLORS.primary}
                    />
                }
                renderItem={({ item }) => (
                    <NotificationItem notification={item} onPress={handlePress} />
                )}
                ListEmptyComponent={
                    <View style={listStyles.emptyContainer}>
                        <Text style={listStyles.emptyIcon}>🔔</Text>
                        <Text style={listStyles.emptyTitle}>No notifications yet</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    list: { padding: SPACING.lg },
});
