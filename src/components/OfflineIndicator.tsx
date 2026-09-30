import React from 'react';
import { WifiOff, HardDriveDownload } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 font-medium select-none"
        title="App & Saved Audio ready for offline use anytime"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="hidden sm:inline">Offline Ready</span>
        <HardDriveDownload className="w-3 h-3 text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/90 backdrop-blur-md border border-amber-400/40 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-2xl shadow-amber-500/20 animate-bounce">
      <WifiOff className="w-4 h-4 text-slate-950 stroke-[2.5]" />
      <span>Offline Mode active — Playing from local device storage</span>
    </div>
  );
};
