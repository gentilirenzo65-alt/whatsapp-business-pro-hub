
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import TemplateView from './components/TemplateView';
import BroadcastView from './components/BroadcastView';
import SettingsView from './components/SettingsView';
import AnalyticsView from './components/AnalyticsView';
import { SOCKET_URL } from './config';

// Zustand Stores
import { useContactsStore, useChannelsStore, useAppStore, useMessagesStore } from './stores';

// Main App Content (inside Router context)
const AppContent: React.FC = () => {
  const navigate = useNavigate();

  // Zustand stores - only subscribe to what's needed
  const { contacts, fetchContacts, updateContact, addContact } = useContactsStore();
  const { channels, currentChannelId, fetchChannels, setCurrentChannel } = useChannelsStore();
  const { fetchTags, fetchQuickReplies, setConnected, setTyping, clearTyping } = useAppStore();
  const { updateMessageStatus, updateMessage, addMessage } = useMessagesStore();

  // FETCH INITIAL DATA
  useEffect(() => {
    fetchContacts();
    fetchChannels();
    fetchTags();
    fetchQuickReplies();
  }, []);

  // CRITICAL ALERTS STATE
  const [criticalAlerts, setCriticalAlerts] = React.useState<any[]>([]);

  // SOCKET CONNECTION - Now updates Zustand stores directly
  useEffect(() => {
    const socket = io(SOCKET_URL);

    // ... (existing listeners)

    // CRITICAL CHANNEL ISSUES
    socket.on('channel_issue', (alert: any) => {
      console.error('🚨 RECEIVED CRITICAL ALERT:', alert);
      setCriticalAlerts(prev => {
        // Avoid duplicates if same phoneId and issueType already exists
        const exists = prev.find(a => a.phoneId === alert.phoneId && a.type === alert.type);
        if (exists) return prev;
        return [...prev, alert];
      });
    });

    socket.on('connect', () => {
      console.log('🟢 Socket conectado');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Socket desconectado');
      setConnected(false);
    });

    // Contact updates from backend
    socket.on('contact_update', (updatedContact: any) => {
      const contactData = {
        ...updatedContact,
        lastActive: new Date(updatedContact.lastActive)
      };

      // Check if exists and update or add
      const exists = contacts.find(c => c.id === updatedContact.id);
      if (exists) {
        updateContact(contactData);
      } else {
        addContact(contactData);
      }
    });

    // New messages
    socket.on('new_message', (newMsg: any) => {
      if (newMsg.contact_id) {
        addMessage(newMsg.contact_id, newMsg);
      }
    });

    // Message status updates
    socket.on('message_status_update', (data: { messageId: string; status: string }) => {
      updateMessageStatus(data.messageId, data.status);
    });

    // Generic message updates (e.g. media downloaded)
    socket.on('message_update', (data: { id: string;[key: string]: any }) => {
      const { id, ...updates } = data;
      updateMessage(id, updates);
    });

    // Typing indicators (moved from ChatView)
    socket.on('contact_typing', (data: { phone: string; isTyping: boolean }) => {
      setTyping(data.phone, data.isTyping);

      // Auto-clear after 5 seconds
      if (data.isTyping) {
        setTimeout(() => clearTyping(data.phone), 5000);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleDismissAlert = (index: number) => {
    setCriticalAlerts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectContact = (contact: { id: string }) => {
    navigate(`/chat/${contact.id}`);
  };

  return (
    <div className="flex h-screen w-screen bg-[#f0f2f5] overflow-hidden relative">
      <Sidebar />

      {/* CRITICAL ALERTS OVERLAY */}
      {criticalAlerts.length > 0 && (
        <div className="absolute top-4 left-20 right-4 z-50 flex flex-col space-y-2">
          {criticalAlerts.map((alert, index) => {
            // Find channel name if possible
            const channel = channels.find(c => c.phoneId === alert.phoneId);
            const channelName = channel ? `${channel.name} (${channel.phoneNumber})` : `ID: ${alert.phoneId}`;

            return (
              <div k={index} className="bg-red-600 text-white p-4 rounded-lg shadow-2xl flex items-center justify-between border-l-8 border-red-900 animate-pulse">
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-triangle-exclamation text-3xl text-yellow-300"></i>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-wider">⚠️ ALERTA DE LÍNEA CRÍTICA</h3>
                    <p className="font-medium text-sm">
                      La línea <strong>{channelName}</strong> ha reportado estado: <span className="bg-red-800 px-1 rounded font-bold">{alert.type}</span>
                    </p>
                    <p className="text-xs opacity-80 mt-1">
                      {alert.details?.ban_info?.waba_ban_date || alert.details?.restriction_info?.restriction_type || 'Revise la configuración inmediatamente.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDismissAlert(index)}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded font-bold transition-all text-xs uppercase"
                >
                  ENTENDIDO, CERRAR
                </button>
              </div>
            );
          })}
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 bg-white">
        <Routes>
          {/* Chat Routes */}
          <Route path="/chats" element={
            <ChatView
              selectedContactId={null}
              onSelectContact={handleSelectContact}
            />
          } />

          <Route path="/chat/:contactId" element={
            <ChatViewWrapper onSelectContact={handleSelectContact} />
          } />

          {/* Other Routes */}
          <Route path="/templates" element={<TemplateView />} />
          <Route path="/broadcasts" element={<BroadcastView />} />
          <Route path="/analytics" element={<AnalyticsView />} />
          <Route path="/settings" element={<SettingsView />} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/chats" replace />} />
          <Route path="*" element={<Navigate to="/chats" replace />} />
        </Routes>
      </main>
    </div>
  );
};

// Wrapper to extract contactId from URL
const ChatViewWrapper: React.FC<{ onSelectContact: (c: { id: string }) => void }> = ({ onSelectContact }) => {
  const { contactId } = useParams<{ contactId: string }>();

  return (
    <ChatView
      selectedContactId={contactId || null}
      onSelectContact={onSelectContact}
    />
  );
};

// Root App with Router
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
