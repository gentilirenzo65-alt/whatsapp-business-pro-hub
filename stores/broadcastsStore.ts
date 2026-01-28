/**
 * Broadcasts Store - Zustand
 * Manages global state for broadcasts/campañas
 */
import { create } from 'zustand';
import { Broadcast } from '../types';
import axios from 'axios';
import { API_URL } from '../config';

interface BroadcastsState {
    // State
    broadcasts: Broadcast[];
    isLoading: boolean;

    // Actions
    fetchBroadcasts: () => Promise<void>;
    setBroadcasts: (broadcasts: Broadcast[]) => void;
    addBroadcast: (broadcast: Broadcast) => void;
    updateBroadcast: (broadcast: Broadcast) => void;
    removeBroadcast: (id: string) => void;
}

export const useBroadcastsStore = create<BroadcastsState>((set) => ({
    broadcasts: [],
    isLoading: false,

    fetchBroadcasts: async () => {
        set({ isLoading: true });
        try {
            const res = await axios.get(`${API_URL}/broadcasts`);
            set({ broadcasts: res.data, isLoading: false });
        } catch (error) {
            console.error('Error fetching broadcasts:', error);
            set({ isLoading: false });
        }
    },

    setBroadcasts: (broadcasts) => set({ broadcasts }),

    addBroadcast: (broadcast) => set((state) => ({
        broadcasts: [broadcast, ...state.broadcasts]
    })),

    updateBroadcast: (broadcast) => set((state) => ({
        broadcasts: state.broadcasts.map(b =>
            b.id === broadcast.id ? { ...b, ...broadcast } : b
        )
    })),

    removeBroadcast: (id) => set((state) => ({
        broadcasts: state.broadcasts.filter(b => b.id !== id)
    }))
}));
