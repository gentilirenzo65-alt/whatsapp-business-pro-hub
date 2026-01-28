
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
  const { updateMessageStatus, addMessage } = useMessagesStore();

  // FETCH INITIAL DATA
  useEffect(() => {
    fetchContacts();
    fetchChannels();
    fetchTags();
    fetchQuickReplies();
  }, []);

  // SOCKET CONNECTION - Now updates Zustand stores directly
  useEffect(() => {
    const socket = io(SOCKET_URL);

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

  const handleSelectContact = (contact: { id: string }) => {
    navigate(`/chat/${contact.id}`);
  };

  return (
    <div className="flex h-screen w-screen bg-[#f0f2f5] overflow-hidden">
      <Sidebar />

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
