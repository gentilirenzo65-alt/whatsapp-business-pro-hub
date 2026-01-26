
import React, { useState, useRef } from 'react';
import { Template } from '../types';
import axios from 'axios';
import { API_URL } from '../config';

interface TemplateViewProps {
  templates: Template[];
  onUpdateTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
}

const TemplateView: React.FC<TemplateViewProps> = ({ templates, onUpdateTemplates }) => {
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [newTemplateForm, setNewTemplateForm] = useState<Partial<Template>>({
    name: '',
    category: 'UTILITY',
    content: '',
    language: 'es',
    status: 'PENDING'
  });

  // FETCH TEMPLATES ON MOUNT
  React.useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API_URL}/templates`);
      onUpdateTemplates(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate) return;

    setIsSyncing(true);
    try {
      await axios.put(`${API_URL}/templates/${editingTemplate.id}`, {
        name: editingTemplate.name,
        category: editingTemplate.category,
        content: editingTemplate.content,
        language: editingTemplate.language
      });

      onUpdateTemplates(prev => prev.map(t => t.id === editingTemplate.id ? editingTemplate : t));
      setEditingTemplate(null);
    } catch (error: any) {
      console.error(error);
      alert(`Error al guardar plantilla: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreate = async () => {
    if (!newTemplateForm.name || !newTemplateForm.content) return;

    setIsSyncing(true);

    try {
      const payload = {
        name: newTemplateForm.name,
        category: newTemplateForm.category,
        content: newTemplateForm.content,
        language: newTemplateForm.language
      };

      const res = await axios.post(`${API_URL}/templates`, payload);
      const created = res.data;

      onUpdateTemplates(prev => [created, ...prev]);
      setIsCreating(false);
      setNewTemplateForm({ name: '', category: 'UTILITY', content: '', language: 'es', status: 'PENDING' });

      // Polling status or just letting user know
      if (created.status === 'REJECTED') {
        alert('Plantilla rechazada por Meta. Revisa el contenido.');
      }

    } catch (error: any) {
      console.error(error);
      alert(`Error al crear plantilla: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // AI improvement disabled - Gemini service removed
  const handleImproveContent = async (isEditing: boolean) => {
    alert('La mejora con IA no está disponible. El servicio Gemini fue deshabilitado.');
  };

  const insertVariable = (num: number, isEditing: boolean) => {
    const variable = `{{${num}}}`;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = isEditing ? editingTemplate?.content || '' : newTemplateForm.content || '';

    const newText = currentText.substring(0, start) + variable + currentText.substring(end);

    if (isEditing && editingTemplate) {
      setEditingTemplate({ ...editingTemplate, content: newText });
    } else {
      setNewTemplateForm({ ...newTemplateForm, content: newText });
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla? Esta acción no se puede deshacer.')) return;

    try {
      await axios.delete(`${API_URL}/templates/${id}`);
      onUpdateTemplates(prev => prev.filter(t => t.id !== id));
    } catch (error: any) {
      console.error(error);
      alert(`Error al eliminar plantilla: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-[#f8fafc]">
      <div className="flex justify-between items-center mb-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Plantillas Oficiales</h1>
          <p className="text-gray-500 font-medium text-sm">Gestiona tus mensajes HSM (High Security Message) aprobados por Meta.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-[20px] font-black uppercase text-xs tracking-[0.1em] transition-all shadow-xl shadow-green-100 transform hover:-translate-y-1 active:scale-95 flex items-center"
        >
          <i className="fa-solid fa-plus-circle mr-3 text-lg"></i> Crear para Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {templates.map(template => (
          <div key={template.id} className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all group relative flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
              <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${template.category === 'MARKETING' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                template.category === 'UTILITY' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-600 border border-gray-100'
                }`}>
                {template.category}
              </span>
              <div className="flex flex-col items-end">
                <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border ${template.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-100' :
                  template.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                  }`}>
                  {template.status === 'APPROVED' ? 'Aprobada' : template.status === 'REJECTED' ? 'Rechazada' : 'En Revisión'}
                </span>
                <span className="text-[8px] font-bold text-gray-300 mt-1 uppercase">Meta ID: {template.id}</span>
              </div>
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-4 line-clamp-1">{template.name}</h3>

            <div className="flex-1">
              <div className="bg-gray-50 rounded-2xl p-5 border-l-4 border-green-500 relative group-hover:bg-green-50/30 transition-colors">
                <i className="fa-solid fa-quote-left absolute -top-2 -left-2 text-green-200 text-xl"></i>
                <p className="text-gray-600 text-sm italic leading-relaxed line-clamp-4">
                  {template.content}
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-8">
              <button
                onClick={() => setEditingTemplate(template)}
                className="flex-1 bg-gray-900 text-white px-4 py-4 rounded-[18px] text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition shadow-lg active:scale-95"
              >
                Ver / Editar
              </button>
              <button
                onClick={() => deleteTemplate(template.id)}
                className="w-12 h-12 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-[18px] transition-colors"
                title="Eliminar de Meta"
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: CREAR/EDITAR PLANTILLA */}
      {(editingTemplate || isCreating) && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 animate-in zoom-in duration-300 relative">

            {isSyncing && (
              <div className="absolute inset-0 bg-white/80 z-[110] flex flex-col items-center justify-center backdrop-blur-sm">
                <div className="w-20 h-20 border-4 border-green-100 border-t-green-600 rounded-full animate-spin mb-6"></div>
                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Sincronizando con Meta</h3>
                <p className="text-sm font-bold text-gray-400 mt-2">Enviando datos al servidor oficial de WhatsApp...</p>
              </div>
            )}

            <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight uppercase">
                  {isCreating ? 'Crear para Meta API' : `Detalles: ${editingTemplate?.name}`}
                </h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Las plantillas requieren aprobación oficial</p>
              </div>
              <button onClick={() => { setEditingTemplate(null); setIsCreating(false); }} className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-gray-100 text-gray-400 hover:text-gray-900 hover:shadow-md transition-all">
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>

            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre (Solo minúsculas y _)</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 font-bold text-gray-800 focus:border-green-500 transition-all placeholder:text-gray-300"
                    placeholder="ej: promo_verano_2025"
                    value={isCreating ? newTemplateForm.name : editingTemplate?.name}
                    onChange={(e) => isCreating
                      ? setNewTemplateForm({ ...newTemplateForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })
                      : setEditingTemplate({ ...editingTemplate!, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoría Oficial</label>
                  <select
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 font-bold text-gray-800 focus:border-green-500 appearance-none cursor-pointer"
                    value={isCreating ? newTemplateForm.category : editingTemplate?.category}
                    onChange={(e) => isCreating
                      ? setNewTemplateForm({ ...newTemplateForm, category: e.target.value as any })
                      : setEditingTemplate({ ...editingTemplate!, category: e.target.value as any })
                    }
                  >
                    <option value="MARKETING">Marketing (Promociones)</option>
                    <option value="UTILITY">Utilidad (Actualizaciones)</option>
                    <option value="AUTHENTICATION">Autenticación (OTP)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cuerpo del Mensaje</label>
                    <div className="flex items-center space-x-2 bg-white border border-gray-200 p-1.5 rounded-xl shadow-sm">
                      <span className="text-[9px] font-black text-gray-400 uppercase ml-2 mr-1 tracking-tighter">Variables:</span>
                      {[1, 2, 3, 4].map(num => (
                        <button
                          key={num}
                          onClick={() => insertVariable(num, !isCreating)}
                          className="px-3 py-1 bg-green-50 text-green-600 border border-green-100 rounded-lg text-[10px] font-black hover:bg-green-600 hover:text-white transition-all transform active:scale-90"
                        >
                          {`{{${num}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleImproveContent(!isCreating)}
                    disabled={isImproving}
                    className="text-[10px] font-black text-green-600 hover:text-green-800 flex items-center uppercase tracking-widest bg-green-50 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 border border-green-100 shadow-sm"
                  >
                    <i className={`fa-solid ${isImproving ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} mr-2`}></i>
                    Pulir con IA
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    rows={6}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-3xl p-6 font-medium text-gray-800 focus:border-green-500 transition-all shadow-inner resize-none"
                    placeholder="Escribe tu mensaje... Hola {{1}}, gracias por..."
                    value={isCreating ? newTemplateForm.content : editingTemplate?.content}
                    onChange={(e) => isCreating
                      ? setNewTemplateForm({ ...newTemplateForm, content: e.target.value })
                      : setEditingTemplate({ ...editingTemplate!, content: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="p-10 bg-gray-50/50 border-t flex flex-col space-y-4">
              <button
                onClick={isCreating ? handleCreate : handleSaveEdit}
                className="w-full py-6 bg-green-600 hover:bg-green-700 text-white rounded-[24px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-green-100 transition transform active:scale-95"
              >
                {isCreating ? 'Enviar a Revisión de Meta' : 'Guardar Cambios Localmente'}
              </button>
              <p className="text-[9px] text-gray-400 font-bold text-center uppercase tracking-widest">
                <i className="fa-solid fa-shield-halved mr-1"></i> Al crear, Meta revisará el contenido automáticamente (aprox. 5 min).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateView;
