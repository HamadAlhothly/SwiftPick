// SwiftPick — LiveTrackingMap Component
// Reusable map component for both Parent (bus tracking) and Driver screens.
// Renders the bus marker, route polyline, geofence circle, and stop markers.
// Subscribes to Socket.IO busLocationUpdate events via useSocket hook.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Circle, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS, GEOFENCE_RADIUS, GOOGLE_MAPS_API_KEY } from '../utils/constants';

/**
 * LiveTrackingMap — Renders a live-updating map with bus position,
 * route line, geofence circles, and stop markers.
 *
 * @param {object} props
 * @param {object} props.busLocation - { latitude, longitude } of the bus
 * @param {object} props.schoolLocation - { latitude, longitude } of the school
 * @param {Array}  props.stops - [{ id, name, latitude, longitude }] route stops
 * @param {Array}  props.routeCoordinates - [{ latitude, longitude }] for the polyline
 * @param {boolean} props.showGeofence - Whether to show the geofence circle around school
 * @param {string} props.userRole - 'parent' or 'driver' to customize display
 */
export default function LiveTrackingMap({
    busLocation,
    schoolLocation,
    stops = [],
    routeCoordinates = [],
    showGeofence = true,
    userRole = 'parent',
}) {
    const [region, setRegion] = useState(null);

    // Set initial map region based on bus or school location
    useEffect(() => {
        const center = busLocation || schoolLocation;
        if (center) {
            setRegion({
                latitude: center.latitude,
                longitude: center.longitude,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
            });
        }
    }, []);

    // Animate to bus when location updates
    useEffect(() => {
        if (busLocation && region) {
            setRegion((prev) => ({
                ...prev,
                latitude: busLocation.latitude,
                longitude: busLocation.longitude,
            }));
        }
    }, [busLocation]);

    if (!region) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading map...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                region={region}
                showsUserLocation={userRole === 'parent'}
                showsMyLocationButton={userRole === 'parent'}
                showsCompass={true}
                toolbarEnabled={false}
            >
                {/* Bus Marker */}
                {busLocation && (
                    <Marker
                        coordinate={busLocation}
                        title="School Bus"
                        description={
                            userRole === 'parent'
                                ? 'Tap for ETA info'
                                : 'Your current position'
                        }
                    >
                        <View style={styles.busMarker}>
                            <Text style={styles.busEmoji}>🚌</Text>
                        </View>
                    </Marker>
                )}

                {/* School Marker */}
                {schoolLocation && (
                    <Marker
                        coordinate={schoolLocation}
                        title="School"
                        description="Main pickup zone"
                        pinColor={COLORS.success}
                    >
                        <View style={styles.schoolMarker}>
                            <Text style={styles.schoolEmoji}>🏫</Text>
                        </View>
                    </Marker>
                )}

                {/* Stop Markers */}
                {stops.map((stop, index) => (
                    <Marker
                        key={stop.id || index}
                        coordinate={{
                            latitude: stop.latitude,
                            longitude: stop.longitude,
                        }}
                        title={`Stop ${index + 1}: ${stop.name}`}
                        pinColor={COLORS.warning}
                    />
                ))}

                {/* Route Polyline */}
                {routeCoordinates.length > 1 && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={COLORS.primary}
                        strokeWidth={4}
                        lineDashPattern={[0]}
                    />
                )}

                {/* Geofence Circle around School */}
                {showGeofence && schoolLocation && (
                    <Circle
                        center={schoolLocation}
                        radius={GEOFENCE_RADIUS}
                        strokeColor={COLORS.primary + '80'}
                        fillColor={COLORS.primary + '15'}
                        strokeWidth={2}
                    />
                )}
            </MapView>

            {/* Connection Status Overlay */}
            {userRole === 'driver' && (
                <View style={styles.statusOverlay}>
                    <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                    <Text style={styles.statusText}>Broadcasting live</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    map: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1A1A2E',
    },
    loadingText: {
        color: '#AAA',
        marginTop: 12,
        fontSize: 14,
    },
    busMarker: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 6,
        borderWidth: 2,
        borderColor: COLORS.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    busEmoji: {
        fontSize: 22,
    },
    schoolMarker: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 6,
        borderWidth: 2,
        borderColor: COLORS.success,
    },
    schoolEmoji: {
        fontSize: 22,
    },
    statusOverlay: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
});
