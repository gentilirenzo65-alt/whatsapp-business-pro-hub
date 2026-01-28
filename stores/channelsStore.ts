/**
 * Channels Store - Zustand
 * Manages global state for WhatsApp Business channels/APIs
 */
import { create } from 'zustand';
import { BusinessAPIConfig } from '../types';
import axios from 'axios';
import { API_URL } from '../config';

interface ChannelsState {
    // State
    channels: BusinessAPIConfig[];
    currentChannelId: string;
    isLoading: boolean;

    // Actions
    fetchChannels: () => Promise<void>;
    setChannels: (channels: BusinessAPIConfig[]) => void;
    addChannel: (channel: BusinessAPIConfig) => void;
    removeChannel: (id: string) => void;
    setCurrentChannel: (id: string) => void;
}

export const useChannelsStore = create<ChannelsState>((set, get) => ({
    // Initial state
    channels: [],
    currentChannelId: '',
    isLoading: false,

    // Fetch all channels from API
    fetchChannels: async () => {
        set({ isLoading: true });
        try {
            const res = await axios.get(`${API_URL}/channels`);
            const channels = res.data;
            set({
                channels,
                isLoading: false,
                currentChannelId: channels.length > 0 && !get().currentChannelId ? channels[0].id : get().currentChannelId
            });
        } catch (error) {
            set({ isLoading: false });
        }
    },

    // Set channels directly
    setChannels: (channels) => set({ channels }),

    // Add new channel
    addChannel: (channel) => set((state) => ({
        channels: [...state.channels, channel],
        currentChannelId: state.currentChannelId || channel.id
    })),

    // Remove channel
    removeChannel: (id) => set((state) => {
        const remaining = state.channels.filter(c => c.id !== id);
        return {
            channels: remaining,
            currentChannelId: state.currentChannelId === id && remaining.length > 0
                ? remaining[0].id
                : state.currentChannelId
        };
    }),

    // Set current active channel
    setCurrentChannel: (id) => set({ currentChannelId: id })
}));
