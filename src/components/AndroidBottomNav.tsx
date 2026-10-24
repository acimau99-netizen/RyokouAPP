import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck2,
  Compass,
  Wrench,
  Bike,
  Settings,
  Users,
  Navigation,
} from 'lucide-react';
import { AppUser } from '../types/ryoko';
import { getUserEffectivePermissions } from '../utils/userPermissions';

export type ActiveNavTab =
  | 'dashboard'
  | 'bookings'
  | 'tracking'
  | 'service'
  | 'fleet'
  | 'settings'
  | 'users'
  | 'courier';

interface AndroidBottomNavProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  pendingCount: number;
  activeRentalsCount: number;
  repairCount: number;
  activeUser?: AppUser;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeTab,
  onSelectTab,
  pendingCount,
  activeRentalsCount,
  repairCount,
  activeUser,
}) => {
  const permissions = getUserEffectivePermissions(activeUser);
  const isCourier = activeUser?.role === 'kurir';

  // Build tabs dynamically based on user role and permissions
  let tabs: Array<{
    id: ActiveNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: number;
    badgeColor?: string;
  }> = [];

  if (isCourier) {
    // Mode Kurir: Khusus Tugas Antar/Jemput & Unit Motor Kurir
    tabs = [
      {
        id: 'courier',
        label: 'Tugas Kurir',
        icon: Navigation,
        badge: pendingCount + activeRentalsCount,
        badgeColor: 'bg-amber-500 text-slate-950',
      },
      {
        id: 'tracking',
        label: 'Motor Kurir',
        icon: Bike,
        badge: 0,
      },
    ];
  } else {
    // Standard / Admin / Operator Tabs
    tabs = [
      {
        id: 'dashboard',
        label: 'Beranda',
        icon: LayoutDashboard,
        badge: 0,
      },
    ];

    if (permissions.canManageBookings) {
      tabs.push({
        id: 'bookings',
        label: 'Penyewaan',
        icon: CalendarCheck2,
        badge: pendingCount,
        badgeColor: 'bg-amber-500 text-slate-950',
      });
    }

    if (permissions.canManageTracking) {
      tabs.push({
        id: 'tracking',
        label: 'Lacak',
        icon: Compass,
        badge: 0,
      });
    }

    if (permissions.canManageService) {
      tabs.push({
        id: 'service',
        label: 'Servis',
        icon: Wrench,
        badge: repairCount > 0 ? repairCount : 0,
        badgeColor: 'bg-amber-500 text-slate-950',
      });
    }

    // Armada: visible to admin, operator, and custom admin with canManageFleet
    if (activeUser?.role === 'administrator' || activeUser?.role === 'operator' || permissions.canManageFleet) {
      tabs.push({
        id: 'fleet',
        label: 'Armada',
        icon: Bike,
        badge: 0,
      });
    }

    // User Management: visible to Administrator or custom admin with canManageUsers
    if (activeUser?.role === 'administrator' || permissions.canManageUsers) {
      tabs.push({
        id: 'users',
        label: 'Pengguna',
        icon: Users,
        badge: 0,
      });
    }

    // Settings: visible to Administrator or custom admin with canManageSettings
    if (activeUser?.role === 'administrator' || permissions.canManageSettings) {
      tabs.push({
        id: 'settings',
        label: 'Pengaturan',
        icon: Settings,
        badge: 0,
      });
    }
  }

  return (
    <nav className="bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 px-1 py-1 sm:py-1.5 flex items-center justify-around select-none z-20 shrink-0 overflow-x-auto">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex-1 min-w-[56px] py-1.5 px-1 flex flex-col items-center justify-center relative transition-all duration-150 rounded-xl ${
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
