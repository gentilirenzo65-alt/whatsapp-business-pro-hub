/**
 * App Store - Zustand
 * Manages global app state: tags, quick replies, connection status
 */
import { create } from 'zustand';
import { Tag, QuickReply } from '../types';
import axios from 'axios';
import { API_URL } from '../config';

interface AppState {
    // Tags
    tags: Tag[];
    fetchTags: () => Promise<void>;
    setTags: (tags: Tag[]) => void;
    addTag: (tag: Tag) => void;
    updateTag: (tag: Tag) => void;
    removeTag: (id: string) => void;

    // Quick Replies
    quickReplies: QuickReply[];
    fetchQuickReplies: () => Promise<void>;
    setQuickReplies: (qrs: QuickReply[]) => void;
    addQuickReply: (qr: QuickReply) => void;
    updateQuickReply: (qr: QuickReply) => void;
    removeQuickReply: (id: string) => void;

    // Connection status
    isConnected: boolean;
    setConnected: (status: boolean) => void;

    // Typing indicators
    typingContacts: Record<string, boolean>;
    setTyping: (phone: string, isTyping: boolean) => void;
    clearTyping: (phone: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
    // === TAGS ===
    tags: [],

    fetchTags: async () => {
        try {
            const res = await axios.get(`${API_URL}/tags`);
            set({ tags: res.data });
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    },

    setTags: (tags) => set({ tags }),

    addTag: (tag) => set((state) => ({
        tags: [...state.tags, tag]
    })),

    updateTag: (tag) => set((state) => ({
        tags: state.tags.map(t => t.id === tag.id ? tag : t)
    })),

    removeTag: (id) => set((state) => ({
        tags: state.tags.filter(t => t.id !== id)
    })),

    // === QUICK REPLIES ===
    quickReplies: [],

    fetchQuickReplies: async () => {
        try {
            const res = await axios.get(`${API_URL}/quickreplies`);
            set({ quickReplies: res.data });
        } catch (error) {
            console.error('Error fetching quick replies:', error);
        }
    },

    setQuickReplies: (qrs) => set({ quickReplies: qrs }),

    addQuickReply: (qr) => set((state) => ({
        quickReplies: [...state.quickReplies, qr]
    })),

    updateQuickReply: (qr) => set((state) => ({
        quickReplies: state.quickReplies.map(q => q.id === qr.id ? qr : q)
    })),

    removeQuickReply: (id) => set((state) => ({
        quickReplies: state.quickReplies.filter(q => q.id !== id)
    })),

    // === CONNECTION ===
    isConnected: false,
    setConnected: (status) => set({ isConnected: status }),

    // === TYPING INDICATORS ===
    typingContacts: {},
    setTyping: (phone, isTyping) => set((state) => ({
        typingContacts: { ...state.typingContacts, [phone]: isTyping }
    })),
    clearTyping: (phone) => set((state) => ({
        typingContacts: { ...state.typingContacts, [phone]: false }
    }))
}));
