import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BusinessAPIConfig, Tag, QuickReply } from '../types';
import { API_URL } from '../config';

// Zustand Stores
import { useChannelsStore, useAppStore } from '../stores';

interface Toast {
  message: string;
  type: 'success' | 'info' | 'error';
}

const SettingsView: React.FC = () => {
  // === ZUSTAND STORES ===
  const { channels: businessApis, currentChannelId: currentApiId, addChannel, updateChannel: updateChannelStore, removeChannel, setCurrentChannel, fetchChannels } = useChannelsStore();
  const { tags: availableTags, quickReplies, addTag, updateTag, removeTag: removeTagFromStore, addQuickReply, updateQuickReply, removeQuickReply: removeQRFromStore, fetchTags, fetchQuickReplies, setTags, setQuickReplies } = useAppStore();

  // Modal States
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [editingQRId, setEditingQRId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Forms
  const [channelForm, setChannelForm] = useState<Partial<BusinessAPIConfig>>({
    name: '',
    phoneNumber: '',
    phoneId: '',
    wabaId: '',
    appSecret: '',
    accessToken: ''
  });


  const [tagForm, setTagForm] = useState<Partial<Tag>>({ name: '', color: 'bg-gray-500' });
  const [qrForm, setQrForm] = useState<Partial<QuickReply>>({ shortcut: '', content: '' });

  // FETCH DATA ON MOUNT
  useEffect(() => {
    fetchChannels();
    fetchTags();
    fetchQuickReplies();
  }, []);

  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
    'bg-teal-500', 'bg-gray-800'
  ];

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ===== CHANNEL HANDLERS =====
  const openAddChannel = () => {
    setEditingChannelId(null);
    setChannelForm({ name: '', phoneNumber: '', phoneId: '', wabaId: '', appSecret: '', accessToken: '' });
    setIsChannelModalOpen(true);
  };

  const openEditChannel = (channel: BusinessAPIConfig) => {
    setEditingChannelId(channel.id);
    setChannelForm({
      name: channel.name,
      phoneNumber: channel.phoneNumber,
      phoneId: channel.phoneId,
      wabaId: channel.wabaId || '',
      appSecret: channel.appSecret || '',
      accessToken: channel.accessToken
    });
    setIsChannelModalOpen(true);
  };

  const handleSaveChannel = async () => {
    if (!channelForm.name || !channelForm.phoneNumber || !channelForm.phoneId || !channelForm.accessToken) {
      return showToast('Nombre, Número, Phone ID y Token son obligatorios', 'error');
    }

    try {
      const payload = {
        name: channelForm.name,
        phoneNumber: channelForm.phoneNumber,
        phoneId: channelForm.phoneId,
        wabaId: channelForm.wabaId || null,
        appSecret: channelForm.appSecret || null,
        accessToken: channelForm.accessToken
      };

      if (editingChannelId) {
        // UPDATE existing channel
        const res = await axios.put(`${API_URL}/channels/${editingChannelId}`, payload);
        updateChannelStore({
          ...res.data,
          status: 'connected'
        });
        showToast(`Canal [${res.data.name}] actualizado.`, 'success');
      } else {
        // CREATE new channel
        const res = await axios.post(`${API_URL}/channels`, payload);
        addChannel({
          id: res.data.id,
          name: res.data.name,
          phoneNumber: res.data.phoneNumber,
          phoneId: res.data.phoneId,
          wabaId: res.data.wabaId,
          appSecret: res.data.appSecret,
          accessToken: res.data.accessToken,
          status: 'connected'
        });
        showToast(`Canal [${res.data.name}] conectado.`, 'success');
      }

      setChannelForm({ name: '', phoneNumber: '', phoneId: '', wabaId: '', appSecret: '', accessToken: '' });
      setIsChannelModalOpen(false);
      setEditingChannelId(null);
    } catch (error: any) {
      console.error('Save Channel Error:', error);
      const backendError = error.response?.data?.error;
      const networkError = error.code || error.message;
      const msg = backendError || networkError || 'Error al guardar canal';
      showToast(`❌ ${msg}`, 'error');
    }
  };

  const handleTestConnection = async () => {
    if (!channelForm.phoneId || !channelForm.accessToken) {
      return showToast('Ingresa Phone ID y Token para probar', 'info');
    }

    setIsTesting(true);
    try {
      const res = await axios.post(`${API_URL}/channels/test`, {
        phoneId: channelForm.phoneId,
        accessToken: channelForm.accessToken
      });

      showToast(`✅ Conexión Exitosa. Número: ${res.data.data?.display_phone_number || 'Verificado'}`, 'success');
    } catch (error: any) {
      console.error('Test Connection Error:', error);
      // Show detailed error: backend message OR network error
      const backendError = error.response?.data?.error;
      const networkError = error.code || error.message;
      const errorDetail = backendError || networkError || 'Error desconocido';
      showToast(`❌ Error: ${errorDetail}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleRemoveChannel = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta línea de WhatsApp?')) return;
    try {
      await axios.delete(`${API_URL}/channels/${id}`);
      removeChannel(id);
      showToast('Línea eliminada', 'info');
    } catch (error) {
      console.error(error);
      showToast('Error al eliminar línea', 'error');
    }
  };

  // ===== TAG HANDLERS =====
  const handleSaveTag = async () => {
    if (!tagForm.name) return;

    try {
      if (editingTagId) {
        const res = await axios.put(`${API_URL}/tags/${editingTagId}`, {
          name: tagForm.name,
          color: tagForm.color
        });
        updateTag(res.data);
      } else {
        const res = await axios.post(`${API_URL}/tags`, {
          name: tagForm.name,
          color: tagForm.color || 'bg-gray-500'
        });
        addTag(res.data);
      }
      setTagModalOpen(false);
      setEditingTagId(null);
      setTagForm({ name: '', color: 'bg-gray-500' });
      showToast("Etiqueta guardada", "success");
    } catch (error) {
      console.error(error);
      showToast("Error al guardar etiqueta", "error");
    }
  };

  const removeTag = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/tags/${id}`);
      removeTagFromStore(id);
      showToast("Etiqueta eliminada", "info");
    } catch (error) {
      console.error(error);
      showToast("Error al eliminar etiqueta", "error");
    }
  };

  const openEditTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setTagForm({ name: tag.name, color: tag.color });
    setTagModalOpen(true);
  };

  // ===== QUICK REPLY HANDLERS =====
  const handleSaveQR = async () => {
    if (!qrForm.shortcut || !qrForm.content) return;

    try {
      const cleanShortcut = qrForm.shortcut.replace('/', '');

      if (editingQRId) {
        const res = await axios.put(`${API_URL}/quickreplies/${editingQRId}`, {
          shortcut: cleanShortcut,
          content: qrForm.content
        });
        updateQuickReply(res.data);
      } else {
        const res = await axios.post(`${API_URL}/quickreplies`, {
          shortcut: cleanShortcut,
          content: qrForm.content
        });
        addQuickReply(res.data);
      }
      setQrModalOpen(false);
      setEditingQRId(null);
      setQrForm({ shortcut: '', content: '' });
      showToast("Atajo guardado", "success");
    } catch (error) {
      console.error(error);
      showToast("Error al guardar atajo", "error");
    }
  };

  const removeQR = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/quickreplies/${id}`);
      removeQRFromStore(id);
      showToast("Atajo eliminado", "info");
    } catch (error) {
      console.error(error);
      showToast("Error al eliminar atajo", "error");
    }
  };

  const openEditQR = (qr: QuickReply) => {
    setEditingQRId(qr.id);
    setQrForm({ shortcut: qr.shortcut, content: qr.content });
    setQrModalOpen(true);
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50/30">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header Compacto */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Configuración</h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Gestión de recursos y conexiones</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* SECCIÓN: CANALES WHATSAPP */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                <i className="fa-brands fa-whatsapp mr-2 text-green-500"></i> Canales WhatsApp
              </h2>
              <button onClick={openAddChannel} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-green-600 transition-colors">
                <i className="fa-solid fa-plus-circle"></i>
              </button>
            </div>
            <div className="bg-white rounded-[32px] border border-gray-200 p-6 space-y-3 shadow-sm min-h-[300px]">
              {businessApis.length === 0 && (
                <div className="flex flex-col items-center justify-center h-60 text-center">
                  <i className="fa-solid fa-plug-circle-xmark text-4xl text-gray-200 mb-4"></i>
                  <p className="text-xs text-gray-400 font-medium">No hay canales configurados</p>
                  <p className="text-[10px] text-gray-300 mt-1">Haz clic en + para agregar tu primer número de WhatsApp</p>
                </div>
              )}
              {businessApis.map(api => (
                <div key={api.id} className={`p-4 rounded-2xl border transition-all ${api.status === 'DISCONNECTED' || api.status === 'BANNED'
                  ? 'border-red-500 bg-red-50/50 shadow-red-100 shadow-lg'
                  : api.id === currentApiId
                    ? 'border-green-500 bg-green-50/30'
                    : 'border-gray-100 hover:border-gray-200'
                  }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${api.status === 'DISCONNECTED' || api.status === 'BANNED'
                        ? 'bg-red-500 text-white'
                        : 'bg-gradient-to-br from-green-400 to-green-600 text-white'
                        }`}>
                        <i className={`fa-brands ${api.status === 'DISCONNECTED' || api.status === 'BANNED' ? 'fa-triangle-exclamation' : 'fa-whatsapp'} text-lg`}></i>
                      </div>
                      <div className="truncate">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-black text-gray-900 truncate">{api.name}</div>
                          {(api.status === 'DISCONNECTED' || api.status === 'BANNED') && (
                            <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                              {api.status}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-gray-400">{api.phoneNumber}</div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setCurrentChannel(api.id)}
                        disabled={api.id === currentApiId}
                        className={`w-8 h-8 flex items-center justify-center transition-colors rounded-lg ${api.id === currentApiId ? 'text-green-500 bg-green-50' : 'text-gray-300 hover:text-green-600 hover:bg-gray-50'}`}
                        title="Usar como activo"
                      >
                        <i className="fa-solid fa-circle-check"></i>
                      </button>
                      <button
                        onClick={() => openEditChannel(api)}
                        className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <i className="fa-solid fa-pen text-[10px]"></i>
                      </button>
                      <button
                        onClick={() => handleRemoveChannel(api.id)}
                        className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <i className="fa-solid fa-trash-can text-[10px]"></i>
                      </button>
                    </div>
                  </div>
                  {/* Extra Info */}
                  <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2 text-[9px]">
                    <div>
                      <span className="text-gray-300 uppercase">Phone ID:</span>
                      <span className="ml-1 font-mono text-gray-500">{api.phoneId?.slice(0, 12)}...</span>
                    </div>
                    <div>
                      <span className="text-gray-300 uppercase">WABA ID:</span>
                      <span className="ml-1 font-mono text-gray-500">{api.wabaId ? `${api.wabaId.slice(0, 10)}...` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECCIÓN: ETIQUETAS (RESTABLECIDA) */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                <i className="fa-solid fa-tags mr-2"></i> Etiquetas (CRM)
              </h2>
              <button onClick={() => { setEditingTagId(null); setTagForm({ name: '', color: 'bg-blue-500' }); setTagModalOpen(true); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-purple-600 transition-colors">
                <i className="fa-solid fa-plus-circle"></i>
              </button>
            </div>
            <div className="bg-white rounded-[32px] border border-gray-200 p-6 space-y-2 shadow-sm min-h-[300px]">
              {availableTags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between group p-3 rounded-2xl border border-gray-50 hover:bg-gray-50 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${tag.color} shadow-sm`}></div>
                    <span className="text-xs font-bold text-gray-700">{tag.name}</span>
                  </div>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditTag(tag)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600">
                      <i className="fa-solid fa-pen text-[10px]"></i>
                    </button>
                    <button onClick={() => removeTag(tag.id)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500">
                      <i className="fa-solid fa-times text-[10px]"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECCIÓN: RESPUESTAS RÁPIDAS */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                <i className="fa-solid fa-bolt-lightning mr-2"></i> Respuestas Rápidas
              </h2>
              <button onClick={() => { setEditingQRId(null); setQrForm({ shortcut: '', content: '' }); setQrModalOpen(true); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-yellow-600 transition-colors">
                <i className="fa-solid fa-plus-circle"></i>
              </button>
            </div>
            <div className="bg-white rounded-[32px] border border-gray-200 p-6 space-y-3 shadow-sm min-h-[300px]">
              {quickReplies.map(qr => (
                <div key={qr.id} className="group flex flex-col p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-yellow-200 transition-all cursor-default">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-yellow-600 uppercase">/{qr.shortcut}</span>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditQR(qr)} className="text-gray-400 hover:text-blue-500 p-1"><i className="fa-solid fa-pen text-[9px]"></i></button>
                      <button onClick={() => removeQR(qr.id)} className="text-gray-400 hover:text-red-500 p-1"><i className="fa-solid fa-trash text-[9px]"></i></button>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{qr.content}</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* TOASTS */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[250] animate-in slide-in-from-right-4 duration-300">
          <div className={`px-6 py-3 rounded-2xl shadow-xl border flex items-center space-x-3 ${toast.type === 'success' ? 'bg-green-600 border-green-500 text-white' :
            toast.type === 'error' ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-white'
            }`}>
            <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : toast.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'} text-sm`}></i>
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}

      {/* MODAL CANAL WHATSAPP */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[210] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 shadow-2xl">
            <div className="p-6 border-b bg-gradient-to-r from-green-500 to-emerald-600 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <i className="fa-brands fa-whatsapp text-white text-xl"></i>
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                  {editingChannelId ? 'Editar Canal' : 'Nuevo Canal WhatsApp'}
                </h3>
              </div>
              <button onClick={() => setIsChannelModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <i className="fa-solid fa-times text-lg"></i>
              </button>
            </div>

            <div className="p-8 space-y-5">
              {/* Nombre / Alias */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Nombre / Alias
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ventas Principal, Soporte..."
                  className="w-full bg-gray-100 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none"
                  value={channelForm.name}
                  onChange={e => setChannelForm({ ...channelForm, name: e.target.value })}
                />
              </div>

              {/* Número de Teléfono */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Número de Teléfono
                </label>
                <input
                  type="text"
                  placeholder="+54 9 264 577 8956"
                  className="w-full bg-gray-100 rounded-xl p-4 text-sm font-mono focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none"
                  value={channelForm.phoneNumber}
                  onChange={e => setChannelForm({ ...channelForm, phoneNumber: e.target.value })}
                />
              </div>

              {/* Phone ID */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Phone Number ID <span className="text-gray-300">(de Meta)</span>
                </label>
                <input
                  type="text"
                  placeholder="960527703810768"
                  className="w-full bg-gray-100 rounded-xl p-4 text-sm font-mono focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none"
                  value={channelForm.phoneId}
                  onChange={e => setChannelForm({ ...channelForm, phoneId: e.target.value })}
                />
              </div>

              {/* WABA ID */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  WABA ID <span className="text-gray-300">(Opcional - para plantillas)</span>
                </label>
                <input
                  type="text"
                  placeholder="1336632681832004"
                  className="w-full bg-gray-100 rounded-xl p-4 text-sm font-mono focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none"
                  value={channelForm.wabaId}
                  onChange={e => setChannelForm({ ...channelForm, wabaId: e.target.value })}
                />
              </div>

              {/* App Secret (NUEVO) */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  App Secret <span className="text-red-400">*Requerido para recibir mensajes</span>
                </label>
                <input
                  type="password"
                  placeholder="Clave secreta de la app (Meta)"
                  className="w-full bg-gray-100 rounded-xl p-4 text-sm font-mono focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none"
                  value={channelForm.appSecret}
                  onChange={e => setChannelForm({ ...channelForm, appSecret: e.target.value })}
                />
              </div>

              {/* Access Token */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Access Token <span className="text-gray-300">(Permanente)</span>
                </label>
                <textarea
                  placeholder="EAAREzMEwxwcBO..."
                  rows={3}
                  className="w-full bg-gray-100 rounded-xl p-4 text-xs font-mono focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none resize-none"
                  value={channelForm.accessToken}
                  onChange={e => setChannelForm({ ...channelForm, accessToken: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-2"></i> Probando...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-flask mr-2"></i> Probar Conexión
                    </>
                  )}
                </button>

                <button
                  onClick={handleSaveChannel}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                >
                  {editingChannelId ? 'Guardar Cambios' : 'Vincular Canal'}
                </button>
              </div>

              {/* Help Text */}
              <p className="text-[10px] text-gray-400 text-center pt-2">
                <i className="fa-solid fa-circle-info mr-1"></i>
                Obtén estos datos en <a href="https://developers.facebook.com" target="_blank" className="text-green-600 hover:underline">Meta for Developers</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ETIQUETAS */}
      {tagModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[210] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">{editingTagId ? 'Editar' : 'Nueva'} Etiqueta</h3>
              <button onClick={() => setTagModalOpen(false)} className="text-gray-400"><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="p-8 space-y-6">
              <input
                type="text" className="w-full bg-gray-100 rounded-xl p-4 font-bold text-xs"
                placeholder="Nombre etiqueta" value={tagForm.name}
                onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
              />
              <div className="grid grid-cols-5 gap-3">
                {colors.map(c => (
                  <button key={c} onClick={() => setTagForm({ ...tagForm, color: c })} className={`w-8 h-8 rounded-full ${c} ${tagForm.color === c ? 'ring-4 ring-gray-200 scale-110' : ''}`}></button>
                ))}
              </div>
              <button onClick={handleSaveTag} className="w-full bg-purple-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Guardar Etiqueta</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESPUESTAS RÁPIDAS */}
      {qrModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[210] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">{editingQRId ? 'Editar' : 'Nuevo'} Atajo</h3>
              <button onClick={() => setQrModalOpen(false)} className="text-gray-400"><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="p-8 space-y-5">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">/</span>
                <input
                  type="text" className="w-full bg-gray-100 rounded-xl p-4 pl-8 font-bold text-xs"
                  placeholder="atajo" value={qrForm.shortcut}
                  onChange={(e) => setQrForm({ ...qrForm, shortcut: e.target.value })}
                />
              </div>
              <textarea
                className="w-full bg-gray-100 rounded-xl p-4 text-xs font-medium" rows={4}
                placeholder="Mensaje completo..." value={qrForm.content}
                onChange={(e) => setQrForm({ ...qrForm, content: e.target.value })}
              />
              <button onClick={handleSaveQR} className="w-full bg-yellow-500 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Guardar Atajo</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsView;
