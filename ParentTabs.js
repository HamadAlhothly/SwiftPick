// SwiftPick — Navigation: Parent Bottom Tabs
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { COLORS } from '../utils/constants';

import HomeScreen from '../screens/parent/HomeScreen';
import PickupScreen from '../screens/parent/PickupScreen';
import BusTrackingScreen from '../screens/parent/BusTrackingScreen';
import NotificationsScreen from '../screens/parent/NotificationsScreen';
import AIChatScreen from '../screens/parent/AIChatScreen';
import ProfileScreen from '../screens/parent/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home stack with Pickup detail
function HomeStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: COLORS.bgCard },
                headerTintColor: COLORS.text,
                headerTitleStyle: { fontWeight: '600' },
            }}
        >
            <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'My Children' }} />
            <Stack.Screen name="Pickup" component={PickupScreen} options={{ title: 'Pickup Status' }} />
            <Stack.Screen
                name="BusTracking"
                component={BusTrackingScreen}
                options={{ title: 'Bus Tracking', headerTransparent: true }}
            />
        </Stack.Navigator>
    );
}

export default function ParentTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: COLORS.bgCard,
                    borderTopColor: COLORS.border,
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 6,
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textMuted,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeStack}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>,
                }}
            />
            <Tab.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{
                    tabBarLabel: 'Alerts',
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🔔</Text>,
                    headerShown: true,
                    headerTitle: 'Notifications',
                    headerStyle: { backgroundColor: COLORS.bgCard },
                    headerTintColor: COLORS.text,
                }}
            />
            <Tab.Screen
                name="AIChat"
                component={AIChatScreen}
                options={{
                    tabBarLabel: 'AI Assistant',
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🤖</Text>,
                    headerShown: true,
                    headerTitle: 'AI Assistant',
                    headerStyle: { backgroundColor: COLORS.bgCard },
                    headerTintColor: COLORS.text,
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
                    headerShown: true,
                    headerTitle: 'My Profile',
                    headerStyle: { backgroundColor: COLORS.bgCard },
                    headerTintColor: COLORS.text,
                }}
            />
        </Tab.Navigator>
    );
}
