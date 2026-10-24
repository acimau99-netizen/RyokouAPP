import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Monitor,
  ShieldCheck,
  Bell,
  ChevronDown,
  Users,
  Check,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppUser } from '../types/ryoko';
import { ROLE_LABELS, getUserEffectivePermissions } from '../utils/userPermissions';

interface AndroidTopBarProps {
  pendingBookingsCount: number;
  activeDisewaCount: number;
  isMobileDeviceView: boolean;
  activeUser: AppUser;
  allUsers: AppUser[];
  onSwitchUser: (userId: string) => void;
  onOpenUserManagement?: () => void;
  onToggleDeviceView: () => void;
  onOpenNewBooking: () => void;
  onOpenInstallGuide: () => void;
  onOpenRecoveryWizard?: () => void;
}

export const AndroidTopBar: React.FC<AndroidTopBarProps> = ({
  pendingBookingsCount,
  activeDisewaCount,
  isMobileDeviceView,
  activeUser,
  allUsers,
  onSwitchUser,
  onOpenUserManagement,
  onToggleDeviceView,
  onOpenNewBooking,
  onOpenInstallGuide,
  onOpenRecoveryWizard,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const permissions = getUserEffectivePermissions(activeUser);
  const isCourier = activeUser.role === 'kurir';

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      onOpenInstallGuide();
    }
  };

  const handleSelectUser = (id: string) => {
    onSwitchUser(id);
    setIsSwitcherOpen(false);
  };

  return (
    <>
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-2.5 py-2 sm:px-4 sm:py-2.5 sticky top-0 z-20 flex items-center justify-between gap-2">
        {/* Brand & User Profile Trigger */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-emerald-500 p-0.5 shadow-md shadow-cyan-950/40 shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="text-sm select-none">🛵</span>
            </div>
          </div>

          {/* Quick User Switcher Button */}
          <button
            onClick={() => setIsSwitcherOpen(true)}
            className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 hover:border-slate-600 rounded-xl px-2 py-1 text-left transition active:scale-95 min-w-0"
            title="Klik untuk beralih profil peran pengguna (Admin / Custom / Operator / Kurir)"
          >
            <span className="text-sm select-none shrink-0">{activeUser.avatarIcon || '👤'}</span>
            <div className="min-w-0 hidden xs:block">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-white truncate max-w-[90px] sm:max-w-[120px]">
                  {activeUser.nama}
                </span>
                <span className={`text-[9px] font-bold px-1 rounded border uppercase ${ROLE_LABELS[activeUser.role]?.badgeColor || ''}`}>
                  {activeUser.role === 'admin_custom' ? 'Custom' : activeUser.role}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Pending Alerts Indicator (Hidden for Kurir) */}
          {!isCourier && pendingBookingsCount > 0 && (
            <div
              className="flex items-center gap-1 text-xs bg-amber-950/60 border border-amber-700/50 text-amber-300 px-2 py-1 rounded-lg font-medium"
              title={`${pendingBookingsCount} booking baru menunggu approval`}
            >
              <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span className="font-bold">{pendingBookingsCount}</span>
            </div>
          )}

          {/* Device Frame Viewport Toggle (Desktop preview feature) */}
          <button
            onClick={onToggleDeviceView}
            className="hidden md:flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1.5 rounded-lg transition"
            title={isMobileDeviceView ? 'Beralih ke Tampilan Lebar' : 'Beralih ke Simulasi HP Android'}
          >
            {isMobileDeviceView ? (
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            )}
          </button>

          {/* ZLCE Recovery Wizard Button (Only if allowed) */}
          {permissions.canAccessRecovery && onOpenRecoveryWizard && (
            <button
              onClick={onOpenRecoveryWizard}
              className="hidden sm:flex items-center gap-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-cyan-800/60 text-cyan-300 px-2 py-1.5 rounded-lg transition"
              title="Buka Wizard ZLCE Recovery Snapshot"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Recovery</span>
            </button>
          )}

          {/* APK / PWA Install Button */}
          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="hidden xs:flex items-center gap-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold px-2 py-1.5 rounded-lg transition active:scale-95"
              title="Pasang APK"
            >
              <Download className="w-3.5 h-3.5" />
              <span>APK</span>
            </button>
          )}

          {/* Quick New Booking Button (Only if authorized and not kurir) */}
          {permissions.canManageBookings && !isCourier && (
            <button
              onClick={onOpenNewBooking}
              className="flex items-center gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg shadow-sm shadow-emerald-950 transition active:scale-95"
            >
              <span>+ Booking</span>
            </button>
          )}
        </div>
      </header>

      {/* QUICK ROLE & PROFILE SWITCHER MODAL */}
      {isSwitcherOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-4 space-y-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Ganti Profil Pengguna</h3>
              </div>
              <button
                onClick={() => setIsSwitcherOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Pilih salah satu dari 4 profil akses untuk menguji tampilan peran masing-masing:
            </p>

            {/* List of available profiles */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {allUsers.map(u => {
                const isSelected = u.id === activeUser.id;
                const meta = ROLE_LABELS[u.role];

                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0 select-none">{u.avatarIcon || meta.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">{u.nama}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${meta.badgeColor}`}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {meta.description}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="p-1 rounded-full bg-cyan-500 text-slate-950 shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Link to Full User Management if allowed */}
            {permissions.canManageUsers && onOpenUserManagement && (
              <button
                onClick={() => {
                  setIsSwitcherOpen(false);
                  onOpenUserManagement();
                }}
                className="w-full text-center text-xs font-semibold py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 transition"
              >
                Buka Panel Manajemen Pengguna & Izin Lengkap →
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
