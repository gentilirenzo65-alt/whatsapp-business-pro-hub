/**
 * Messages Store - Zustand
 * Manages chat messages with caching per contact
 */
import { create } from 'zustand';
import { Message } from '../types';
import axios from 'axios';
import { API_URL } from '../config';

interface MessagesState {
    // Cached messages by contact ID
    messagesByContact: Record<string, Message[]>;
    loadingContactId: string | null;

    // Actions
    fetchMessages: (contactId: string) => Promise<void>;
    addMessage: (contactId: string, message: Message) => void;
    updateMessageStatus: (messageId: string, status: string) => void;
    updateMessage: (messageId: string, updates: Partial<Message>) => void; // New action
    clearCache: () => void;
    hasMessages: (contactId: string) => boolean;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
    messagesByContact: {},
    loadingContactId: null,

    // Fetch messages for a contact (uses cache if available)
    fetchMessages: async (contactId: string) => {
        // Skip if already cached
        if (get().messagesByContact[contactId]) {
            return;
        }

        set({ loadingContactId: contactId });
        try {
            const res = await axios.get(`${API_URL}/messages/${contactId}`);
            set((state) => ({
                messagesByContact: {
                    ...state.messagesByContact,
                    [contactId]: res.data
                },
                loadingContactId: null
            }));
        } catch (error) {
            set({ loadingContactId: null });
        }
    },

    // Add a new message to a contact's chat
    addMessage: (contactId, message) => set((state) => {
        const currentMessages = state.messagesByContact[contactId] || [];

        // Prevent duplicates
        if (currentMessages.find(m => m.id === message.id)) {
            return state;
        }

        return {
            messagesByContact: {
                ...state.messagesByContact,
                [contactId]: [...currentMessages, message]
            }
        };
    }),

    // Update status of a message (sent -> delivered -> read)
    updateMessageStatus: (messageId, status) => set((state) => {
        const newState = { ...state.messagesByContact };

        for (const contactId in newState) {
            newState[contactId] = newState[contactId].map(m =>
                m.id === messageId ? { ...m, status: status as Message['status'] } : m
            );
        }

        return { messagesByContact: newState };
    }),

    // Update any message property (e.g. media_url)
    updateMessage: (messageId, updates) => set((state) => {
        const newState = { ...state.messagesByContact };

        // Search in all contacts (or if contactId is known, optimize)
        // If updates contains contact_id, we can optimize, but for now generic search is safer
        for (const contactId in newState) {
            newState[contactId] = newState[contactId].map(m =>
                m.id === messageId ? { ...m, ...updates } : m
            );
        }

        return { messagesByContact: newState };
    }),

    // Clear all cached messages
    clearCache: () => set({ messagesByContact: {} }),

    // Check if we have messages cached for a contact
    hasMessages: (contactId) => !!get().messagesByContact[contactId]
}));
