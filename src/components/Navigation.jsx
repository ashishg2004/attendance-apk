import React from 'react';
import { Home, Users, Wallet, History, BarChart3 } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'today', label: 'Home', icon: Home },
    { id: 'labour', label: 'Staff', icon: Users },
    { id: 'accounts', label: 'Accounts', icon: Wallet },
    { id: 'history', label: 'History', icon: History },
    { id: 'summary', label: 'Summary', icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
      <div className="bg-white/95 backdrop-blur-2xl border border-[#EFEAE1] rounded-[28px] p-2 shadow-xl shadow-[#1E382B]/10 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex items-center justify-center py-2.5 px-3 rounded-2xl transition-all duration-300 tactile-btn ${
                isActive
                  ? 'bg-[#1E382B] text-white shadow-md font-extrabold gap-1.5'
                  : 'text-[#6A7E72] hover:text-[#1E382B] font-semibold flex-col gap-0.5'
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
              <span className={`text-[11px] tracking-tight ${isActive ? 'inline' : 'block text-[10px]'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
