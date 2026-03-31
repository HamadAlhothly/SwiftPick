// SwiftPick — Driver Trip Screen (Redesigned)
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, RefreshControl, StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import { listStyles, SPACING, RADIUS } from '../../utils/listStyles';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { busService } from '../../services/busService';
import { LoadingSpinner } from '../../components';

export default function TripScreen({ navigation }) {
    const { user, logout } = useAuth();
    const { location, requestPermission, startWatching, stopWatching } = useLocation();
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('Route & Navigation');

    useFocusEffect(
        useCallback(() => {
            loadTrip();
            requestPermission();
        }, [])
    );

    useEffect(() => {
        if (trip?.status === 'in_progress') {
            startWatching(async (loc) => {
                try {
                    await busService.updateLocation(trip.id, loc.latitude, loc.longitude);
                } catch (e) { }
            });
            return () => stopWatching();
        }
    }, [trip?.status]);

    async function loadTrip() {
        try {
            const result = await busService.getActiveTrip();
            setTrip(result.data || null);
        } catch (e) {
            console.log('Failed to load trip:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function handleComplete() {
        Alert.alert('Complete Trip', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'End Trip', style: 'destructive',
                onPress: async () => {
                    setActionLoading(true);
                    try {
                        await busService.completeTrip(trip.id);
                        Alert.alert('Trip Ended', 'Shift completed.');
                        loadTrip();
                    } catch (error) {
                        Alert.alert('Error', error.message);
                    } finally {
                        setActionLoading(false);
                    }
                }
            }
        ]);
    }

    // For "Start Trip" if pending
    async function handleStart() {
        setActionLoading(true);
        try {
            await busService.confirmTrip(trip.id);
            loadTrip();
        } catch (e) { Alert.alert('Error', e.message); }
        finally { setActionLoading(false); }
    }

    if (loading) return <LoadingSpinner message="Loading Route..." />;

    if (!trip) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={{ fontSize: 50 }}>🚌</Text>
                <Text style={styles.emptyTitle}>No Active Assignment</Text>
                <TouchableOpacity onPress={loadTrip}><Text style={{ color: COLORS.driverHeader, marginTop: 20 }}>Refresh</Text></TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={COLORS.driverHeader} barStyle="light-content" />

            {/* Header Area */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.busTitle}>Bus {trip.bus_number}</Text>
                        <Text style={styles.driverName}>{user?.full_name || 'Driver'}</Text>
                    </View>
                    <View style={styles.statusPill}>
                        <Text style={styles.statusText}>{trip.status === 'in_progress' ? 'Trip Active' : 'Ready to Start'}</Text>
                    </View>
                </View>

                <View style={styles.routeBox}>
                    <Text style={styles.routeLabel}>Current Route</Text>
                    <Text style={styles.routeName}>{trip.route_name || 'Assigned Route'}</Text>
                </View>

                {/* Tabs */}
                <View style={styles.tabRow}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Route & Navigation' && styles.activeTab]}
                        onPress={() => setActiveTab('Route & Navigation')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Route & Navigation' && styles.activeTabText]}>Route & Navigation</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Student Manifest' && styles.activeTab]}
                        onPress={() => setActiveTab('Student Manifest')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Student Manifest' && styles.activeTabText]}>Student Manifest</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content Body */}
            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadTrip} colors={[COLORS.driverHeader]} />}
            >
                {activeTab === 'Route & Navigation' ? (
                    <>
                        {/* Live Map Button — prominently placed at top */}
                        <TouchableOpacity
                            style={styles.liveMapBtn}
                            onPress={() => navigation.navigate('DriverMap', { trip })}
                        >
                            <Text style={{ fontSize: 24 }}>🗺️</Text>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.liveMapBtnTitle}>Open Live Map</Text>
                                <Text style={styles.liveMapBtnSub}>View route, stops & broadcast GPS</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Trip Controls</Text>

                            {trip.status === 'in_progress' ? (
                                <TouchableOpacity style={styles.endTripBtn} onPress={handleComplete}>
                                    <View style={styles.checkBox} />
                                    <Text style={styles.endTripText}>End Trip</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={[styles.endTripBtn, { backgroundColor: COLORS.success }]} onPress={handleStart}>
                                    <Text style={[styles.endTripText, { color: '#000' }]}>Start Trip</Text>
                                </TouchableOpacity>
                            )}

                            <View style={styles.statsRow}>
                                <View style={styles.statCol}>
                                    <Text style={styles.statLabel}>Capacity</Text>
                                    <Text style={styles.statVal}>{trip.capacity || '45'}</Text>
                                </View>
                                <View style={styles.statCol}>
                                    <Text style={styles.statLabel}>Picked Up</Text>
                                    <Text style={styles.statVal}>{trip.boarding_logs?.filter(l => l.action === 'boarded').length || 0}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Current Location</Text>
                            <View style={styles.mapPlaceholder}>
                                <Text style={{ fontSize: 32 }}>📍</Text>
                                <Text style={styles.gpsText}>GPS Coordinates</Text>
                                <Text style={styles.coordText}>
                                    {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Acquiring...'}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.mapsBtn}>
                                <Text style={styles.mapsBtnText}>📍 Open in Maps</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Student Manifest</Text>
                        <TouchableOpacity style={styles.boardActionBtn} onPress={() => navigation.navigate('Boarding', { trip })}>
                            <Text style={styles.boardActionText}>Scan / Board Students</Text>
                        </TouchableOpacity>
                        {/* Simple list preview */}
                        {trip.stops?.map((stop, i) => (
                            <View key={i} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                                <Text style={{ fontWeight: '700', color: '#333' }}>Stop {i + 1}: {stop.stop_name}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => logout()}>
                <Text style={{ fontSize: 24, color: '#fff' }}>👤</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.driverBg },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: '#555', marginTop: 16 },

    header: { backgroundColor: COLORS.driverHeader, padding: 20, paddingBottom: 0, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    busTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
    driverName: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
    statusPill: { backgroundColor: COLORS.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    statusText: { color: '#fff', fontWeight: '700', fontSize: 12 },

    routeBox: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 12, marginBottom: 20 },
    routeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 4 },
    routeName: { color: '#fff', fontWeight: '700', fontSize: 16 },

    tabRow: { flexDirection: 'row' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
    activeTab: { backgroundColor: COLORS.driverBg },
    tabText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
    activeTabText: { color: COLORS.driverHeader, fontWeight: '700' },

    content: { flex: 1, padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 16 },

    endTripBtn: { backgroundColor: COLORS.btnRed, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    checkBox: { width: 24, height: 24, borderWidth: 2, borderColor: '#fff', borderRadius: 4, marginRight: 12 },
    endTripText: { color: '#fff', fontSize: 18, fontWeight: '700' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16 },
    statCol: { alignItems: 'center' },
    statLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
    statVal: { fontSize: 20, fontWeight: '700', color: '#222' },

    mapPlaceholder: { backgroundColor: '#F3F4F6', borderRadius: 12, height: 180, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    gpsText: { color: '#888', fontSize: 14, marginTop: 8 },
    coordText: { color: '#aaa', fontSize: 12, marginTop: 4 },

    mapsBtn: { backgroundColor: COLORS.btnBlue, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    mapsBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    boardActionBtn: { backgroundColor: COLORS.driverHeader, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
    boardActionText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.btnBlue, justifyContent: 'center', alignItems: 'center', elevation: 6 },

    liveMapBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.driverHeader, borderRadius: 16, padding: 16, marginBottom: 20 },
    liveMapBtnTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    liveMapBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
});
