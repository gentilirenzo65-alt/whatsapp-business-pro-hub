
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/chats', icon: 'fa-message', label: 'Chats', matchPaths: ['/chats', '/chat/'] },
    { path: '/templates', icon: 'fa-file-invoice', label: 'Templates', matchPaths: ['/templates'] },
    { path: '/broadcasts', icon: 'fa-bullhorn', label: 'Broadcasts', matchPaths: ['/broadcasts'] },
    { path: '/analytics', icon: 'fa-chart-line', label: 'Analytics', matchPaths: ['/analytics'] },
    { path: '/settings', icon: 'fa-cog', label: 'Settings', matchPaths: ['/settings'] },
  ];

  const isActive = (item: typeof menuItems[0]) => {
    return item.matchPaths.some(p => location.pathname.startsWith(p));
  };

  return (
    <div className="w-16 md:w-20 bg-[#f0f2f5] border-r flex flex-col items-center py-4 space-y-6">
      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white mb-4">
        <i className="fa-brands fa-whatsapp text-2xl"></i>
      </div>

      {menuItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={`group flex flex-col items-center p-2 rounded-lg transition-colors ${isActive(item) ? 'text-green-600' : 'text-gray-500 hover:bg-gray-200'
            }`}
          title={item.label}
        >
          <i className={`fa-solid ${item.icon} text-xl mb-1`}></i>
          <span className="text-[10px] font-medium uppercase">{item.label}</span>
        </NavLink>
      ))}

      <div className="mt-auto pb-4 text-[9px] font-mono text-gray-300 select-none">
        v1.5
      </div>
    </div>
  );
};

export default Sidebar;
