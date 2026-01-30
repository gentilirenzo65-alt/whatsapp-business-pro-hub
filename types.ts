
export interface Tag {
  id: string;
  name: string;
  color: string; // Tailwind color class like 'bg-purple-500'
}

export interface QuickReply {
  id: string;
  shortcut: string; // e.g., 'precios'
  content: string;
}

export interface Message {
  id: string;
  senderId: string;
  text?: string;
  body?: string;  // Backend uses 'body' for message content
  timestamp: Date;
  isMine: boolean;
  status: 'sent' | 'delivered' | 'read' | 'pending' | 'failed';
  direction?: 'inbound' | 'outbound';
  contact_id?: string;
  channelId?: string;
  mediaType?: 'image' | 'audio' | 'document' | 'video' | 'text' | 'sticker' | 'interactive';
  mediaUrl?: string;
  media_url?: string; // Backend uses snake_case
  fileName?: string;
  fileSize?: string;
  type?: string; // Backend message type
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  lastMessage?: string;
  lastActive: Date;
  unreadCount: number;
  assignedBusinessPhone: string;
  tags: string[]; // Array of Tag IDs
  notes?: string;
  // CRM Fields
  email?: string;
  birthday?: string; // YYYY-MM-DD format
  company?: string;
  customFields?: Record<string, string>;
}

export interface Template {
  id: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  content: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface Broadcast {
  id: string;
  name: string;
  templateId: string;
  apiId: string;
  scheduledTime: string;
  recipientsCount: number;
  status: 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
  progress?: number;
  targetTagId?: string; // Optional: if null, send to everyone
}

export type AppView = 'CHATS' | 'TEMPLATES' | 'BROADCASTS' | 'SETTINGS';

export interface BusinessAPIConfig {
  id: string;
  name: string;
  phoneNumber: string;
  phoneId?: string; // Meta Phone ID
  wabaId?: string; // WhatsApp Business Account ID
  appSecret?: string; // App Secret para validación de webhooks
  accessToken?: string; // Meta Permanent Token
  status: 'connected' | 'disconnected' | 'DISCONNECTED' | 'BANNED';
  apiKey?: string; // keeping for backward compat if needed, but prefer accessToken
}
