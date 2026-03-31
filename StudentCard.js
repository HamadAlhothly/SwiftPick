// SwiftPick — Student Card Component (Redesigned)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { COLORS } from '../utils/constants';

export default function StudentCard({ student, activePickup, onPickup, onPress }) {
    const isReady = activePickup?.status === 'ready' || student.status === 'ready'; // Mock status usage
    const isOnWay = activePickup?.status === 'on_the_way' || student.status === 'on_the_way';

    // Status Logic
    let statusColor = COLORS.textGray;
    let statusText = 'Not picked up';
    if (isReady) {
        statusColor = COLORS.ready;
        statusText = 'Ready for Pickup';
    } else if (isOnWay) {
        statusColor = COLORS.onWay;
        statusText = 'On the Way';
    } else if (activePickup?.status === 'picked_up') {
        statusColor = COLORS.success;
        statusText = 'Picked Up';
    }

    return (
        <View style={styles.card}>
            {/* Top Row: Avatar + Info */}
            <View style={styles.headerRow}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{student.full_name?.charAt(0)}</Text>
                    {/* Outline icon placeholder if needed */}
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{student.full_name}</Text>
                    <Text style={styles.grade}>{student.grade || 'Grade'} • {student.class_name || ''}</Text>
                </View>
            </View>

            {/* Status & Location */}
            <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: statusColor }]} />
                <Text style={styles.statusText}>{statusText}</Text>
            </View>

            <View style={styles.locationRow}>
                <Text style={styles.icon}>📍</Text>
                <Text style={styles.locationText}>{student.location || 'Main Entrance'}</Text>
            </View>

            {/* Action / Progress */}
            <View style={styles.actionContainer}>
                {isReady && !activePickup?.is_checked_in ? (
                    <TouchableOpacity style={styles.checkInBtn} onPress={() => onPickup(student)}>
                        <Text style={styles.checkInText}>✅  I'm Here - Check In</Text>
                    </TouchableOpacity>
                ) : isOnWay ? (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: '60%' }]} />
                        </View>
                        <Text style={styles.progressLabel}>On the way to Main Entrance</Text>
                    </View>
                ) : (
                    <View style={styles.busRow}>
                        <Text>🚌</Text>
                        <Text style={styles.busText}>Bus {student.bus_number || '12'}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.parentSurface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center',
        marginRight: 12
    },
    avatarText: { fontSize: 20, fontWeight: '700', color: COLORS.parentHeader },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
    grade: { fontSize: 13, color: COLORS.textGray, marginTop: 2 },

    statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { fontSize: 14, color: COLORS.textDark, fontWeight: '500' },

    locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    icon: { fontSize: 14, marginRight: 8, width: 14, textAlign: 'center' },
    locationText: { fontSize: 14, color: COLORS.textGray },

    actionContainer: {},
    checkInBtn: {
        backgroundColor: COLORS.btnGreen,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    checkInText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    progressContainer: { marginTop: 4 },
    progressBar: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, marginBottom: 8 },
    progressFill: { height: 6, backgroundColor: COLORS.btnGreen, borderRadius: 3 },
    progressLabel: { fontSize: 12, color: COLORS.textGray },

    busRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    busText: { color: COLORS.textGray, fontWeight: '500' }
});
