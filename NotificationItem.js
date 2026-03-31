// SwiftPick — Notification Item Component
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';
import { listStyles, SPACING } from '../utils/listStyles';
import { timeAgo } from '../utils/helpers';

const TYPE_ICONS = {
    pickup_ready: '📍',
    dismissed: '✅',
    bus_nearby: '🚌',
    trip_started: '🚀',
    trip_completed: '🏁',
    general: '🔔',
};

export default function NotificationItem({ notification, onPress }) {
    const isRead = notification.is_read === 1 || notification.is_read === '1';

    return (
        <TouchableOpacity
            style={[listStyles.card, listStyles.rowTop, !isRead && listStyles.cardHighlight]}
            onPress={() => onPress && onPress(notification)}
            activeOpacity={0.8}
        >
            <Text style={listStyles.iconLead}>{TYPE_ICONS[notification.type] || '🔔'}</Text>
            <View style={listStyles.content}>
                <Text style={[listStyles.title, !isRead && styles.unreadText]}>
                    {notification.title}
                </Text>
                <Text style={listStyles.subtitle} numberOfLines={2}>
                    {notification.body}
                </Text>
                <Text style={listStyles.meta}>{timeAgo(notification.created_at)}</Text>
            </View>
            {!isRead && <View style={[listStyles.dot, { backgroundColor: COLORS.primary, marginTop: 6 }]} />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    unreadText: {
        fontWeight: '700',
    },
});
