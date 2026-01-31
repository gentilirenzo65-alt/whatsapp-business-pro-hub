/**
 * Contacts Store - Zustand
 * Manages global state for contacts list
 */
import { create } from 'zustand';
import { Contact } from '../types';
import axios from 'axios';
import { API_URL } from '../config';

interface ContactsState {
    // State
    contacts: Contact[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchContacts: () => Promise<void>;
    setContacts: (contacts: Contact[]) => void;
    updateContact: (contact: Partial<Contact> & { id: string }) => void;
    addContact: (contact: Contact) => void;
    updateContactTags: (contactId: string, tagIds: string[]) => Promise<void>;
    incrementUnread: (contactId: string) => void;
    resetUnread: (contactId: string) => void;
    deleteContact: (contactId: string) => Promise<void>;
}

export const useContactsStore = create<ContactsState>((set, get) => ({
    // Initial state
    contacts: [],
    isLoading: false,
    error: null,

    // Fetch all contacts from API
    fetchContacts: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await axios.get(`${API_URL}/contacts`);
            set({ contacts: res.data, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Set contacts directly (useful for socket updates)
    setContacts: (contacts) => set({ contacts }),

    // Update a single contact
    updateContact: (updatedContact) => set((state) => ({
        contacts: state.contacts.map(c =>
            c.id === updatedContact.id
                ? { ...c, ...updatedContact, lastActive: updatedContact.lastActive ? new Date(updatedContact.lastActive) : c.lastActive }
                : c
        )
    })),

    // Add new contact (or update if exists)
    addContact: (contact) => set((state) => {
        const exists = state.contacts.find(c => c.id === contact.id);
        if (exists) {
            return {
                contacts: state.contacts.map(c => c.id === contact.id ? { ...c, ...contact } : c)
            };
        }
        return { contacts: [contact, ...state.contacts] };
    }),

    // Update contact tags AND persist to backend automatically
    updateContactTags: async (contactId, tagIds) => {
        // Update local state immediately (optimistic update)
        set((state) => ({
            contacts: state.contacts.map(c =>
                c.id === contactId ? { ...c, tags: tagIds } : c
            )
        }));

        // Persist to backend
        try {
            await axios.put(`${API_URL}/contacts/${contactId}`, { tags: tagIds });
        } catch (error) {
            console.error('Error saving tags:', error);
            // Optionally revert on failure
        }
    },

    // Increment unread count
    incrementUnread: (contactId) => set((state) => ({
        contacts: state.contacts.map(c =>
            c.id === contactId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
        )
    })),

    // Reset unread count
    resetUnread: (contactId) => set((state) => ({
        contacts: state.contacts.map(c =>
            c.id === contactId ? { ...c, unreadCount: 0 } : c
        )
    })),

    // Delete contact and its messages
    deleteContact: async (contactId) => {
        try {
            await axios.delete(`${API_URL}/contacts/${contactId}`);
            set((state) => ({
                contacts: state.contacts.filter(c => c.id !== contactId)
            }));
        } catch (error) {
            console.error('Error deleting contact:', error);
            throw error;
        }
    }
}));
