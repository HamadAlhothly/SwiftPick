// SwiftPick — Driver Map Screen
// Map view for the driver showing the active route with stops.
// Integrates socketService.js to broadcast live GPS location
// and shows the list of students at each stop.
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { COLORS } from '../../utils/constants';
import { busService } from '../../services/busService';
import { locationService } from '../../services/locationService';
import useSocket from '../../hooks/useSocket';
import LiveTrackingMap from '../../components/LiveTrackingMap';

export default function DriverMapScreen({ route, navigation }) {
    const [trip, setTrip] = useState(route?.params?.trip || null);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [locationWatcher, setLocationWatcher] = useState(null);
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const { isConnected } = useSocket();

    // Load trip data if not passed via navigation
    useEffect(() => {
        if (!trip) {
            loadTrip();
        }
    }, []);

    const loadTrip = async () => {
        try {
            const response = await busService.getActiveTrip();
            setTrip(response.data || response);
        } catch (error) {
            Alert.alert('Error', 'Could not load trip data');
        }
    };

    /**
     * Start broadcasting GPS location via Socket.IO + REST API.
     */
    const startBroadcasting = useCallback(async () => {
        if (!trip || isBroadcasting) return;

        try {
            await locationService.requestPermissions();

            const watcher = await locationService.watchPosition(
                async (location) => {
                    setCurrentLocation(location);

                    // This sends via Socket.IO AND REST (see busService.js)
                    await busService.updateLocation(
                        trip.id,
                        location.latitude,
                        location.longitude
                    );
                },
                5000 // Update every 5 seconds
            );

            setLocationWatcher(watcher);
            setIsBroadcasting(true);
        } catch (error) {
            Alert.alert('Location Error', error.message);
        }
    }, [trip, isBroadcasting]);

    /**
     * Stop broadcasting GPS location.
     */
    const stopBroadcasting = useCallback(() => {
        if (locationWatcher) {
            locationWatcher.remove();
            setLocationWatcher(null);
        }
        setIsBroadcasting(false);
    }, [locationWatcher]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (locationWatcher) {
                locationWatcher.remove();
            }
        };
    }, [locationWatcher]);

    /**
     * Build route coordinates for the polyline from trip stops.
     */
    const routeCoordinates = (trip?.stops || []).map((stop) => ({
        latitude: parseFloat(stop.latitude),
        longitude: parseFloat(stop.longitude),
    }));

    /**
     * The school location (first stop or default fallback).
     */
    const schoolLocation = trip?.stops?.[0]?.latitude
        ? {
            latitude: parseFloat(trip.stops[0].latitude),
            longitude: parseFloat(trip.stops[0].longitude),
        }
        : { latitude: 21.480583910625707, longitude: 39.94464423230812 }; // Default: Kindergarten, Mecca

    /**
     * Render a student item in the manifest list.
     */
    const renderStudent = ({ item }) => {
        const statusColors = {
            waiting: COLORS.warning,
            boarded: COLORS.success,
            dropped_off: COLORS.primary,
        };

        return (
            <View style={styles.studentRow}>
                <View style={[styles.statusDot, { backgroundColor: statusColors[item.boarding_status] || '#666' }]} />
                <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.student_name}</Text>
                    <Text style={styles.studentStop}>{item.stop_name || 'No stop assigned'}</Text>
                </View>
                <Text style={styles.studentStatus}>{item.boarding_status || 'waiting'}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Map Section (top half) */}
            <View style={styles.mapContainer}>
                <LiveTrackingMap
                    busLocation={currentLocation}
                    schoolLocation={schoolLocation}
                    stops={trip?.stops || []}
                    routeCoordinates={routeCoordinates}
                    showGeofence={true}
                    userRole="driver"
                />
            </View>

            {/* Controls & Info (bottom half) */}
            <View style={styles.bottomPanel}>
                {/* Trip Info Bar */}
                <View style={styles.tripInfoBar}>
                    <View>
                        <Text style={styles.tripLabel}>
                            {trip?.route_name || 'Route'} • Bus {trip?.bus_number || '—'}
                        </Text>
                        <Text style={styles.tripStatus}>
                            Status: {trip?.status || 'pending'} • Socket.IO: {isConnected ? '🟢' : '🔴'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.broadcastButton,
                            isBroadcasting && styles.broadcastButtonActive,
                        ]}
                        onPress={isBroadcasting ? stopBroadcasting : startBroadcasting}
                    >
                        <Text style={styles.broadcastButtonText}>
                            {isBroadcasting ? '⏹ Stop' : '▶ Start'} Tracking
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Student Manifest */}
                <Text style={styles.manifestTitle}>
                    Student Manifest ({trip?.students?.length || 0})
                </Text>

                <FlatList
                    data={trip?.students || []}
                    keyExtractor={(item) => String(item.student_id || item.id)}
                    renderItem={renderStudent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No students assigned to this trip</Text>
                    }
                    style={styles.manifestList}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F1A',
    },
    mapContainer: {
        flex: 1,
    },
    bottomPanel: {
        flex: 1,
        backgroundColor: '#1A1A2E',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -16,
        paddingTop: 16,
        paddingHorizontal: 16,
    },
    tripInfoBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    tripLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
    },
    tripStatus: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    broadcastButton: {
        backgroundColor: COLORS.success,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    broadcastButtonActive: {
        backgroundColor: COLORS.danger,
    },
    broadcastButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 13,
    },
    manifestTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#AAA',
        marginBottom: 8,
    },
    manifestList: {
        flex: 1,
    },
    studentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A3E',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    studentStop: {
        fontSize: 11,
        color: '#888',
        marginTop: 2,
    },
    studentStatus: {
        fontSize: 12,
        color: COLORS.primaryLight,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 13,
    },
});
