// SwiftPick — Location Context (GPS state)
import React, { createContext, useState, useContext } from 'react';
import { locationService } from '../services/locationService';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
    const [location, setLocation] = useState(null);
    const [watchSubscription, setWatchSubscription] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(false);

    async function requestPermission() {
        try {
            await locationService.requestPermissions();
            setPermissionGranted(true);
            return true;
        } catch (e) {
            setPermissionGranted(false);
            return false;
        }
    }

    async function getCurrentLocation() {
        try {
            const loc = await locationService.getCurrentLocation();
            setLocation(loc);
            return loc;
        } catch (e) {
            console.log('Failed to get location:', e);
            return null;
        }
    }

    async function startWatching(callback) {
        if (watchSubscription) return;

        const sub = await locationService.watchPosition((loc) => {
            setLocation(loc);
            if (callback) callback(loc);
        });
        setWatchSubscription(sub);
    }

    function stopWatching() {
        if (watchSubscription) {
            watchSubscription.remove();
            setWatchSubscription(null);
        }
    }

    return (
        <LocationContext.Provider
            value={{
                location,
                permissionGranted,
                requestPermission,
                getCurrentLocation,
                startWatching,
                stopWatching,
            }}
        >
            {children}
        </LocationContext.Provider>
    );
}

export function useLocation() {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
}
