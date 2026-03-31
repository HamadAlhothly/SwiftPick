// SwiftPick — Offline Banner
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

export default function OfflineBanner({ queueLength = 0 }) {
    return (
        <View style={styles.banner}>
            <Text style={styles.icon}>📡</Text>
            <Text style={styles.text}>
                You're offline{queueLength > 0 ? ` • ${queueLength} action${queueLength > 1 ? 's' : ''} queued` : ''}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.danger,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    icon: {
        fontSize: 14,
        marginRight: 8,
    },
    text: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
});
