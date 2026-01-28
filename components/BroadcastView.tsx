
import React, { useState, useEffect } from 'react';
import { Broadcast } from '../types';
import axios from 'axios';
import io from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';

// Zustand Stores
import {
  useContactsStore,
  useChannelsStore,
  useAppStore,
  useBroadcastsStore,
  useTemplatesStore
} from '../stores';

const BroadcastView: React.FC = () => {
  // === ZUSTAND STORES ===
  const { contacts } = useContactsStore();
  const { channels, currentChannelId } = useChannelsStore();
  const { tags: availableTags } = useAppStore();
  const { broadcasts, fetchBroadcasts, addBroadcast, updateBroadcast, removeBroadcast } = useBroadcastsStore();
  const { templates, fetchTemplates } = useTemplatesStore();

  // Local state
  const [isCreating, setIsCreating] = useState(false);
  const [newBroadcast, setNewBroadcast] = useState<Partial<Broadcast> & { delayMin?: number; delayMax?: number }>({
    name: '',
    templateId: '',
    apiId: currentChannelId,
    targetTagId: undefined,
    scheduledTime: '',
    recipientsCount: 0,
    delayMin: 2,
    delayMax: 8
  });

  const getFilteredCount = (tagId?: string) => {
    if (!tagId) return contacts.length;
    return contacts.filter(c => c.tags.includes(tagId)).length;
  };

  // Fetch data on mount
  useEffect(() => {
    fetchBroadcasts();
    fetchTemplates();
  }, []);

  // Update default templateId when templates load
  useEffect(() => {
    if (templates.length > 0 && !newBroadcast.templateId) {
      setNewBroadcast(prev => ({ ...prev, templateId: templates[0].id }));
    }
  }, [templates]);

  // Update default apiId when channels change
  useEffect(() => {
    if (currentChannelId) {
      setNewBroadcast(prev => ({ ...prev, apiId: currentChannelId }));
    }
  }, [currentChannelId]);

  // Listen for real-time progress updates
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on('broadcast_progress', (data: { broadcastId: string; progress: number; sentCount: number; failedCount: number }) => {
      updateBroadcast({
        id: data.broadcastId,
        progress: data.progress,
        status: data.progress >= 100 ? 'SENT' : 'SENDING'
      } as Broadcast);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCreate = async () => {
    if (!newBroadcast.name || !newBroadcast.templateId || !newBroadcast.apiId) return;

    try {
      const res = await axios.post(`${API_URL}/broadcasts`, {
        name: newBroadcast.name,
        templateId: newBroadcast.templateId,
        channelId: newBroadcast.apiId,
        targetTagId: newBroadcast.targetTagId,
        scheduledTime: newBroadcast.scheduledTime || null,
        delayMin: newBroadcast.delayMin || 2,
        delayMax: newBroadcast.delayMax || 8
      });

      addBroadcast(res.data);
      setIsCreating(false);
      resetForm();
    } catch (error) {
      console.error('Error creating broadcast:', error);
      alert('Error al crear difusión');
    }
  };

  const resetForm = () => {
    setNewBroadcast({
      name: '',
      templateId: templates[0]?.id || '',
      apiId: currentChannelId,
      targetTagId: undefined,
      scheduledTime: '',
      recipientsCount: 0,
      delayMin: 2,
      delayMax: 8
    });
  };

  const startNow = async (id: string) => {
    try {
      // Optimistic update
      updateBroadcast({ id, status: 'SENDING', progress: 0 } as Broadcast);

      // Call API to start broadcast
      await axios.post(`${API_URL}/broadcasts/${id}/start`);
    } catch (error) {
      console.error('Error starting broadcast:', error);
      // Revert on error
      updateBroadcast({ id, status: 'SCHEDULED' } as Broadcast);
    }
  };

  const deleteBroadcast = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta difusión?')) return;

    try {
      await axios.delete(`${API_URL}/broadcasts/${id}`);
      removeBroadcast(id);
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      alert('Error al eliminar difusión');
    }
  };

  return (
    <div className="p-10 h-full overflow-y-auto bg-[#f8fafc]">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Difusiones</h1>
          <p className="text-gray-500 font-medium text-sm">Gestiona y segmenta tus envíos masivos por etiquetas de cliente.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-[20px] font-black uppercase text-xs tracking-[0.1em] transition-all shadow-xl shadow-green-100 hover:shadow-green-200 transform hover:-translate-y-1 active:scale-95 flex items-center"
        >
          <i className="fa-solid fa-plus-circle mr-3 text-lg"></i> Crear Difusión
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Campaña / Segmento</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Línea API</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Progreso</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Estado</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {broadcasts.length > 0 ? broadcasts.map(b => (
              <tr key={b.id} className="hover:bg-gray-50/30 transition-colors group">
                <td className="px-8 py-6">
                  <div className="font-bold text-gray-900 text-lg leading-tight mb-1">{b.name}</div>
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                      {b.recipientsCount} destinatarios
                    </span>
                    {b.targetTagId ? (
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md text-white shadow-sm flex items-center ${availableTags.find(t => t.id === b.targetTagId)?.color || 'bg-gray-400'}`}>
                        <i className="fa-solid fa-tag mr-1.5 text-[8px]"></i>
                        SEGMENTO: {availableTags.find(t => t.id === b.targetTagId)?.name.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2 py-1 rounded-md bg-gray-100 text-gray-500 uppercase border border-gray-200 flex items-center">
                        <i className="fa-solid fa-users mr-1.5 text-[8px]"></i>
                        AUDIENCIA TOTAL
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                      <i className="fa-solid fa-tower-broadcast text-xs"></i>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">{channels.find(a => a.id === b.apiId)?.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono tracking-tighter">{channels.find(a => a.id === b.apiId)?.phoneNumber}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col space-y-2 max-w-[140px]">
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200">
                      <div
                        className={`h-full transition-all duration-700 ${b.status === 'SENT' ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${b.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{b.progress}% Enviado</div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border ${b.status === 'SENT' ? 'bg-green-50 text-green-700 border-green-100' :
                    b.status === 'SENDING' ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse' :
                      'bg-yellow-50 text-yellow-700 border-yellow-100'
                    }`}>
                    {b.status === 'SCHEDULED' ? 'Programado' : b.status === 'SENDING' ? 'Enviando' : 'Completado'}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end items-center space-x-4">
                    {b.status === 'SCHEDULED' && (
                      <button onClick={() => startNow(b.id)} className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest transition-colors">Iniciar Envío</button>
                    )}
                    <button onClick={() => deleteBroadcast(b.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-xl hover:bg-red-50">
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="py-32 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                      <i className="fa-solid fa-bullhorn text-4xl text-gray-200"></i>
                    </div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-sm">No hay difusiones activas</p>
                    <button onClick={() => setIsCreating(true)} className="mt-4 text-green-600 font-bold hover:underline text-xs uppercase tracking-widest">Crear mi primera campaña</button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: CREAR DIFUSIÓN */}
      {isCreating && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] p-6 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 transform transition-all animate-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Configurar Difusión</h2>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Paso a paso para el envío masivo</p>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-gray-100 text-gray-400 hover:text-gray-900 hover:shadow-md transition-all"
              >
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Name Input */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">1. Nombre de la Campaña</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border-2 border-transparent rounded-[20px] p-5 focus:ring-0 focus:border-green-500 transition-all font-bold text-gray-800 placeholder:text-gray-300"
                  placeholder="Ej: Promoción Black Friday 2025"
                  value={newBroadcast.name}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, name: e.target.value })}
                />
              </div>

              {/* API & Template Row */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">2. Línea de Salida</label>
                  <div className="relative">
                    <select
                      className="w-full bg-gray-50 border-2 border-transparent rounded-[20px] p-5 font-bold text-gray-700 focus:ring-0 focus:border-green-500 appearance-none cursor-pointer"
                      value={newBroadcast.apiId}
                      onChange={(e) => setNewBroadcast({ ...newBroadcast, apiId: e.target.value })}
                    >
                      {channels.map(api => (
                        <option key={api.id} value={api.id}>{api.id === currentChannelId ? '★ ' : ''}{api.name}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">3. Plantilla</label>
                  <div className="relative">
                    <select
                      className="w-full bg-gray-50 border-2 border-transparent rounded-[20px] p-5 font-bold text-gray-700 focus:ring-0 focus:border-green-500 appearance-none cursor-pointer"
                      value={newBroadcast.templateId}
                      onChange={(e) => setNewBroadcast({ ...newBroadcast, templateId: e.target.value })}
                    >
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
                  </div>
                </div>
              </div>

              {/* Segmentation Tags */}
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">4. Segmentación por Etiqueta</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setNewBroadcast({ ...newBroadcast, targetTagId: undefined })}
                    className={`p-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all border-2 flex flex-col items-center justify-center space-y-2 ${!newBroadcast.targetTagId ? 'bg-gray-900 text-white border-gray-900 shadow-xl scale-105' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                  >
                    <i className="fa-solid fa-users text-lg"></i>
                    <span>TODOS ({contacts.length})</span>
                  </button>
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => setNewBroadcast({ ...newBroadcast, targetTagId: tag.id })}
                      className={`p-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all border-2 flex flex-col items-center justify-center space-y-2 ${newBroadcast.targetTagId === tag.id ? `${tag.color} text-white border-transparent shadow-xl scale-105` : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                    >
                      <i className="fa-solid fa-tag text-lg"></i>
                      <span>{tag.name} ({getFilteredCount(tag.id)})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule Input */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">5. Programación</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    className="w-full bg-gray-100 border-none rounded-[20px] p-5 focus:ring-2 focus:ring-green-500 font-bold text-gray-700"
                    value={newBroadcast.scheduledTime}
                    onChange={(e) => setNewBroadcast({ ...newBroadcast, scheduledTime: e.target.value })}
                  />
                  <div className="absolute top-1/2 right-6 -translate-y-1/2 pointer-events-none text-gray-400">
                    <i className="fa-regular fa-clock"></i>
                  </div>
                </div>
                <p className="text-[9px] text-blue-500 font-black uppercase tracking-[0.1em] mt-2 ml-1 italic flex items-center">
                  <i className="fa-solid fa-info-circle mr-1.5"></i> Si el campo está vacío, la difusión iniciará inmediatamente.
                </p>
              </div>

              {/* Delay Configuration */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">6. Delay Aleatorio (Anti-Bloqueo)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      className="w-full bg-gray-50 border-2 border-transparent rounded-[20px] p-5 focus:ring-0 focus:border-green-500 font-bold text-gray-700 text-center"
                      value={newBroadcast.delayMin || 2}
                      onChange={(e) => setNewBroadcast({ ...newBroadcast, delayMin: parseInt(e.target.value) || 2 })}
                    />
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 font-black uppercase">Mínimo (seg)</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      className="w-full bg-gray-50 border-2 border-transparent rounded-[20px] p-5 focus:ring-0 focus:border-green-500 font-bold text-gray-700 text-center"
                      value={newBroadcast.delayMax || 8}
                      onChange={(e) => setNewBroadcast({ ...newBroadcast, delayMax: parseInt(e.target.value) || 8 })}
                    />
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 font-black uppercase">Máximo (seg)</span>
                  </div>
                </div>
                <p className="text-[9px] text-orange-500 font-black uppercase tracking-[0.1em] mt-2 ml-1 italic flex items-center">
                  <i className="fa-solid fa-shield-halved mr-1.5"></i> El sistema esperará un tiempo aleatorio entre estos valores por cada mensaje.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-10 bg-gray-50/50 border-t flex flex-col space-y-4">
              <button
                onClick={handleCreate}
                disabled={!newBroadcast.name}
                className="w-full py-6 bg-green-600 hover:bg-green-700 text-white rounded-[24px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-green-100 transition transform active:scale-95 disabled:bg-gray-300 disabled:shadow-none text-sm"
              >
                Confirmar y Programar
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-900 transition-colors py-2"
              >
                Cancelar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BroadcastView;
