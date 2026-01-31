import axios from 'axios';
import { Contact, Message, Template } from '../types';

// Use relative URL for production/dev compatibility (proxy handles it)
// Or use the environment variable if strictly needed, but relative is safer for docker setups behind nginx
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const contactService = {
    getAll: async (): Promise<Contact[]> => {
        const response = await api.get('/contacts');
        return response.data;
    },
    create: async (contact: Partial<Contact>): Promise<Contact> => {
        const response = await api.post('/contacts', contact);
        return response.data;
    },
    update: async (id: string, contact: Partial<Contact>): Promise<Contact> => {
        const response = await api.put(`/contacts/${id}`, contact);
        return response.data;
    },
    delete: async (id: string): Promise<void> => {
        await api.delete(`/contacts/${id}`);
    },
};

export const messageService = {
    getHistory: async (contactId: string): Promise<Message[]> => {
        const response = await api.get(`/messages/${contactId}`);
        return response.data;
    },
    sendText: async (contactId: string, text: string, channelId?: string): Promise<Message> => {
        const response = await api.post('/send', {
            contactId,
            text,
            type: 'text',
            channelId
        });
        return response.data;
    },
    sendMedia: async (formData: FormData): Promise<Message> => {
        const response = await api.post('/send-media', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};

export const templateService = {
    getAll: async (): Promise<Template[]> => {
        const response = await api.get('/templates');
        return response.data;
    },
    // Add other template methods as needed
};

export default api;
