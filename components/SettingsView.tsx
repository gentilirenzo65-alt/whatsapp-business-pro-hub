import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BusinessAPIConfig, Tag, QuickReply } from '../types';
import { API_URL } from '../config';

interface SettingsViewProps {
  businessApis: BusinessAPIConfig[];
  currentApiId: string;
  onAddApi: (api: BusinessAPIConfig) => void;
  onRemoveApi: (id: string) => void;
  onSetCurrentApi: (id: string) => void;
  availableTags: Tag[];
  onSetAvailableTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  quickReplies: QuickReply[];
  onSetQuickReplies: React.Dispatch<React.SetStateAction<QuickReply[]>>;
}

interface Toast {
  message: string;
  type: 'success' | 'info' | 'error';
}

const SettingsView: React.FC<SettingsViewProps> = ({
  businessApis,
  currentApiId,
  onAddApi,
  onRemoveApi,
  onSetCurrentApi,
  availableTags,
  onSetAvailableTags,
  quickReplies,
  onSetQuickReplies
}) => {
  const [isAddingApi, setIsAddingApi] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [editingQRId, setEditingQRId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [newApi, setNewApi] = useState<Partial<BusinessAPIConfig>>({ name: '', phoneNumber: '', phoneId: '', accessToken: '' });
  const [tagForm, setTagForm] = useState<Partial<Tag>>({ name: '', color: 'bg-gray-500' });
  const [qrForm, setQrForm] = useState<Partial<QuickReply>>({ shortcut: '', content: '' });

  // FETCH DATA ON MOUNT
  useEffect(() => {
    fetchChannels();
    fetchTags();
    fetchQuickReplies();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await axios.get(`${API_URL}/channels`);
      // Update parent state with channels from DB
      res.data.forEach((ch: any) => {
        if (!businessApis.find(a => a.id === ch.id)) {
          onAddApi({
            id: ch.id,
            name: ch.name,
            phoneNumber: ch.phoneNumber,
            phoneId: ch.phoneId,
            accessToken: ch.accessToken,
            status: 'connected'
          });
        }
      });
    } catch (e) {
      console.error("Error fetching channels", e);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await axios.get(`${API_URL}/tags`);
      onSetAvailableTags(res.data);
    } catch (e) {
      console.error("Error fetching tags", e);
    }
  };

  const fetchQuickReplies = async () => {
    try {
      const res = await axios.get(`${API_URL}/quickreplies`);
      onSetQuickReplies(res.data);
    } catch (e) {
      console.error("Error fetching quick replies", e);
    }
  };

  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
    'bg-teal-500', 'bg-gray-800'
  ];

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddApi = async () => {
    if (!newApi.name || !newApi.phoneNumber || !newApi.phoneId || !newApi.accessToken) {
      return showToast('Todos los campos son obligatorios', 'error');
    }

    try {
      const payload = {
        name: newApi.name,
        phoneNumber: newApi.phoneNumber,
        phoneId: newApi.phoneId,
        accessToken: newApi.accessToken
      };
      const res = await axios.post(`${API_URL}/channels`, payload);
      const created = res.data;

      onAddApi({
        id: created.id,
        name: created.name,
        phoneNumber: created.phoneNumber,
        phoneId: created.phoneId,
        accessToken: created.accessToken,
        status: 'connected'
      });
      showToast(`Línea [${created.name}] conectada.`, 'success');
      setNewApi({ name: '', phoneNumber: '', phoneId: '', accessToken: '' });
      setIsAddingApi(false);
    } catch (error) {
      console.error(error);
      showToast('Error al conectar línea API', 'error');
    }
  };

  const handleRemoveApiInternal = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta línea de WhatsApp?')) return;
    try {
      await axios.delete(`${API_URL}/channels/${id}`);
      onRemoveApi(id);
      showToast('Línea eliminada', 'info');
    } catch (error) {
      console.error(error);
      showToast('Error al eliminar línea', 'error');
    }
  };

  // TAG HANDLERS - Now with API persistence
  const handleSaveTag = async () => {
    if (!tagForm.name) return;

    try {
      if (editingTagId) {
        const res = await axios.put(`${API_URL}/tags/${editingTagId}`, {
          name: tagForm.name,
          color: tagForm.color
        });
        onSetAvailableTags(prev => prev.map(t => t.id === editingTagId ? res.data : t));
      } else {
        const res = await axios.post(`${API_URL}/tags`, {
          name: tagForm.name,
          color: tagForm.color || 'bg-gray-500'
        });
        onSetAvailableTags(prev => [...prev, res.data]);
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
      onSetAvailableTags(prev => prev.filter(t => t.id !== id));
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

  // QUICK REPLY HANDLERS - Now with API persistence
  const handleSaveQR = async () => {
    if (!qrForm.shortcut || !qrForm.content) return;

    try {
      const cleanShortcut = qrForm.shortcut.replace('/', '');

      if (editingQRId) {
        const res = await axios.put(`${API_URL}/quickreplies/${editingQRId}`, {
          shortcut: cleanShortcut,
          content: qrForm.content
        });
        onSetQuickReplies(prev => prev.map(qr => qr.id === editingQRId ? res.data : qr));
      } else {
        const res = await axios.post(`${API_URL}/quickreplies`, {
          shortcut: cleanShortcut,
          content: qrForm.content
        });
        onSetQuickReplies(prev => [...prev, res.data]);
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
      onSetQuickReplies(prev => prev.filter(q => q.id !== id));
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

          {/* SECCIÓN: LÍNEAS API */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                <i className="fa-solid fa-plug-circle-check mr-2"></i> Líneas Conectadas
              </h2>
              <button onClick={() => setIsAddingApi(true)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-green-600 transition-colors">
                <i className="fa-solid fa-plus-circle"></i>
              </button>
            </div>
            <div className="bg-white rounded-[32px] border border-gray-200 p-6 space-y-3 shadow-sm min-h-[300px]">
              {businessApis.map(api => (
                <div key={api.id} className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${api.id === currentApiId ? 'border-green-500 bg-green-50/30' : 'border-gray-50'}`}>
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${api.id.startsWith('meta_') ? 'bg-[#1877F2] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <i className={api.id.startsWith('meta_') ? 'fa-brands fa-whatsapp' : 'fa-solid fa-phone text-[10px]'}></i>
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-black text-gray-900 truncate">{api.name}</div>
                      <div className="text-[9px] font-mono text-gray-400">{api.phoneNumber}</div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => onSetCurrentApi(api.id)} disabled={api.id === currentApiId} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-green-600 transition-colors disabled:text-green-500">
                      <i className="fa-solid fa-circle-check"></i>
                    </button>
                    <button onClick={() => handleRemoveApiInternal(api.id)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                      <i className="fa-solid fa-trash-can text-[10px]"></i>
                    </button>
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
            <i className="fa-solid fa-circle-info text-sm"></i>
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
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

      {/* MODAL AÑADIR API MANUAL */}
      {isAddingApi && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[210] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">Añadir Línea Manual</h3>
              <button onClick={() => setIsAddingApi(false)} className="text-gray-400"><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="p-8 space-y-4">
              <input type="text" placeholder="Alias (Ej: Ventas)" className="w-full bg-gray-100 rounded-xl p-4 text-xs font-bold" value={newApi.name} onChange={e => setNewApi({ ...newApi, name: e.target.value })} />
              <input type="text" placeholder="Número (+1 234...)" className="w-full bg-gray-100 rounded-xl p-4 text-xs font-mono" value={newApi.phoneNumber} onChange={e => setNewApi({ ...newApi, phoneNumber: e.target.value })} />
              <input type="text" placeholder="Phone ID (Meta)" className="w-full bg-gray-100 rounded-xl p-4 text-xs font-mono" value={newApi.phoneId} onChange={e => setNewApi({ ...newApi, phoneId: e.target.value })} />
              <input type="password" placeholder="Access Token (Meta)" className="w-full bg-gray-100 rounded-xl p-4 text-xs font-mono" value={newApi.accessToken} onChange={e => setNewApi({ ...newApi, accessToken: e.target.value })} />

              <button onClick={handleAddApi} className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg mt-4">Vincular Canal</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsView;
