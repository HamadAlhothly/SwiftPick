// SwiftPick — Boarding Screen (Driver / Shared Checklist)
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native';
import { COLORS } from '../../utils/constants';
import { listStyles, SPACING, RADIUS } from '../../utils/listStyles';
import { busService } from '../../services/busService';
import useSocket from '../../hooks/useSocket';

export default function BoardingScreen({ route, navigation }) {
    const { trip } = route.params || {};
    const [students, setStudents] = useState(trip?.students || []);
    const [loadingStudent, setLoadingStudent] = useState(null); // Track which student is being boarded

    // Listen to real-time releases from the teacher
    const { isConnected, studentUpdates } = useSocket({ tripId: trip?.id });

    useEffect(() => {
        if (!studentUpdates || studentUpdates.length === 0) return;

        const latestUpdate = studentUpdates[0];
        if (latestUpdate.tripId === trip?.id) {
            setStudents(prev => prev.map(s => {
                if (s.student_id === latestUpdate.studentId) {
                    if (latestUpdate.type === 'released') {
                        return { ...s, teacher_status: 'released', teacher_released_at: latestUpdate.releasedAt };
                    } else if (latestUpdate.type === 'boarded') {
                        return { ...s, boarding_status: 'boarded', boarded_at: latestUpdate.boardedAt };
                    }
                }
                return s;
            }));
        }
    }, [studentUpdates, trip?.id]);

    async function handleBoard(studentId) {
        setLoadingStudent(studentId);
        try {
            await busService.boardStudent(trip.id, studentId);
            // Optimistic update
            setStudents(prev => prev.map(s => 
                s.student_id === studentId ? { ...s, boarding_status: 'boarded', boarded_at: new Date().toISOString() } : s
            ));
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to board student');
        } finally {
            setLoadingStudent(null);
        }
    }

    const renderStudent = ({ item }) => {
        const isBoarded = item.boarding_status === 'boarded' || item.boarding_status === 'dropped_off';
        const isReleased = item.teacher_status === 'released';
        const isLoading = loadingStudent === item.student_id;

        return (
            <View style={listStyles.card}>
                <View style={[listStyles.row, { marginBottom: 10 }]}>
                    <View style={[styles.avatar, isBoarded && {backgroundColor: COLORS.success}]}>
                        <Text style={styles.avatarText}>{item.full_name[0]}</Text>
                    </View>
                    <View style={listStyles.content}>
                        <Text style={listStyles.title}>{item.full_name}</Text>
                        <Text style={listStyles.subtitle}>{item.class_name || item.grade}</Text>
                    </View>
                </View>

                {/* Status Indicators */}
                <View style={styles.statusRow}>
                    {/* Teacher Sync Status */}
                    <View style={[styles.badge, isReleased ? styles.badgePrimary : styles.badgeMuted]}>
                        <Text style={[styles.badgeText, isReleased ? {color: COLORS.primary} : {color: '#7f8c8d'}]}>
                            {isReleased ? "✅ Released by Teacher" : "🏫 Still in Class"}
                        </Text>
                    </View>

                    {/* Driver Board Status */}
                    <View style={[styles.badge, isBoarded ? styles.badgeSuccess : styles.badgeWait]}>
                        <Text style={[styles.badgeText, isBoarded ? {color: COLORS.success} : {color: '#f39c12'}]}>
                            {isBoarded ? "🚌 Boarded" : "⏳ Waiting"}
                        </Text>
                    </View>
                </View>

                {/* Actions */}
                {!isBoarded && (
                    <TouchableOpacity 
                        style={[styles.boardBtn, isLoading && { opacity: 0.7 }]}
                        onPress={() => handleBoard(item.student_id)}
                        disabled={isLoading}
                    >
                        <Text style={styles.boardBtnText}>
                            {isLoading ? "Processing..." : "Mark Boarded 🚌"}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, listStyles.screenPadding]}>
                <Text style={styles.heading}>Manifest Checklist</Text>
                <Text style={styles.subHeading}>Bus {trip?.bus_number} • {trip?.route_name}</Text>
                
                {/* Connection Status */}
                <View style={[styles.socketBanner, isConnected ? styles.socketSuccess : styles.socketWarn]}>
                    <Text style={[styles.socketBannerText, isConnected ? {color: '#15803d'} : {color: '#991b1b'}]}>
                        {isConnected ? "🟢 Syncing real-time with School" : "🔴 Reconnecting..."}
                    </Text>
                </View>
            </View>

            <FlatList
                data={students}
                keyExtractor={(item) => String(item.student_id)}
                renderItem={renderStudent}
                contentContainerStyle={listStyles.screenPadding}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No students available on this trip to board.</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: SPACING.lg },
    heading: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: SPACING.md },
    subHeading: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
    
    socketBanner: { marginTop: 12, padding: 8, borderRadius: 6, alignItems: 'center' },
    socketSuccess: { backgroundColor: '#dcfce7' },
    socketWarn: { backgroundColor: '#fee2e2' },
    socketBannerText: { fontSize: 12, fontWeight: '700' },

    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    
    statusRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
    badge: { flex: 1, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 6, alignItems: 'center' },
    badgePrimary: { backgroundColor: COLORS.primary + '15' },
    badgeMuted: { backgroundColor: '#f1f5f9' },
    badgeSuccess: { backgroundColor: COLORS.success + '15' },
    badgeWait: { backgroundColor: '#fef3c7' },
    badgeText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

    boardBtn: { backgroundColor: COLORS.success, padding: 14, borderRadius: RADIUS.md, alignItems: 'center' },
    boardBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    
    emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40, fontSize: 15 },
});
