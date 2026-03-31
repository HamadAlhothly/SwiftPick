// SwiftPick — useSocket Custom Hook
// Wraps socketService.js to provide React-friendly state management
// for real-time Socket.IO events throughout the app.
import { useState, useEffect, useRef, useCallback } from 'react';
import { MOCK_MODE } from '../utils/constants';
import {
    connectSocket,
    disconnectSocket,
    onBusLocationUpdate,
    onPickupStatusChange,
    onNotification,
    onStudentBoarded,
    onStudentReleased,
} from '../services/socketService';
import { storage } from '../utils/storage';

/**
 * Custom hook for Socket.IO real-time connection.
 * Automatically connects on mount and disconnects on unmount.
 *
 * @param {object} options
 * @param {number} options.tripId - Optional trip ID to subscribe to bus updates
 * @returns {{ isConnected, lastBusLocation, notifications, pickupUpdates, studentUpdates }}
 */
export default function useSocket({ tripId = null } = {}) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastBusLocation, setLastBusLocation] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [pickupUpdates, setPickupUpdates] = useState([]);
    const [studentUpdates, setStudentUpdates] = useState([]);
    const socketRef = useRef(null);

    // Connect to Socket.IO on mount
    useEffect(() => {
        if (MOCK_MODE) {
            // In mock mode, simulate a connected state
            setIsConnected(true);
            return;
        }

        let mounted = true;

        async function initSocket() {
            try {
                const token = await storage.getToken();
                if (!token || !mounted) return;

                const socket = connectSocket(token);
                socketRef.current = socket;

                if (socket) {
                    socket.on('connect', () => {
                        if (mounted) setIsConnected(true);
                    });

                    socket.on('disconnect', () => {
                        if (mounted) setIsConnected(false);
                    });
                }
            } catch (error) {
                console.warn('[useSocket] Failed to initialize:', error.message);
            }
        }

        initSocket();

        // Cleanup on unmount
        return () => {
            mounted = false;
            disconnectSocket();
            socketRef.current = null;
            setIsConnected(false);
        };
    }, []);

    // Subscribe to bus location updates for a specific trip
    useEffect(() => {
        if (!tripId || MOCK_MODE) return;

        onBusLocationUpdate(tripId, (location) => {
            setLastBusLocation(location);
        });
        
        onStudentBoarded(tripId, (data) => {
            setStudentUpdates((prev) => [{ ...data, type: 'boarded' }, ...prev]);
        });
        
        onStudentReleased(tripId, (data) => {
            setStudentUpdates((prev) => [{ ...data, type: 'released' }, ...prev]);
        });
        
    }, [tripId]);

    // Subscribe to pickup status changes
    useEffect(() => {
        if (MOCK_MODE) return;

        onPickupStatusChange((update) => {
            setPickupUpdates((prev) => [update, ...prev]);
        });
    }, []);

    // Subscribe to real-time notifications
    useEffect(() => {
        if (MOCK_MODE) return;

        onNotification((notification) => {
            setNotifications((prev) => [notification, ...prev]);
        });
    }, []);

    // Clear notifications helper
    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    return {
        isConnected,
        lastBusLocation,
        notifications,
        pickupUpdates,
        studentUpdates,
        clearNotifications,
    };
}
