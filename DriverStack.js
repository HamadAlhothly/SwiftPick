// SwiftPick — Navigation: Driver Stack
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../utils/constants';

import TripScreen from '../screens/driver/TripScreen';
import BoardingScreen from '../screens/driver/BoardingScreen';
import DriverMapScreen from '../screens/driver/DriverMapScreen';
import ProfileScreen from '../screens/parent/ProfileScreen'; // Shared profile

const Stack = createNativeStackNavigator();

export default function DriverStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: COLORS.bgCard },
                headerTintColor: COLORS.text,
                headerTitleStyle: { fontWeight: '600' },
            }}
        >
            <Stack.Screen name="TripMain" component={TripScreen} options={{ title: 'My Trip' }} />
            <Stack.Screen name="DriverMap" component={DriverMapScreen} options={{ title: 'Live Map', headerTransparent: true }} />
            <Stack.Screen name="Boarding" component={BoardingScreen} options={{ title: 'Student Boarding' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
        </Stack.Navigator>
    );
}
