import React from 'react';
import { Download, Smartphone, Monitor, ShieldCheck, Bell } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidTopBarProps {
  pendingBookingsCount: number;
  activeDisewaCount: number;
  isMobileDeviceView: boolean;
  onToggleDeviceView: () => void;
  onOpenNewBooking: () => void;
  onOpenInstallGuide: () => void;
}

export const AndroidTopBar: React.FC<AndroidTopBarProps> = ({
  pendingBookingsCount,
  activeDisewaCount,
  isMobileDeviceView,
  onToggleDeviceView,
  onOpenNewBooking,
  onOpenInstallGuide,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      onOpenInstallGuide();
    }
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-3 py-2.5 sm:px-4 sm:py-3 sticky top-0 z-20 flex items-center justify-between gap-2">
      {/* Brand & Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-emerald-500 p-0.5 shadow-md shadow-cyan-950/40 shrink-0 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <span className="text-base select-none">🛵</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
              RyokoRent <span className="text-cyan-400 font-medium text-xs sm:text-sm">Admin APK</span>
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 shrink-0 font-medium">
              v3.2.2 LocalDB
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            Malang (Dinoyo) · Batu (Diponegoro)
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Pending Alerts Indicator */}
        {pendingBookingsCount > 0 && (
          <div
            className="flex items-center gap-1 text-xs bg-amber-950/60 border border-amber-700/50 text-amber-300 px-2 py-1 rounded-lg font-medium"
            title={`${pendingBookingsCount} booking baru menunggu approval`}
          >
            <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span className="font-bold">{pendingBookingsCount}</span>
            <span className="hidden sm:inline text-[11px]">Booking Baru</span>
          </div>
        )}

        {/* APK / PWA Install Button */}
        {!isInstalled && (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-sm shadow-cyan-900/40 transition active:scale-95"
            title="Pasang aplikasi ke Android Home Screen / Download APK PWA"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pasang APK</span>
            <span className="sm:hidden">Install</span>
          </button>
        )}

        {/* Device Frame Viewport Toggle (Desktop preview feature) */}
        <button
          onClick={onToggleDeviceView}
          className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg transition"
          title={isMobileDeviceView ? 'Beralih ke Tampilan Layar Penuh (Tablet/PC)' : 'Beralih ke Simulasi Layar HP Android'}
        >
          {isMobileDeviceView ? (
            <>
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mode Lebar</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Frame HP</span>
            </>
          )}
        </button>

        {/* Quick New Booking Button */}
        <button
          onClick={onOpenNewBooking}
          className="flex items-center gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg shadow-sm shadow-emerald-950 transition active:scale-95"
        >
          <span>+ Booking</span>
        </button>
      </div>
    </header>
  );
};
