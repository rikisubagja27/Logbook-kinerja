import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xl border border-amber-400/50 backdrop-blur-md animate-bounce no-print print:hidden">
      <WifiOff className="w-4 h-4 text-amber-200 shrink-0" />
      <span>Mode Offline — Aplikasi tetap dapat digunakan, data tersimpan di perangkat.</span>
    </div>
  );
};
