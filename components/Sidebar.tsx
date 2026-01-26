
import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const menuItems = [
    { id: 'CHATS' as AppView, icon: 'fa-message', label: 'Chats' },
    { id: 'TEMPLATES' as AppView, icon: 'fa-file-invoice', label: 'Templates' },
    { id: 'BROADCASTS' as AppView, icon: 'fa-bullhorn', label: 'Broadcasts' },
    { id: 'SETTINGS' as AppView, icon: 'fa-cog', label: 'Settings' },
  ];

  return (
    <div className="w-16 md:w-20 bg-[#f0f2f5] border-r flex flex-col items-center py-4 space-y-6">
      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white mb-4">
        <i className="fa-brands fa-whatsapp text-2xl"></i>
      </div>
      
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`group flex flex-col items-center p-2 rounded-lg transition-colors ${
            activeView === item.id ? 'text-green-600' : 'text-gray-500 hover:bg-gray-200'
          }`}
          title={item.label}
        >
          <i className={`fa-solid ${item.icon} text-xl mb-1`}></i>
          <span className="text-[10px] font-medium uppercase">{item.label}</span>
        </button>
      ))}

      <div className="mt-auto pb-4">
         {/* Imagen de perfil eliminada por solicitud del usuario */}
      </div>
    </div>
  );
};

export default Sidebar;
