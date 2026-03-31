// SwiftPick — Teacher Stack Navigator
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';

const Stack = createNativeStackNavigator();

export default function TeacherStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} />
        </Stack.Navigator>
    );
}
