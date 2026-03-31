// SwiftPick — Pickup Detail Screen
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { COLORS } from '../../utils/constants';
import { pickupService } from '../../services/pickupService';
import { listStyles, SPACING, RADIUS } from '../../utils/listStyles';
import { formatDateTime, getStatusColor, getStatusLabel } from '../../utils/helpers';
import PickupStatusBadge from '../../components/PickupStatusBadge';

export default function PickupScreen({ route, navigation }) {
    const { student, activePickup: initialPickup } = route.params || {};
    const [pickup, setPickup] = useState(initialPickup || null);
    const [loading, setLoading] = useState(false);

    // Poll for status updates
    useEffect(() => {
        if (!pickup || pickup.status === 'dismissed' || pickup.status === 'cancelled') return;

        const interval = setInterval(async () => {
            try {
                const result = await pickupService.getActivePickups();
                const updated = (result.data || []).find(
                    (p) => p.student_id == student?.id
                );
                if (updated) setPickup(updated);
                else {
                    // Pickup completed or cancelled — refresh from history
                    setPickup((prev) => prev ? { ...prev, status: 'dismissed' } : null);
                }
            } catch (e) { }
        }, 5000);

        return () => clearInterval(interval);
    }, [pickup?.id]);

    async function handleCancel() {
        if (!pickup) return;
        Alert.alert('Cancel Pickup', 'Are you sure you want to cancel this pickup request?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: async () => {
                    setLoading(true);
                    try {
                        await pickupService.cancelPickup(pickup.id);
                        Alert.alert('Cancelled', 'Pickup request has been cancelled.');
                        navigation.goBack();
                    } catch (error) {
                        Alert.alert('Error', error.message);
                    } finally {
                        setLoading(false);
                    }
                },
            },
        ]);
    }

    const statusColor = pickup ? getStatusColor(pickup.status) : COLORS.textSecondary;

    return (
        <ScrollView style={styles.container} contentContainerStyle={listStyles.screenPadding}>
            {/* Student Info */}
            <View style={styles.studentCard}>
                <View style={listStyles.avatarLg}>
                    <Text style={listStyles.avatarTextLg}>
                        {student?.full_name?.charAt(0) || '?'}
                    </Text>
                </View>
                <Text style={listStyles.title}>{student?.full_name}</Text>
                <Text style={listStyles.subtitle}>
                    {student?.class_name || 'No class'} • {student?.grade || '—'}
                </Text>
            </View>

            {/* Pickup Status */}
            {pickup ? (
                <View style={styles.statusSection}>
                    <Text style={listStyles.sectionTitle}>Pickup Status</Text>
                    <View style={[listStyles.card, listStyles.row, { borderColor: statusColor + '44' }]}>
                        <View style={[listStyles.dotLg, { backgroundColor: statusColor }]} />
                        <View style={listStyles.content}>
                            <Text style={[styles.statusText, { color: statusColor }]}>
                                {getStatusLabel(pickup.status)}
                            </Text>
                            <Text style={listStyles.meta}>
                                Requested: {formatDateTime(pickup.arrived_at)}
                            </Text>
                            {pickup.dismissed_at && (
                                <Text style={listStyles.meta}>
                                    Dismissed: {formatDateTime(pickup.dismissed_at)}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Timeline */}
                    <View style={styles.timeline}>
                        {[
                            { key: 'pending', label: 'Request Created', icon: '📝' },
                            { key: 'teacher_notified', label: 'Teacher Notified', icon: '🔔' },
                            { key: 'dismissed', label: 'Student Dismissed', icon: '✅' },
                        ].map((step, idx) => {
                            const reached = ['pending', 'teacher_notified', 'dismissed']
                                .indexOf(pickup.status) >= idx;
                            return (
                                <View key={step.key} style={styles.timelineStep}>
                                    <View style={[styles.timelineDot, reached && styles.timelineDotActive]}>
                                        <Text style={styles.timelineIcon}>{reached ? step.icon : '⏳'}</Text>
                                    </View>
                                    <Text style={[styles.timelineLabel, reached && styles.timelineLabelActive]}>
                                        {step.label}
                                    </Text>
                                    {idx < 2 && (
                                        <View style={[styles.timelineLine, reached && styles.timelineLineActive]} />
                                    )}
                                </View>
                            );
                        })}
                    </View>

                    {/* Cancel Button */}
                    {(pickup.status === 'pending' || pickup.status === 'teacher_notified') && (
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={handleCancel}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.danger} />
                            ) : (
                                <Text style={styles.cancelBtnText}>Cancel Pickup</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={listStyles.emptyContainer}>
                    <Text style={listStyles.emptyIcon}>🟢</Text>
                    <Text style={listStyles.emptySubtitle}>No active pickup for this student</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    studentCard: { alignItems: 'center', marginBottom: SPACING.xxl },
    statusSection: {},
    statusText: { fontSize: 17, fontWeight: '700' },
    timeline: { marginBottom: SPACING.xxl },
    timelineStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, position: 'relative' },
    timelineDot: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    timelineDotActive: { backgroundColor: COLORS.primary + '33' },
    timelineIcon: { fontSize: 16 },
    timelineLabel: { color: COLORS.textMuted, fontSize: 14, flex: 1 },
    timelineLabelActive: { color: COLORS.text, fontWeight: '600' },
    timelineLine: {
        position: 'absolute', left: 17, top: 36, width: 2, height: 12,
        backgroundColor: COLORS.surface,
    },
    timelineLineActive: { backgroundColor: COLORS.primary },
    cancelBtn: {
        borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.md,
        padding: 14, alignItems: 'center',
    },
    cancelBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
});
