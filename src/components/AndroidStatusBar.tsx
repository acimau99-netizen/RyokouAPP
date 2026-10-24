import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Radio } from 'lucide-react';

export const AndroidStatusBar: React.FC = () => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-slate-950/95 text-slate-300 text-xs px-4 py-1.5 flex items-center justify-between border-b border-slate-900 select-none z-30">
      {/* Left: Time and Carrier */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-100 tracking-tight font-mono">{timeStr}</span>
        <span className="text-[10px] text-cyan-400 font-medium px-1 bg-cyan-950/60 rounded">WIB</span>
        <span className="text-[11px] text-slate-500 hidden sm:inline">RyokoNet 5G</span>
      </div>

      {/* Middle: Android Notch / Speaker subtle indicator */}
      <div className="hidden sm:flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700/80" title="Front Camera" />
        <div className="w-10 h-1 rounded-full bg-slate-800" title="Earpiece" />
      </div>

      {/* Right: Network & Battery icons */}
      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-[10px] font-mono text-emerald-400 font-medium">OFFLINE-READY</span>
        <Wifi className="w-3.5 h-3.5 text-slate-300" />
        <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-slate-300">100%</span>
          <Battery className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
        </div>
      </div>
    </div>
  );
};
