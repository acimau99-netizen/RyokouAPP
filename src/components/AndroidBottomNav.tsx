import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck2,
  Compass,
  Bike,
  Settings,
} from 'lucide-react';

export type ActiveNavTab = 'dashboard' | 'bookings' | 'tracking' | 'fleet' | 'settings';

interface AndroidBottomNavProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  pendingCount: number;
  activeRentalsCount: number;
  repairCount: number;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeTab,
  onSelectTab,
  pendingCount,
  activeRentalsCount,
  repairCount,
}) => {
  const tabs = [
    {
      id: 'dashboard' as ActiveNavTab,
      label: 'Beranda',
      icon: LayoutDashboard,
      badge: 0,
    },
    {
      id: 'bookings' as ActiveNavTab,
      label: 'Penyewaan',
      icon: CalendarCheck2,
      badge: pendingCount, // show pending approval count
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    {
      id: 'tracking' as ActiveNavTab,
      label: 'Lacak Unit',
      icon: Compass,
      badge: repairCount > 0 ? repairCount : 0,
      badgeColor: 'bg-yellow-500 text-slate-950',
    },
    {
      id: 'fleet' as ActiveNavTab,
      label: 'Armada & Tarif',
      icon: Bike,
      badge: 0,
    },
    {
      id: 'settings' as ActiveNavTab,
      label: 'Pengaturan',
      icon: Settings,
      badge: 0,
    },
  ];

  return (
    <nav className="bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 px-1 py-1 sm:py-1.5 flex items-center justify-around select-none z-20 shrink-0">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center relative transition-all duration-150 rounded-xl ${
              isActive
                ? 'text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {/* Active Pill Glow Indicator */}
            {isActive && (
              <span className="absolute top-0 w-8 h-1 bg-cyan-400 rounded-full shadow-sm shadow-cyan-400/50" />
            )}

            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-cyan-400' : ''}`} />
              {tab.badge > 0 && (
                <span
                  className={`absolute -top-1.5 -right-2 text-[10px] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-slate-950 ${
                    tab.badgeColor || 'bg-cyan-500 text-slate-950'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </div>

            <span className={`text-[10px] mt-1 tracking-tight truncate max-w-full ${isActive ? 'text-cyan-300' : 'text-slate-400'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
