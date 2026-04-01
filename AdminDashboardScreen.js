// SwiftPick — Admin Console (Redesigned)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, Modal } from 'react-native';
import { COLORS } from '../../utils/constants';
import { MOCK_ADMIN_STATS } from '../../utils/mockData';
import { listStyles, SPACING } from '../../utils/listStyles';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardScreen({ navigation }) {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState('Overview');
    const [stats, setStats] = useState(MOCK_ADMIN_STATS);
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => ({
                ...prev,
                picked_up: Math.min(prev.picked_up + 1, prev.total_students),
                active_buses: prev.active_buses
            }));
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    const tabs = ['Overview', 'Fleet Management', 'Analytics'];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.adminHeader} />

            {/* Menu Overlay */}
            {showMenu && (
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                />
            )}

            {/* Header */}
            <View style={[styles.header, { zIndex: 10 }]}>
                <View style={styles.topRow}>
                    <Text style={styles.headerTitle}>Administrator Console</Text>

                    <View style={styles.topRightActions}>
                        <View style={styles.systemStatus}>
                            <View style={styles.dot} />
                            <Text style={styles.statusText}>Operational</Text>
                        </View>

                        {/* Profile Button */}
                        <TouchableOpacity style={styles.profileBtn} onPress={() => setShowMenu(!showMenu)}>
                            <Text style={styles.profileIcon}>👤</Text>
                        </TouchableOpacity>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <View style={styles.dropdownMenu}>
                                <View style={styles.menuArrow} />
                                <Text style={styles.menuUserText}>Admin User</Text>
                                <View style={styles.divider} />
                                <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); logout(); }}>
                                    <Text style={[styles.menuText, { color: COLORS.danger }]}>Log Out</Text>
                                    <Text>🚪</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
                <Text style={styles.headerSubtitle}>System-wide oversight and analytics</Text>

                {/* Tabs */}
                <View style={styles.tabRow}>
                    {tabs.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab ? styles.activeTab : styles.inactiveTab]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab ? styles.activeTabText : styles.inactiveTabText]}>
                                {tab.replace(' Management', '')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} contentContainerStyle={{ padding: 20 }}>
                {activeTab === 'Overview' ? (
                    <>
                        {/* Total Students */}
                        <View style={styles.card}>
                            <View style={styles.cardTop}>
                                <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                                    <Text style={{ fontSize: 24, color: '#2196F3' }}>👥</Text>
                                </View>
                                <Text style={styles.bigNum}>{stats.total_students}</Text>
                            </View>
                            <Text style={styles.cardLabel}>Total Students</Text>
                            <Text style={styles.cardSub}>Across all grades</Text>
                        </View>

                        {/* Picked Up */}
                        <View style={styles.card}>
                            <View style={styles.cardTop}>
                                <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                                    <Text style={{ fontSize: 24, color: '#4CAF50' }}>✅</Text>
                                </View>
                                <Text style={styles.bigNum}>{stats.picked_up}</Text>
                            </View>
                            <Text style={styles.cardLabel}>Picked Up</Text>
                            <View style={styles.progressTrack}>
                                <View style={[styles.progressFill, { width: `${(stats.picked_up / stats.total_students) * 100}%` }]} />
                                <Text style={styles.progressPercent}>{Math.round((stats.picked_up / stats.total_students) * 100)}%</Text>
                            </View>
                        </View>

                        {/* Active Buses */}
                        <View style={styles.card}>
                            <View style={styles.cardTop}>
                                <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                                    <Text style={{ fontSize: 24, color: '#2196F3' }}>🚌</Text>
                                </View>
                                <Text style={styles.bigNum}>{stats.active_buses}</Text>
                            </View>
                            <Text style={styles.cardLabel}>Active Buses</Text>
                            <Text style={styles.cardSub}>Currently in operation</Text>
                        </View>

                        {/* Avg Time */}
                        <View style={styles.card}>
                            <View style={styles.cardTop}>
                                <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
                                    <Text style={{ fontSize: 24, color: '#9C27B0' }}>🕒</Text>
                                </View>
                                <Text style={styles.bigNum}>{stats.avg_pickup_time}</Text>
                            </View>
                            <Text style={styles.cardLabel}>Avg Pickup Wait</Text>
                        </View>
                    </>
                ) : (
                    <View style={listStyles.emptyContainer}>
                        <Text style={listStyles.emptySubtitle}>Module Coming Soon</Text>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity style={styles.fab}>
                <Text style={{ fontSize: 24, color: 'white' }}>💬</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },

    menuOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 5 },

    header: { backgroundColor: COLORS.adminHeader, padding: 20, paddingTop: 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 30 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', maxWidth: '55%' },
    headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4, marginBottom: 24 },

    topRightActions: { flexDirection: 'row', alignItems: 'center' },
    systemStatus: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 12 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00E676', marginRight: 6 },
    statusText: { color: '#fff', fontWeight: '700', fontSize: 12 },

    profileBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4 },
    profileIcon: { fontSize: 20 },

    dropdownMenu: {
        position: 'absolute', top: 50, right: 0, width: 150,
        backgroundColor: '#fff', borderRadius: 12, padding: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 10,
        zIndex: 20
    },
    menuArrow: { position: 'absolute', top: -6, right: 14, width: 12, height: 12, backgroundColor: '#fff', transform: [{ rotate: '45deg' }] },
    menuUserText: { padding: 8, fontSize: 12, color: '#999', fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 4 },
    menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8, backgroundColor: '#FFF0F0' },
    menuText: { fontWeight: '700', fontSize: 14 },

    tabRow: { flexDirection: 'row', gap: 12 },
    tab: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', minWidth: 80 },
    activeTab: { backgroundColor: '#fff' },
    inactiveTab: { backgroundColor: 'rgba(255,255,255,0.15)' },
    tabText: { fontWeight: '600', fontSize: 13 },
    activeTabText: { color: COLORS.adminHeader, fontWeight: '700' },
    inactiveTabText: { color: 'rgba(255,255,255,0.9)' },

    content: { flex: 1, marginTop: -20 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    bigNum: { fontSize: 28, fontWeight: '700', color: '#333' },
    cardLabel: { fontSize: 16, color: '#333', fontWeight: '600' },
    cardSub: { fontSize: 12, color: '#999', marginTop: 4 },

    progressTrack: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, marginTop: 12, flexDirection: 'row', alignItems: 'center' },
    progressFill: { height: 6, backgroundColor: '#00C853', borderRadius: 3 },
    progressPercent: { marginLeft: 8, fontSize: 12, color: '#00C853', fontWeight: '700', position: 'absolute', right: 0, top: -20 },

    fab: {
        position: 'absolute', bottom: 24, right: 24,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#2979FF', justifyContent: 'center', alignItems: 'center',
        elevation: 6
    }
});
