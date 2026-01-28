
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

interface Analytics {
    messages: {
        today: number;
        week: number;
        month: number;
        total: number;
        inbound: number;
        outbound: number;
        byStatus: { sent: number; delivered: number; read: number; failed: number };
    };
    contacts: {
        total: number;
        top5: Array<{ id: string; name: string; phone: string; avatar: string; messageCount: number }>;
    };
    broadcasts: {
        sent: number;
        failed: number;
        scheduled: number;
    };
    performance: {
        avgResponseTimeMinutes: number;
    };
}

const AnalyticsView: React.FC = () => {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/analytics`);
            setAnalytics(res.data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching analytics:', err);
            setError('Error al cargar estadísticas');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-[#f8fafc]">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-green-100 border-t-green-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-bold uppercase text-sm tracking-wide">Cargando métricas...</p>
                </div>
            </div>
        );
    }

    if (error || !analytics) {
        return (
            <div className="flex items-center justify-center h-full bg-[#f8fafc]">
                <div className="text-center">
                    <i className="fa-solid fa-circle-exclamation text-4xl text-red-400 mb-4"></i>
                    <p className="text-gray-600 font-bold">{error || 'Sin datos'}</p>
                    <button onClick={fetchAnalytics} className="mt-4 bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700">
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    // Helper for percentage bar
    const PercentageBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
        const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
        return (
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
            </div>
        );
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-[#f8fafc]">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Analytics</h1>
                    <p className="text-gray-500 font-medium text-sm">Métricas y estadísticas de tu negocio</p>
                </div>
                <button
                    onClick={fetchAnalytics}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-wide transition-all flex items-center"
                >
                    <i className="fa-solid fa-arrows-rotate mr-2"></i> Actualizar
                </button>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {/* Mensajes Hoy */}
                <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                            <i className="fa-solid fa-message text-green-600 text-xl"></i>
                        </div>
                        <span className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase">Hoy</span>
                    </div>
                    <h3 className="text-4xl font-black text-gray-900 mb-1">{analytics.messages.today}</h3>
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-wide">Mensajes</p>
                </div>

                {/* Mensajes Semana */}
                <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <i className="fa-solid fa-calendar-week text-blue-600 text-xl"></i>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">7 días</span>
                    </div>
                    <h3 className="text-4xl font-black text-gray-900 mb-1">{analytics.messages.week}</h3>
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-wide">Mensajes</p>
                </div>

                {/* Total Contactos */}
                <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                            <i className="fa-solid fa-users text-purple-600 text-xl"></i>
                        </div>
                        <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-full uppercase">Total</span>
                    </div>
                    <h3 className="text-4xl font-black text-gray-900 mb-1">{analytics.contacts.total}</h3>
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-wide">Contactos</p>
                </div>

                {/* Tiempo Respuesta */}
                <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                            <i className="fa-solid fa-clock text-orange-600 text-xl"></i>
                        </div>
                        <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase">Promedio</span>
                    </div>
                    <h3 className="text-4xl font-black text-gray-900 mb-1">
                        {analytics.performance.avgResponseTimeMinutes}<span className="text-xl text-gray-400 ml-1">min</span>
                    </h3>
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-wide">Tiempo Respuesta</p>
                </div>
            </div>

            {/* Second Row: Detailed Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                {/* Mensajes Inbound vs Outbound */}
                <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100">
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-6">Flujo de Mensajes</h4>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-gray-600 flex items-center">
                                    <i className="fa-solid fa-arrow-down text-green-500 mr-2"></i> Entrantes
                                </span>
                                <span className="text-sm font-black text-gray-800">{analytics.messages.inbound}</span>
                            </div>
                            <PercentageBar value={analytics.messages.inbound} max={analytics.messages.total} color="bg-green-500" />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-gray-600 flex items-center">
                                    <i className="fa-solid fa-arrow-up text-blue-500 mr-2"></i> Salientes
                                </span>
                                <span className="text-sm font-black text-gray-800">{analytics.messages.outbound}</span>
                            </div>
                            <PercentageBar value={analytics.messages.outbound} max={analytics.messages.total} color="bg-blue-500" />
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase">Total Histórico</span>
                            <span className="text-lg font-black text-gray-800">{analytics.messages.total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Estado de Mensajes */}
                <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100">
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-6">Estado de Entrega</h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-2xl p-4 text-center">
                            <i className="fa-solid fa-paper-plane text-gray-400 text-lg mb-2"></i>
                            <p className="text-2xl font-black text-gray-800">{analytics.messages.byStatus.sent}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Enviados</p>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-4 text-center">
                            <i className="fa-solid fa-check text-blue-500 text-lg mb-2"></i>
                            <p className="text-2xl font-black text-blue-600">{analytics.messages.byStatus.delivered}</p>
                            <p className="text-[10px] font-bold text-blue-400 uppercase">Entregados</p>
                        </div>
                        <div className="bg-green-50 rounded-2xl p-4 text-center">
                            <i className="fa-solid fa-check-double text-green-500 text-lg mb-2"></i>
                            <p className="text-2xl font-black text-green-600">{analytics.messages.byStatus.read}</p>
                            <p className="text-[10px] font-bold text-green-400 uppercase">Leídos</p>
                        </div>
                        <div className="bg-red-50 rounded-2xl p-4 text-center">
                            <i className="fa-solid fa-xmark text-red-500 text-lg mb-2"></i>
                            <p className="text-2xl font-black text-red-600">{analytics.messages.byStatus.failed}</p>
                            <p className="text-[10px] font-bold text-red-400 uppercase">Fallidos</p>
                        </div>
                    </div>
                </div>

                {/* Broadcasts */}
                <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100">
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-6">Campañas Broadcast</h4>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl">
                            <div className="flex items-center">
                                <i className="fa-solid fa-circle-check text-green-600 text-xl mr-3"></i>
                                <span className="font-bold text-gray-700">Enviadas</span>
                            </div>
                            <span className="text-2xl font-black text-green-600">{analytics.broadcasts.sent}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-2xl">
                            <div className="flex items-center">
                                <i className="fa-solid fa-clock text-yellow-600 text-xl mr-3"></i>
                                <span className="font-bold text-gray-700">Programadas</span>
                            </div>
                            <span className="text-2xl font-black text-yellow-600">{analytics.broadcasts.scheduled}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl">
                            <div className="flex items-center">
                                <i className="fa-solid fa-circle-xmark text-red-600 text-xl mr-3"></i>
                                <span className="font-bold text-gray-700">Fallidas</span>
                            </div>
                            <span className="text-2xl font-black text-red-600">{analytics.broadcasts.failed}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Contacts */}
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100">
                <h4 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-6">
                    <i className="fa-solid fa-trophy text-yellow-500 mr-2"></i> Top 5 Contactos Más Activos
                </h4>

                {analytics.contacts.top5.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Sin datos de contactos aún</p>
                ) : (
                    <div className="space-y-3">
                        {analytics.contacts.top5.map((contact, index) => (
                            <div key={contact.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                                <div className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 font-black text-sm ${index === 0 ? 'bg-yellow-400 text-white' :
                                            index === 1 ? 'bg-gray-300 text-white' :
                                                index === 2 ? 'bg-orange-400 text-white' :
                                                    'bg-gray-200 text-gray-600'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <img
                                        src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`}
                                        alt={contact.name}
                                        className="w-10 h-10 rounded-full mr-3 border-2 border-white shadow"
                                    />
                                    <div>
                                        <p className="font-bold text-gray-800">{contact.name}</p>
                                        <p className="text-xs text-gray-400">{contact.phone}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-green-600">{contact.messageCount}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">mensajes</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsView;
