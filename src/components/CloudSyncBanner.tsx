import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { loginWithGoogle, logoutUser } from '../firebase';
import { Cloud, CloudCheck, CloudOff, RefreshCw, LogIn, LogOut, CheckCircle2, ShieldCheck, Laptop, Smartphone } from 'lucide-react';

interface CloudSyncBannerProps {
  currentUser: FirebaseUser | null;
  isSyncing: boolean;
  entriesCount: number;
  onManualSync?: () => void;
}

export const CloudSyncBanner: React.FC<CloudSyncBannerProps> = ({
  currentUser,
  isSyncing,
  entriesCount,
  onManualSync,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setErrorMsg(null);
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google login error:', err);
      setErrorMsg(err.message || 'Gagal masuk dengan Google. Pastikan koneksi internet aktif.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Keluar dari sinkronisasi cloud Google? Data lokal tetap tersimpan di perangkat ini.')) {
      try {
        await logoutUser();
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
  };

  if (isDismissed && currentUser) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-1 no-print print:hidden">
      {currentUser ? (
        // Banner saat sudah login & sinkronisasi cloud aktif
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 border border-emerald-500/40 rounded-2xl p-3 sm:p-4 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 text-emerald-400">
              <CloudCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  Sinkronisasi Cloud Aktif
                </span>
                <span className="text-[11px] text-stone-300 font-mono bg-stone-800/80 px-2 py-0.5 rounded border border-stone-700">
                  {currentUser.email || currentUser.displayName}
                </span>
                <span className="text-[11px] bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded border border-emerald-600/40 font-medium">
                  {entriesCount} Catatan Tersinkron
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1">
                Data logbook dan profil Anda otomatis tersimpan di Cloud (Firestore) secara aman. Buka di HP, laptop, atau tablet lain dengan akun Google ini untuk melihat data yang sama.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            {onManualSync && (
              <button
                type="button"
                onClick={onManualSync}
                disabled={isSyncing}
                className="text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Sinkronkan ulang data sekarang"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs bg-stone-800/80 hover:bg-red-950 text-stone-400 hover:text-red-300 border border-stone-700 hover:border-red-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="Keluar dari akun sinkronisasi cloud"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      ) : (
        // Banner saat belum login: Edukasi & Tombol 1-Klik Masuk Google
        <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4.5 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5 sm:mt-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-amber-300">
                  Ingin Data Tersinkron di Perangkat Lain (HP & Komputer)?
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-950/80 text-amber-300 border border-amber-600/40 px-2 py-0.5 rounded-full">
                  Fitur Cloud Firebase
                </span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed max-w-3xl">
                Saat ini data disimpan di memori browser perangkat ini (LocalStorage). 
                <strong> Masuk dengan Akun Google</strong> sekali saja untuk mengaktifkan sinkronisasi otomatis. Dengan akun yang sama, logbook yang diisi di HP akan otomatis muncul saat Anda membuka laptop atau komputer kantor.
              </p>
              {errorMsg && (
                <p className="text-xs text-red-400 font-semibold mt-1">
                  ⚠️ {errorMsg}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-stone-200 active:scale-95 disabled:opacity-60"
            >
              {/* Google G Logo */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.4 7.34 24 12 24Z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15Z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.6 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"/>
              </svg>
              <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
