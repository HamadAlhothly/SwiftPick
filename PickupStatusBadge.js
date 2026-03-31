// SwiftPick — Pickup Status Badge
import React from 'react';
import { View, Text } from 'react-native';
import { listStyles } from '../utils/listStyles';
import { getStatusColor, getStatusLabel } from '../utils/helpers';

export default function PickupStatusBadge({ status }) {
    const color = getStatusColor(status);

    return (
        <View style={[listStyles.badge, { backgroundColor: color + '22', borderColor: color }]}>
            <View style={[listStyles.badgeDot, { backgroundColor: color }]} />
            <Text style={[listStyles.badgeText, { color }]}>{getStatusLabel(status)}</Text>
        </View>
    );
}
