// SwiftPick — Parent Home Screen (Redesigned)
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity, Image, StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { pickupService } from '../../services/pickupService';
import { listStyles, SPACING } from '../../utils/listStyles';
import StudentCard from '../../components/StudentCard';
import { LoadingSpinner, OfflineBanner } from '../../components';

export default function HomeScreen({ navigation }) {
    const { user, logout } = useAuth();
    const { location, getCurrentLocation } = useLocation();
    const { isOnline, queueLength, enqueue } = useOfflineQueue();
    const [children, setChildren] = useState([]);
    const [activePickups, setActivePickups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('My Children');

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    async function loadData() {
        try {
            const [childrenRes, pickupsRes] = await Promise.all([
                pickupService.getChildren(),
                pickupService.getActivePickups(),
            ]);
            setChildren(childrenRes.data || []);
            setActivePickups(pickupsRes.data || []);
        } catch (error) {
            console.log('Failed to load data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    function getActivePickupForStudent(studentId) {
        return activePickups.find((p) => p.student_id == studentId);
    }

    async function handlePickup(student) {
        try {
            const loc = await getCurrentLocation();
            if (!loc) {
                Alert.alert('Location Error', 'Unable to get your location.');
                return;
            }

            if (!isOnline) {
                await enqueue('POST', '/parent/pickups', {
                    student_id: student.id,
                    lat: loc.latitude,
                    lng: loc.longitude,
                });
                Alert.alert('Queued', 'Pickup request saved.');
                return;
            }

            const result = await pickupService.createPickup(student.id, loc.latitude, loc.longitude);
            Alert.alert('Success', 'Check-in successful! Teacher notified.');
            loadData();
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    }

    if (loading) return <LoadingSpinner message="Loading..." />;

    const tabs = ['My Children', 'Bus Tracking'];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            {!isOnline && <OfflineBanner queueLength={queueLength} />}

            {/* Top Bar */}
            <View style={styles.topBar}>
                <View style={styles.logoRow}>
                    <View style={styles.logoIcon}>
                        <Text style={{ fontSize: 18 }}>🎒</Text>
                    </View>
                    <Text style={styles.appTitle}>School Pickup &{'\n'}Bus Tracking System</Text>
                </View>
                <View style={styles.topActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                        <Text style={{ fontSize: 24 }}>👤</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={logout} style={{ marginLeft: 12 }}>
                        <Text style={{ fontSize: 24 }}>🚪</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Green Banner */}
            <View style={styles.banner}>
                <View>
                    <Text style={styles.welcomeText}>Welcome, {user?.full_name?.split(' ')[0]}</Text>
                    <Text style={styles.subtitle}>Track your children's pickup</Text>
                </View>
                <View style={styles.notificationBadge}>
                    <Text style={styles.notifText}>0</Text>
                </View>
            </View>

            {/* Floating Tabs */}
            <View style={styles.tabContainer}>
                {tabs.map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {activeTab === 'My Children' ? (
                <FlatList
                    data={children}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.parentHeader} />
                    }
                    renderItem={({ item }) => (
                        <StudentCard
                            student={item}
                            activePickup={getActivePickupForStudent(item.id)}
                            onPickup={handlePickup}
                            onPress={() => navigation.navigate('Pickup', { student: item, activePickup: getActivePickupForStudent(item.id) })}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={listStyles.emptyContainer}>
                            <Text style={listStyles.emptySubtitle}>No children linked</Text>
                        </View>
                    }
                />
            ) : (
                <View style={listStyles.emptyContainer}>
                    <Text style={{ fontSize: 40, marginBottom: 10 }}>🗺️</Text>
                    <Text style={listStyles.emptyTitle}>Bus Tracking</Text>
                    <Text style={listStyles.emptySubtitle}>Select a child from "My Children" to view bus location.</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },

    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10,
        backgroundColor: '#fff'
    },
    logoRow: { flexDirection: 'row', alignItems: 'center' },
    logoIcon: {
        width: 32, height: 32, backgroundColor: COLORS.parentHeader,
        borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8
    },
    appTitle: { color: COLORS.parentHeader, fontWeight: '700', fontSize: 13, lineHeight: 16 },
    topActions: { flexDirection: 'row', alignItems: 'center' },

    banner: {
        backgroundColor: COLORS.parentHeader,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        padding: 24, paddingBottom: 40,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
    },
    welcomeText: { color: '#fff', fontSize: 22, fontWeight: '700' },
    subtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4 },
    notificationBadge: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center'
    },
    notifText: { color: '#fff', fontWeight: '700' },

    tabContainer: {
        flexDirection: 'row', marginHorizontal: 24, marginTop: -24,
        backgroundColor: '#F5F5F5', borderRadius: 24, padding: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
    activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    tabText: { color: '#999', fontWeight: '600' },
    activeTabText: { color: COLORS.parentHeader, fontWeight: '700' },

    list: { padding: 20, paddingTop: 20 },
});
