// SwiftPick — Bus Tracking Screen (Map View)
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { COLORS, BUS_POLL_INTERVAL } from '../../utils/constants';
import { listStyles, SPACING, RADIUS } from '../../utils/listStyles';
import { busService } from '../../services/busService';

export default function BusTrackingScreen({ route }) {
    const { studentId, studentName } = route.params || {};
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef(null);

    useEffect(() => {
        loadBusLocation();
        const interval = setInterval(loadBusLocation, BUS_POLL_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    async function loadBusLocation() {
        try {
            const result = await busService.getBusTracking(studentId);
            if (result.data) {
                setTrip(result.data);
                // Animate map to bus location
                if (mapRef.current && result.data.current_lat && result.data.current_lng) {
                    mapRef.current.animateToRegion({
                        latitude: parseFloat(result.data.current_lat),
                        longitude: parseFloat(result.data.current_lng),
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }, 500);
                }
            }
        } catch (e) {
            console.log('Bus tracking error:', e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Finding bus...</Text>
            </View>
        );
    }

    if (!trip) {
        return (
            <View style={listStyles.emptyContainer}>
                <Text style={listStyles.emptyIcon}>🚌</Text>
                <Text style={listStyles.emptyTitle}>No Active Bus</Text>
                <Text style={listStyles.emptySubtitle}>
                    There's no active bus trip for {studentName || 'your child'} right now.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: parseFloat(trip.current_lat) || 24.7136,
                    longitude: parseFloat(trip.current_lng) || 46.6753,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }}
                customMapStyle={darkMapStyle}
            >
                {trip.current_lat && trip.current_lng && (
                    <Marker
                        coordinate={{
                            latitude: parseFloat(trip.current_lat),
                            longitude: parseFloat(trip.current_lng),
                        }}
                        title={`Bus ${trip.bus_number}`}
                        description={`Driver: ${trip.driver_name}`}
                    >
                        <View style={styles.busMarker}>
                            <Text style={styles.busMarkerText}>🚌</Text>
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* Info Panel */}
            <View style={styles.infoPanel}>
                <View style={styles.infoPanelHandle} />
                <Text style={listStyles.title}>🚌 Bus {trip.bus_number}</Text>
                <Text style={listStyles.subtitle}>Route: {trip.route_name}</Text>
                <Text style={listStyles.subtitle}>Driver: {trip.driver_name}</Text>
                <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                    <Text style={styles.statusText}>Live Tracking</Text>
                </View>
            </View>
        </View>
    );
}

// Dark map theme
const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    map: { flex: 1 },
    centered: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: COLORS.bg, padding: SPACING.xl,
    },
    loadingText: { color: COLORS.textSecondary, marginTop: 12 },
    busMarker: {
        backgroundColor: COLORS.primary, borderRadius: 20, padding: 8,
        borderWidth: 2, borderColor: '#fff',
    },
    busMarkerText: { fontSize: 20 },
    infoPanel: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingTop: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
    },
    infoPanelHandle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
        alignSelf: 'center', marginBottom: 14,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { color: COLORS.success, fontSize: 13, fontWeight: '600' },
});
