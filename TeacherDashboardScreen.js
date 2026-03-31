// SwiftPick — Teacher Dashboard / Shared Checklist
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, RefreshControl } from 'react-native';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { busService } from '../../services/busService';
import useSocket from '../../hooks/useSocket';

export default function TeacherDashboardScreen({ navigation }) {
    const { logout } = useAuth();
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // We don't pass tripId here because we might manage multiple trips, 
    // or we just subscribe globally if the backend handles it. 
    // Wait, useSocket requires tripId to subscribe to specific rooms. 
    // Since we fetch trips first, we can listen below.
    const { isConnected, studentUpdates } = useSocket();

    const fetchTrips = useCallback(async () => {
        try {
            const response = await busService.teacherGetActiveTrips();
            setTrips(response.data || response || []);
        } catch (error) {
            console.error('Failed to fetch trips:', error);
            // Alert.alert('Error', 'Failed to load active bus trips.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchTrips();
    }, [fetchTrips]);

    // Handle real-time socket updates for boarding/releasing
    useEffect(() => {
        if (!studentUpdates || studentUpdates.length === 0) return;

        const latestUpdate = studentUpdates[0]; // The hook prepends updates
        
        setTrips((prevTrips) => {
            return prevTrips.map(trip => {
                if (trip.id === latestUpdate.tripId) {
                    const updatedStudents = trip.students.map(student => {
                        if (student.student_id === latestUpdate.studentId) {
                            if (latestUpdate.type === 'boarded') {
                                return { ...student, boarding_status: 'boarded', boarded_at: latestUpdate.boardedAt };
                            } else if (latestUpdate.type === 'released') {
                                return { ...student, teacher_status: 'released', teacher_released_at: latestUpdate.releasedAt };
                            }
                        }
                        return student;
                    });
                    return { ...trip, students: updatedStudents };
                }
                return trip;
            });
        });
    }, [studentUpdates]);

    const handleRelease = async (tripId, studentId) => {
        try {
            await busService.teacherReleaseStudent(tripId, studentId);
            // Optimistic UI update
            setTrips((prevTrips) => prevTrips.map(trip => {
                if (trip.id === tripId) {
                    const updatedStudents = trip.students.map(s => 
                        s.student_id === studentId ? { ...s, teacher_status: 'released' } : s
                    );
                    return { ...trip, students: updatedStudents };
                }
                return trip;
            }));
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to release student');
            fetchTrips(); // revert on fail
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchTrips();
    }, [fetchTrips]);

    const renderStudent = (tripId, item) => {
        const isReleased = item.teacher_status === 'released';
        const isBoarded = item.boarding_status === 'boarded';

        return (
            <View style={styles.card} key={item.student_id}>
                <View style={styles.cardTop}>
                    <View style={[styles.avatar, isBoarded && {backgroundColor: COLORS.success}]}>
                        <Text style={styles.avatarText}>{item.full_name[0]}</Text>
                    </View>
                    <View style={styles.cardHeaderInfo}>
                        <Text style={styles.studentName}>{item.full_name}</Text>
                        <Text style={styles.gradeText}>{item.grade || 'Student'}</Text>
                    </View>
                    
                    {isBoarded ? (
                        <View style={[styles.statusBadge, {backgroundColor: COLORS.success + '22'}]}>
                            <Text style={[styles.statusBadgeText, {color: COLORS.success}]}>Bus Boarded 🚌</Text>
                        </View>
                    ) : isReleased ? (
                        <View style={[styles.statusBadge, {backgroundColor: COLORS.primary + '22'}]}>
                            <Text style={[styles.statusBadgeText, {color: COLORS.primary}]}>Released to Bus 👣</Text>
                        </View>
                    ) : (
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>Waiting in Class🏫</Text>
                        </View>
                    )}
                </View>

                <View style={styles.actionRow}>
                    {!isReleased && !isBoarded ? (
                        <TouchableOpacity style={styles.markReadyBtn} onPress={() => handleRelease(tripId, item.student_id)}>
                            <Text style={styles.markReadyText}>Release to Bus</Text>
                            <Text style={{fontSize: 18}}>🚌</Text>
                        </TouchableOpacity>
                    ) : isReleased && !isBoarded ? (
                        <View style={styles.waitingBtn}>
                            <Text style={styles.waitingBtnText}>Waiting for Driver...</Text>
                        </View>
                    ) : (
                        <View style={[styles.waitingBtn, {backgroundColor: COLORS.success + '22'}]}>
                            <Text style={[styles.waitingBtnText, {color: COLORS.success}]}>Checked In By Driver ✅</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderTrip = ({ item }) => (
        <View style={styles.tripContainer}>
            <View style={styles.tripHeader}>
                <Text style={styles.tripTitle}>{item.route_name}</Text>
                <Text style={styles.tripSubtitle}>Bus {item.bus_number || item.plate_number}</Text>
            </View>
            {item.students?.length > 0 ? (
                item.students.map(student => renderStudent(item.id, student))
            ) : (
                <Text style={styles.emptyText}>No students assigned to this bus trip.</Text>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Shared Checklist</Text>
                    <Text style={styles.headerSubtitle}>Real-time Teacher & Driver Sync</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutLink}>
                    <Text style={{ fontSize: 13, color: COLORS.danger, fontWeight: 'bold' }}>Log Out</Text>
                </TouchableOpacity>
            </View>

            {/* Connection Status */}
            <View style={[styles.socketBanner, isConnected ? styles.socketConnected : styles.socketFailed]}>
                <Text style={styles.socketText}>
                    {isConnected ? '🟢 Syncing in real-time with Drivers' : '🔴 Reconnecting to live server...'}
                </Text>
            </View>

            {/* List */}
            {loading ? (
                <Text style={styles.emptyText}>Loading active bus trips...</Text>
            ) : trips.length > 0 ? (
                <FlatList
                    data={trips}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderTrip}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />
            ) : (
                <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                    <View style={{padding: 40, alignItems: 'center'}}>
                        <Text style={{fontSize: 48, marginBottom: 16}}>🚸</Text>
                        <Text style={styles.emptyText}>No active bus trips for your class right now.</Text>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, paddingBottom: 10 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#111' },
    headerSubtitle: { fontSize: 13, color: '#666', marginTop: 4 },
    logoutLink: { alignSelf: 'center', padding: 8, backgroundColor: '#fee2e2', borderRadius: 8 },
    
    socketBanner: { padding: 10, justifyContent: 'center', alignItems: 'center' },
    socketConnected: { backgroundColor: '#dcfce7' },
    socketFailed: { backgroundColor: '#fee2e2' },
    socketText: { fontSize: 12, fontWeight: '600', color: '#333' },

    list: { paddingHorizontal: 20, paddingBottom: 80, paddingTop: 10 },
    
    tripContainer: { marginBottom: 30 },
    tripHeader: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    tripTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
    tripSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },

    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
    cardHeaderInfo: { flex: 1 },
    studentName: { fontSize: 16, fontWeight: '700', color: '#2C3E50' },
    gradeText: { fontSize: 13, color: '#95A5A6', marginTop: 2 },
    
    statusBadge: { backgroundColor: '#FFF9C4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    statusBadgeText: { color: '#F1C40F', fontWeight: '700', fontSize: 12 },

    actionRow: { flexDirection: 'row', gap: 12 },
    markReadyBtn: { flex: 1, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    markReadyText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    
    waitingBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
    waitingBtnText: { color: '#64748b', fontWeight: '600', fontSize: 13 },

    emptyText: { color: '#666', textAlign: 'center', marginTop: 20, fontSize: 15, lineHeight: 22 },
});
