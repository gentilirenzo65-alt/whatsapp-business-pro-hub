
import React, { useState, useEffect, useRef } from 'react';
import { Contact, Message, BusinessAPIConfig, Tag, QuickReply } from '../types';

interface ChatViewProps {
  contacts: Contact[];
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact) => void;
  businessApis: BusinessAPIConfig[];
  currentApiId: string;
  onSwitchApi: (id: string) => void;
  availableTags: Tag[];
  quickReplies: QuickReply[];
  onUpdateContactTags: (contactId: string, tagIds: string[]) => void;
  onUpdateContact: (contact: Contact) => void;
}

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3';

import io from 'socket.io-client';
import axios from 'axios';
import { API_URL, SOCKET_URL, BACKEND_URL } from '../config';

const ChatView: React.FC<ChatViewProps> = ({
  // ... (props remain)
  contacts,
  selectedContact,
  onSelectContact,
  businessApis,
  currentApiId,
  onSwitchApi,
  availableTags,
  quickReplies,
  onUpdateContactTags,
  onUpdateContact
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  // ... (other states remain)
  const [inputText, setInputText] = useState('');
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showContactEditor, setShowContactEditor] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<Contact>>({});
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const socketRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentApi = businessApis.find(api => api.id === currentApiId) || businessApis[0];

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);

    // CONNECT SOCKET
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('new_message', (newMsg: Message) => {
      // Only append if it belongs to current contact OR needed for notification
      // Simplified for now: Append if matches selected, or just log
      setMessages(prev => {
        // Prevent duplicates
        if (prev.find(m => m.id === newMsg.id)) return prev;
        // Check if belongs to open chat (needs context check, simplified here)
        // NOTE: Ideally we check newMsg.contact_id vs selectedContact.id, but socket msg might not have contact_id populated in same format. 
        // For 'me' messages, senderId is me throughout.
        return [...prev, newMsg];
      });
      audioRef.current?.play().catch(() => { });
    });

    // Listen for message status updates (delivered, read)
    socketRef.current.on('message_status_update', (data: { messageId: string; status: string }) => {
      setMessages(prev => prev.map(m =>
        m.id === data.messageId
          ? { ...m, status: data.status as Message['status'] }
          : m
      ));
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedContact) {
      // FETCH REAL MESSAGES
      const fetchMessages = async () => {
        try {
          const res = await axios.get(`${API_URL}/messages/${selectedContact.id}`);
          // Transform DB Date string to Date object if needed
          const parsed = res.data.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
            isMine: m.direction === 'outbound',
            mediaUrl: m.media_url,
            mediaType: m.type,
            text: m.body, // CORRECT MAPPING
            fileName: m.body
          }));
          setMessages(parsed);
        } catch (e) {
          console.error("Error fetching messages", e);
        }
      };

      fetchMessages();

      setShowTagPicker(false);
      setShowContactEditor(false);
      setShowMediaMenu(false);
      setEditingContact({ ...selectedContact });

      // Mark as read and sync with server
      if (selectedContact.unreadCount > 0) {
        onUpdateContact({ ...selectedContact, unreadCount: 0 });

        // Sync unreadCount with server
        axios.put(`${API_URL}/contacts/${selectedContact.id}`, {
          unreadCount: 0
        }).catch(err => console.error('Error syncing unreadCount:', err));
      }
    }
  }, [selectedContact?.id]); // Use ID specifically

  // ... (scroll effect remain)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ... (quick replies effect remain)
  useEffect(() => {
    if (inputText.startsWith('/')) {
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }
  }, [inputText]);


  const useQuickReply = (qr: QuickReply) => {
    setInputText(qr.content);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  const filteredQuickReplies = quickReplies.filter(qr =>
    qr.shortcut.toLowerCase().includes(inputText.slice(1).toLowerCase())
  );

  const toggleTag = (tagId: string) => {
    if (!selectedContact) return;
    const currentTags = selectedContact.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    onUpdateContactTags(selectedContact.id, newTags);
  };

  const toggleEditingTag = (tagId: string) => {
    const currentTags = editingContact.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    setEditingContact({ ...editingContact, tags: newTags });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedContact) return;

    // Optimistic UI Update (Fake it immediately)
    const tempId = Date.now().toString();
    const newMsg: Message = {
      id: tempId,
      senderId: 'me',
      text: inputText,
      timestamp: new Date(),
      isMine: true,
      status: 'pending',
      channelId: currentApi?.phoneNumber || 'unknown',
      mediaType: 'text'
    };

    setMessages([...messages, newMsg]);
    setInputText('');

    try {
      // SEND TO API
      await axios.post(`${API_URL}/send`, {
        contactId: selectedContact.id,
        text: newMsg.text,
        type: 'text',
        channelId: currentApi?.id // IMPORTANT: Pass the database ID of the channel
      });
      // Socket will update status later
    } catch (error) {
      console.error("Send failed", error);
    }
  };

  // Handle real media upload
  const handleSendMedia = async (file: File) => {
    if (!selectedContact) return;

    // Optimistic UI: show temp message
    const tempId = `out_${Date.now()}`;
    const mediaType = file.type.startsWith('image/') ? 'image'
      : file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('audio/') ? 'audio'
          : 'document';

    const tempMsg: Message = {
      id: tempId,
      senderId: 'me',
      text: `[Enviando ${mediaType}...]`,
      timestamp: new Date(),
      isMine: true,
      status: 'pending',
      channelId: currentApi?.phoneNumber || 'unknown',
      mediaType: mediaType,
      mediaUrl: URL.createObjectURL(file)
    };

    setMessages(prev => [...prev, tempMsg]);

    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('contactId', selectedContact.id);
      formData.append('channelId', currentApi?.id || '');
      formData.append('caption', '');

      const res = await axios.post(`${API_URL}/send-media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Replace temp message with real one
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...res.data, isMine: true, mediaType } : m
      ));
    } catch (error) {
      console.error("Media send failed", error);
      // Mark as failed
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, status: 'failed', text: '[Error al enviar]' } : m
      ));
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSendMedia(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveContactChanges = async () => {
    try {
      if (editingContact.id) {
        // UPDATE Existing
        await axios.put(`${API_URL}/contacts/${editingContact.id}`, editingContact);
        onUpdateContact(editingContact as Contact);
      } else {
        // CREATE New
        if (!editingContact.phone) return alert('El teléfono es obligatorio');
        const res = await axios.post(`${API_URL}/contacts`, editingContact);
        const newContact = res.data;
        onUpdateContact(newContact);
        onSelectContact(newContact); // Automatically open chat
      }
      setShowContactEditor(false);
    } catch (error) {
      console.error('Failed to save contact', error);
      alert('Error al guardar contacto');
    }
  };

  const renderMessageContent = (msg: Message) => {
    switch (msg.mediaType) {
      case 'image':
        return (
          <div className="space-y-2">
            <img src={msg.mediaUrl} alt="Attached" className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition shadow-inner border border-gray-100" />
            {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center space-x-3 bg-gray-50/50 p-2 rounded-lg border border-gray-100 min-w-[250px]">
            <audio
              controls
              className="w-full h-10"
              src={msg.mediaUrl?.startsWith('http') ? msg.mediaUrl : `${BACKEND_URL}${msg.mediaUrl}`}
            >
              Tu navegador no soporta audio.
            </audio>
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer group">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-lg flex items-center justify-center mr-3 shadow-sm group-hover:scale-105 transition-transform">
              <i className="fa-solid fa-file-pdf text-2xl"></i>
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-bold text-gray-800 truncate">{msg.fileName}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">{msg.fileSize} • PDF</p>
            </div>
            <button className="text-gray-400 hover:text-green-600 transition-colors">
              <i className="fa-solid fa-download"></i>
            </button>
          </div>
        );
      default:
        return <p className="text-sm pr-12 whitespace-pre-wrap leading-relaxed">{msg.text}</p>;
    }
  };

  return (
    <div className="flex flex-1 h-full">
      {/* Contact List */}
      <div className="w-1/3 border-r border-gray-300 flex flex-col bg-white shadow-lg z-10">
        <div className="p-4 bg-[#f0f2f5] border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Chats</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => { setEditingContact({}); setShowContactEditor(true); }}
                className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white hover:bg-green-700 transition shadow-sm"
                title="Nuevo Chat"
              >
                <i className="fa-solid fa-plus text-xs"></i>
              </button>
              <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-black">MULTI-API</span>
            </div>
          </div>
          <div className="relative">
            <select
              value={currentApiId}
              onChange={(e) => onSwitchApi(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-white border border-green-300 rounded-xl text-xs font-bold text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
            >
              {businessApis.map(api => (
                <option key={api.id} value={api.id}>{api.name} ({api.phoneNumber})</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-green-600">
              <i className="fa-solid fa-chevron-down text-[10px]"></i>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative mt-3">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              placeholder="Buscar contacto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-times text-xs"></i>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts
            .filter(contact =>
              searchQuery === '' ||
              contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              contact.phone.includes(searchQuery)
            )
            .map(contact => (
              <div
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className={`flex items-center p-4 border-b cursor-pointer transition-all ${selectedContact?.id === contact.id ? 'bg-[#ebebeb] border-r-4 border-r-green-500' : 'hover:bg-gray-50'}`}
              >
                <div className="relative">
                  <img src={contact.avatar} className="w-12 h-12 rounded-full mr-3 border-2 border-white shadow-sm" alt={contact.name} />
                  {contact.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className={`truncate text-sm ${contact.unreadCount > 0 ? 'font-black text-black' : 'font-bold text-gray-900'}`}>
                      {contact.name}
                    </h3>
                    <span className={`text-[10px] ${contact.unreadCount > 0 ? 'text-green-600 font-black' : 'text-gray-400'}`}>Hoy</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center space-x-1 overflow-x-hidden">
                      {contact.tags.map(tId => {
                        const tag = availableTags.find(at => at.id === tId);
                        return tag ? (
                          <span key={tId} className={`w-2 h-2 rounded-full ${tag.color}`} title={tag.name}></span>
                        ) : null;
                      })}
                      <p className={`text-xs truncate ml-1 ${contact.unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                        {contact.phone}
                      </p>
                    </div>
                    {contact.unreadCount > 0 && (
                      <span className="bg-green-500 text-white text-[10px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 shadow-sm">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-[#e5ddd5] relative overflow-hidden">
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="p-3 bg-[#f0f2f5] flex items-center border-b z-30 shadow-sm">
              <img src={selectedContact.avatar} className="w-10 h-10 rounded-full mr-3 border-2 border-white shadow-sm cursor-pointer" alt="" onClick={() => setShowContactEditor(true)} />
              <div className="flex-1 cursor-pointer" onClick={() => setShowContactEditor(true)}>
                <div className="flex items-center">
                  <h3 className="font-bold text-gray-900 mr-2">{selectedContact.name}</h3>
                  <div className="flex space-x-1">
                    {selectedContact.tags.map(tId => {
                      const tag = availableTags.find(at => at.id === tId);
                      return tag ? (
                        <span key={tId} className={`${tag.color} text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm`}>
                          {tag.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 font-bold">{selectedContact.phone} <span className="mx-1">•</span> <span className="text-blue-500">Canal: {selectedContact.assignedBusinessPhone}</span></p>
              </div>
              <div className="flex items-center space-x-4 pr-2">
                {/* File Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileSelected}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-white rounded-full text-blue-600 hover:bg-blue-50 shadow-sm border transition-all"
                  title="Adjuntar archivo"
                >
                  <i className="fa-solid fa-paperclip"></i>
                </button>
                <button
                  onClick={() => setShowContactEditor(true)}
                  className="p-2 bg-white rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 shadow-sm border transition-all"
                  title="Editar Contacto"
                >
                  <i className="fa-solid fa-user-edit text-xs"></i>
                </button>
                <button
                  onClick={() => setShowTagPicker(!showTagPicker)}
                  className={`p-2 rounded-full transition-colors ${showTagPicker ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-green-100 hover:text-green-600'} shadow-sm border`}
                  title="Gestionar Etiquetas"
                >
                  <i className="fa-solid fa-tags"></i>
                </button>
                <div className="w-px h-6 bg-gray-300"></div>
                <i className="fa-solid fa-ellipsis-vertical text-gray-400 cursor-pointer hover:text-green-600"></i>
              </div>
            </div>

            {/* Tag Picker Popover */}
            {showTagPicker && (
              <div className="absolute top-16 right-4 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Asignar Etiquetas</h4>
                <div className="space-y-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${selectedContact.tags.includes(tag.id)
                        ? 'bg-green-50 border-green-200 border shadow-sm'
                        : 'hover:bg-gray-50 border-transparent border'
                        }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${tag.color} mr-3`}></div>
                        <span className={`text-sm font-bold ${selectedContact.tags.includes(tag.id) ? 'text-green-700' : 'text-gray-600'}`}>{tag.name}</span>
                      </div>
                      {selectedContact.tags.includes(tag.id) && <i className="fa-solid fa-check text-green-600 text-xs"></i>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-2 pb-24 custom-scrollbar"
              style={{
                backgroundImage: "url('https://i.pinimg.com/originals/97/c0/07/97c00759d90d786d9b6096d274ad3051.png')",
                backgroundBlendMode: 'overlay',
                backgroundColor: '#e5ddd5',
                backgroundSize: '400px'
              }}
            >
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-3 py-2 rounded-xl shadow-sm relative ${msg.isMine ? 'bg-[#dcf8c6] text-gray-800' : 'bg-white text-gray-800'}`}>
                    <span className={`text-[8px] absolute -top-4 font-black uppercase tracking-wider ${msg.isMine ? 'right-0 text-green-700' : 'left-0 text-gray-500'}`}>
                      {msg.isMine ? `De: ${currentApi?.phoneNumber || '...'}` : `Cliente: ${selectedContact.phone}`}
                    </span>

                    {renderMessageContent(msg)}

                    <div className="flex items-center justify-end space-x-1 mt-1 opacity-60">
                      <span className="text-[9px] text-gray-500 font-bold">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.isMine && <i className={`fa-solid fa-check-double text-[9px] ${msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'}`}></i>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Replies Menu */}
            {showQuickReplies && filteredQuickReplies.length > 0 && (
              <div className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl shadow-2xl border-2 border-green-100 z-50 overflow-hidden animate-in slide-in-from-bottom-2">
                <div className="bg-green-50 px-4 py-2 border-b flex justify-between items-center">
                  <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Atajos Disponibles</span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase">Usa '/' para buscar</span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredQuickReplies.map(qr => (
                    <button
                      key={qr.id}
                      onClick={() => useQuickReply(qr)}
                      className="w-full text-left p-4 hover:bg-green-50 border-b last:border-0 transition-colors group flex items-start space-x-3"
                    >
                      <div className="bg-green-100 text-green-600 px-2 py-1 rounded text-[10px] font-black uppercase">/{qr.shortcut}</div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 line-clamp-1">{qr.content}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#f0f2f5] border-t flex items-center space-x-4 z-20">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={`Escribe un mensaje o '/' para atajos...`}
                  className="w-full py-3 px-6 rounded-2xl focus:outline-none text-sm border-none shadow-sm"
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="p-3 bg-green-600 text-white rounded-2xl w-12 h-12 flex items-center justify-center hover:bg-green-700 transition shadow-xl shadow-green-200 disabled:bg-gray-300 transform active:scale-95"
              >
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>

            {/* MODAL: CONTACT EDITOR */}
            {showContactEditor && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-md">
                <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black text-gray-800 tracking-tight uppercase">
                        {!editingContact.id ? 'Nuevo Contacto' : 'Información de Contacto'}
                      </h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {!editingContact.id ? 'Inicia un chat con un cliente nuevo' : 'Actualiza los datos del cliente'}
                      </p>
                    </div>
                    <button onClick={() => setShowContactEditor(false)} className="text-gray-400 hover:text-gray-800"><i className="fa-solid fa-times text-xl"></i></button>
                  </div>
                  <div className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col items-center mb-4">
                      <img src={editingContact.avatar || 'https://ui-avatars.com/api/?background=random&name=New'} className="w-24 h-24 rounded-full border-4 border-gray-100 shadow-lg mb-4" alt="" />
                      {!editingContact.id && <p className="text-[10px] text-gray-400">El avatar se generará automáticamente</p>}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nombre Completo</label>
                        <input
                          type="text"
                          className="w-full bg-gray-100 border-none rounded-2xl p-4 font-bold text-gray-800"
                          value={editingContact.name || ''}
                          onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                          placeholder="Ej: Juan Pérez"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Teléfono (con código país)</label>
                        <input
                          type="text"
                          className={`w-full border-none rounded-2xl p-4 font-mono font-bold ${!editingContact.id ? 'bg-white border-2 border-green-100 text-gray-800' : 'bg-gray-50 text-gray-400 cursor-not-allowed'}`}
                          value={editingContact.phone || ''}
                          onChange={(e) => !editingContact.id && setEditingContact({ ...editingContact, phone: e.target.value })}
                          disabled={!!editingContact.id}
                          placeholder="Ej: 5491112345678"
                        />
                        {!editingContact.id && <p className="text-[9px] text-gray-400 mt-1 ml-1">Sin espacios ni símbolos (+). Ej: 549264...</p>}
                      </div>

                      {/* TAG SELECTION SECTION */}
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Etiquetas del Cliente</label>
                        <div className="grid grid-cols-2 gap-2">
                          {availableTags.map(tag => {
                            const isSelected = (editingContact.tags || []).includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                onClick={() => toggleEditingTag(tag.id)}
                                className={`flex items-center space-x-2 p-3 rounded-2xl border-2 transition-all ${isSelected
                                  ? `${tag.color.replace('bg-', 'border-')} ${tag.color.replace('bg-', 'bg-')}/10 border-opacity-50`
                                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                                  }`}
                              >
                                <div className={`w-3 h-3 rounded-full ${tag.color}`}></div>
                                <span className={`text-[10px] font-black uppercase tracking-tighter ${isSelected ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {tag.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Notas Internas (Opcional)</label>
                        <textarea
                          className="w-full bg-gray-100 border-none rounded-2xl p-4 font-medium text-gray-800 text-sm"
                          rows={2}
                          placeholder="Información adicional..."
                          value={editingContact.notes || ''}
                          onChange={(e) => setEditingContact({ ...editingContact, notes: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col space-y-3 pt-4">
                      <button
                        onClick={saveContactChanges}
                        className="w-full py-5 bg-green-600 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95 transition"
                      >
                        {!editingContact.id ? 'Crear Contacto' : 'Guardar Cambios'}
                      </button>
                      <button
                        onClick={() => setShowContactEditor(false)}
                        className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center py-2"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white">
            <div className="w-80 h-80 bg-gray-50 rounded-full flex items-center justify-center mb-8 shadow-inner">
              <i className="fa-brands fa-whatsapp text-[150px] text-gray-100"></i>
            </div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">Hub WhatsApp Pro</h2>
            <p className="max-w-md text-center text-gray-400 mt-2">Selecciona un chat para ver los detalles del cliente y gestionar sus etiquetas.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
