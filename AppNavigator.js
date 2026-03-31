// SwiftPick — Main App Navigator
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components';

import AuthStack from './AuthStack';
import ParentTabs from './ParentTabs';
import DriverStack from './DriverStack';
import AdminStack from './AdminStack';
import TeacherStack from './TeacherStack';

export default function AppNavigator() {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
        return <LoadingSpinner message="Starting SwiftPick..." />;
    }

    return (
        <NavigationContainer>
            {!isAuthenticated ? (
                <AuthStack />
            ) : user?.role === 'driver' ? (
                <DriverStack />
            ) : user?.role === 'admin' ? (
                <AdminStack />
            ) : user?.role === 'teacher' ? (
                <TeacherStack />
            ) : (
                <ParentTabs />
            )}
        </NavigationContainer>
    );
}
