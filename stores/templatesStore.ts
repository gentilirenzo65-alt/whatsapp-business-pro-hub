/**
 * Templates Store - Zustand
 * Manages global state for WhatsApp message templates
 */
import { create } from 'zustand';
import { Template } from '../types';
import axios from 'axios';
import { API_URL } from '../config';

interface TemplatesState {
    // State
    templates: Template[];
    isLoading: boolean;

    // Actions
    fetchTemplates: () => Promise<void>;
    setTemplates: (templates: Template[]) => void;
    addTemplate: (template: Template) => void;
    updateTemplate: (template: Template) => void;
    removeTemplate: (id: string) => void;
}

export const useTemplatesStore = create<TemplatesState>((set) => ({
    templates: [],
    isLoading: false,

    fetchTemplates: async () => {
        set({ isLoading: true });
        try {
            const res = await axios.get(`${API_URL}/templates`);
            set({ templates: res.data, isLoading: false });
        } catch (error) {
            console.error('Error fetching templates:', error);
            set({ isLoading: false });
        }
    },

    setTemplates: (templates) => set({ templates }),

    addTemplate: (template) => set((state) => ({
        templates: [template, ...state.templates]
    })),

    updateTemplate: (template) => set((state) => ({
        templates: state.templates.map(t =>
            t.id === template.id ? { ...t, ...template } : t
        )
    })),

    removeTemplate: (id) => set((state) => ({
        templates: state.templates.filter(t => t.id !== id)
    }))
}));
