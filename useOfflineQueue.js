// SwiftPick — Offline Queue Hook
import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { storage } from '../utils/storage';
import { api } from '../services/api';

export function useOfflineQueue() {
    const [isOnline, setIsOnline] = useState(true);
    const [queueLength, setQueueLength] = useState(0);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            const online = state.isConnected && state.isInternetReachable;
            setIsOnline(online);
            if (online) {
                flushQueue();
            }
        });

        // Load initial queue length
        storage.getOfflineQueue().then((q) => setQueueLength(q.length));

        return () => unsubscribe();
    }, []);

    /**
     * Add an action to the offline queue.
     */
    const enqueue = useCallback(async (action, endpoint, body) => {
        await storage.addToOfflineQueue({ action, endpoint, body });
        const q = await storage.getOfflineQueue();
        setQueueLength(q.length);
    }, []);

    /**
     * Flush the offline queue by replaying all requests.
     */
    const flushQueue = useCallback(async () => {
        const queue = await storage.getOfflineQueue();
        if (queue.length === 0) return;

        const remaining = [];

        for (const item of queue) {
            try {
                switch (item.action) {
                    case 'POST':
                        await api.post(item.endpoint, item.body);
                        break;
                    case 'PATCH':
                        await api.patch(item.endpoint, item.body);
                        break;
                    case 'DELETE':
                        await api.delete(item.endpoint);
                        break;
                    default:
                        break;
                }
            } catch (error) {
                // Keep failed items for retry (max 3 tries)
                item.retryCount = (item.retryCount || 0) + 1;
                if (item.retryCount < 3) {
                    remaining.push(item);
                }
            }
        }

        await storage.setOfflineQueue(remaining);
        setQueueLength(remaining.length);
    }, []);

    return { isOnline, queueLength, enqueue, flushQueue };
}
