
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import TemplateView from './components/TemplateView';
import BroadcastView from './components/BroadcastView';
import SettingsView from './components/SettingsView';
import PinLogin from './components/PinLogin';
import { AppView, Contact, Message, Template, Broadcast, BusinessAPIConfig, Tag, QuickReply } from './types';

const INITIAL_TAGS: Tag[] = [
  { id: 'tag_1', name: 'Cliente Nuevo', color: 'bg-blue-500' },
  { id: 'tag_2', name: 'VIP', color: 'bg-purple-500' },
  { id: 'tag_3', name: 'Pendiente Pago', color: 'bg-orange-500' },
  { id: 'tag_4', name: 'Soporte', color: 'bg-green-500' },
];

const INITIAL_QUICK_REPLIES: QuickReply[] = [
  { id: 'qr_1', shortcut: 'hola', content: '¡Hola! Gracias por comunicarte con nosotros. ¿En qué puedo ayudarte hoy?' },
  { id: 'qr_2', shortcut: 'precios', content: 'Nuestros planes actuales son: Básico ($10), Pro ($25) y Enterprise (Consultar). ¿Te interesa alguno?' },
  { id: 'qr_3', shortcut: 'chau', content: '¡Muchas gracias por tu tiempo! Que tengas un excelente día.' },
];

const INITIAL_APIS: BusinessAPIConfig[] = [
  { id: 'api_1', name: 'Ventas Principal', phoneNumber: '+1 800 555 0100', status: 'connected' },
  { id: 'api_2', name: 'Soporte Técnico', phoneNumber: '+1 800 555 0200', status: 'connected' },
];

const INITIAL_CONTACTS: Contact[] = [
  { id: '1', name: 'Juan Pérez', phone: '+54 11 1234-5678', avatar: 'https://picsum.photos/seed/juan/200', lastMessage: 'Hola, ¿qué tal?', lastActive: new Date(), unreadCount: 2, assignedBusinessPhone: '+1 800 555 0100', tags: ['tag_1', 'tag_2'] },
  { id: '2', name: 'María García', phone: '+34 600 000 000', avatar: 'https://picsum.photos/seed/maria/200', lastMessage: 'Gracias por la info', lastActive: new Date(), unreadCount: 0, assignedBusinessPhone: '+1 800 555 0100', tags: ['tag_1'] },
  { id: '3', name: 'Tech Solutions', phone: '+1 555-0199', avatar: 'https://picsum.photos/seed/tech/200', lastMessage: 'Meeting tomorrow', lastActive: new Date(), unreadCount: 1, assignedBusinessPhone: '+1 800 555 0200', tags: ['tag_4'] },
];

const INITIAL_TEMPLATES: Template[] = [
  { id: 't1', name: 'welcome_message', category: 'UTILITY', language: 'es', content: '¡Hola {{1}}! Gracias por contactarnos. ¿En qué podemos ayudarte hoy?', status: 'APPROVED' },
  { id: 't2', name: 'promo_discount', category: 'MARKETING', language: 'es', content: '¡Oferta especial! Usa el código {{1}} para un 20% de descuento en tu próxima compra.', status: 'PENDING' },
];

import axios from 'axios';
import { API_URL } from './config';

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('wh_authenticated') === 'true';
  });

  const [activeView, setActiveView] = useState<AppView>('CHATS');
  const [contacts, setContacts] = useState<Contact[]>([]); // Start empty, fetch real data
  const [templates, setTemplates] = useState<Template[]>(INITIAL_TEMPLATES);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(INITIAL_QUICK_REPLIES);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>(INITIAL_TAGS);
  const [businessApis, setBusinessApis] = useState<BusinessAPIConfig[]>([]);
  const [currentApiId, setCurrentApiId] = useState<string>('');

  // FETCH REAL DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contactsRes, channelsRes] = await Promise.all([
          axios.get(`${API_URL}/contacts`),
          axios.get(`${API_URL}/channels`)
        ]);
        setContacts(contactsRes.data);
        setBusinessApis(channelsRes.data);

        // If we have channels but no current selection, select the first one
        if (channelsRes.data.length > 0 && !currentApiId) {
          setCurrentApiId(channelsRes.data[0].id);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    fetchData();
  }, []);

  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;

  const handleUpdateContactTags = (contactId: string, tagIds: string[]) => {
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, tags: tagIds } : c));
  };

  const handleUpsertContact = (contact: Contact) => {
    setContacts(prev => {
      const exists = prev.find(c => c.id === contact.id);
      if (exists) {
        return prev.map(c => c.id === contact.id ? contact : c);
      }
      return [contact, ...prev];
    });
  };

  const handleAddApi = (newApi: BusinessAPIConfig) => {
    setBusinessApis([...businessApis, newApi]);
  };

  const handleRemoveApi = (id: string) => {
    setBusinessApis(businessApis.filter(api => api.id !== id));
    if (currentApiId === id && businessApis.length > 1) {
      setCurrentApiId(businessApis.find(api => api.id !== id)!.id);
    }
  };

  // Authentication DISABLED - No PIN required
  // if (!isAuthenticated) {
  //   return <PinLogin onSuccess={() => setIsAuthenticated(true)} />;
  // }

  return (
    <div className="flex h-screen w-screen bg-[#f0f2f5] overflow-hidden">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {activeView === 'CHATS' && (
          <ChatView
            contacts={contacts}
            selectedContact={selectedContact}
            onSelectContact={(c) => setSelectedContactId(c.id)}
            businessApis={businessApis}
            currentApiId={currentApiId}
            onSwitchApi={setCurrentApiId}
            availableTags={availableTags}
            quickReplies={quickReplies}
            onUpdateContactTags={handleUpdateContactTags}
            onUpdateContact={handleUpsertContact}
          />
        )}

        {activeView === 'TEMPLATES' && (
          <TemplateView
            templates={templates}
            onUpdateTemplates={setTemplates}
          />
        )}

        {activeView === 'BROADCASTS' && (
          <BroadcastView
            broadcasts={broadcasts}
            templates={templates}
            businessApis={businessApis}
            currentApiId={currentApiId}
            onUpdateBroadcasts={setBroadcasts}
            availableTags={availableTags}
            contacts={contacts}
          />
        )}

        {activeView === 'SETTINGS' && (
          <SettingsView
            businessApis={businessApis}
            currentApiId={currentApiId}
            onAddApi={handleAddApi}
            onRemoveApi={handleRemoveApi}
            onSetCurrentApi={setCurrentApiId}
            availableTags={availableTags}
            onSetAvailableTags={setAvailableTags}
            quickReplies={quickReplies}
            onSetQuickReplies={setQuickReplies}
          />
        )}
      </main>
    </div>
  );
};

export default App;
