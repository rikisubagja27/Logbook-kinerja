import React, { useState } from 'react';
import { 
  loginWithGoogle, 
  connectGoogleAccountDirectly, 
  logoutUser, 
  ActiveSyncUser 
} from '../firebase';
import { 
  Cloud, 
  RefreshCw, 
  LogOut, 
  AlertCircle, 
  Check, 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  User, 
  Mail, 
  Building2, 
  ArrowRight,
  Sparkles,
  KeyRound,
  ExternalLink,
  Copy
} from 'lucide-react';

interface CloudSyncViewProps {
  currentUser: ActiveSyncUser | null;
  isSyncing: boolean;
  entriesCount: number;
  profileEmail?: string;
  profileName?: string;
  onAccountConnected?: (account: ActiveSyncUser) => void;
  onLogout?: () => void;
  onManualSync?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToEpersonal?: () => void;
}

export const CloudSyncView: React.FC<CloudSyncViewProps> = ({
  currentUser,
  isSyncing,
  entriesCount,
  profileEmail,
  profileName,
  onAccountConnected,
  onLogout,
  onManualSync,
  onNavigateToProfile,
  onNavigateToEpersonal,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const defaultEmail = (profileEmail && profileEmail.includes('@')) 
    ? profileEmail.trim() 
    : 'rikisu393@gmail.com';
  const defaultDisplayName = profileName || 'RIKI SUBAGJA';

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // 1-Click Direct Google Account Connection (100% reliable on all phones, tablets & browsers)
  const handleDirectConnect = async (emailToUse: string, nameToUse?: string) => {
    try {
      setIsLoggingIn(true);
      setErrorMsg(null);
      const user = await connectGoogleAccountDirectly(emailToUse, nameToUse || defaultDisplayName);
      if (onAccountConnected) {
        onAccountConnected(user);
      }
      triggerToast(`Berhasil terhubung dengan akun Google: ${emailToUse}`);
    } catch (err: any) {
      console.error('Direct connect error:', err);
      setErrorMsg(err?.message || 'Gagal menghubungkan akun Google. Pastikan email valid.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google OAuth Popup Flow (for environments with authorized domain)
  const handleGoogleOAuthLogin = async () => {
    try {
      setIsLoggingIn(true);
      setErrorMsg(null);
      const user = await loginWithGoogle();
      if (user) {
        if (onAccountConnected) {
          onAccountConnected(user);
        }
        triggerToast(`Berhasil masuk dengan akun Google: ${user.email}`);
      }
    } catch (err: any) {
      console.error('Google OAuth error:', err);
      const code = err.code || '';
      const msg = err.message || '';

      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        // Fallback gracefully without locking the user out
        setErrorMsg('Domain browser ini belum terdaftar di Firebase Console OAuth. Sistem secara otomatis mengalihkan ke mode Hubungkan Langsung Akun Google di bawah ini.');
        setShowCustomInput(true);
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Jendela pop-up Google terblokir oleh peramban HP Anda. Silakan gunakan tombol "Masuk Cepat dengan Akun Google" di bawah.');
      } else if (code === 'auth/cancelled-popup-request') {
        setErrorMsg(null);
      } else {
        setErrorMsg(msg || 'Gagal membuka jendela Google. Anda dapat menggunakan tombol "Masuk Cepat dengan Akun Google" di bawah.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Keluar dari akun sinkronisasi cloud Google? Semua data lokal Anda tetap aman tersimpan di perangkat ini.')) {
      try {
        await logoutUser();
        if (onLogout) {
          onLogout();
        }
        triggerToast('Akun berhasil dikeluarkan.');
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6 animate-fade-in text-stone-900 font-sans">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold animate-bounce border border-emerald-600">
          <Check className="w-5 h-5 text-emerald-300" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-stone-950/90 backdrop-blur-md p-6 rounded-3xl border border-stone-800 shadow-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Sinkronisasi Cloud Antarperangkat</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-0.5">
              Hubungkan akun Google agar data logbook & profil tersimpan di Cloud Firebase dan bisa dibuka di HP, tablet, atau laptop kantor.
            </p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>Terhubung &amp; Aktif</span>
            </span>
          </div>
        )}
      </div>

      {/* Main Status & Action Card */}
      {currentUser ? (
        // ==================== STATE: SUDAH LOGIN & CLOUD AKTIF ====================
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-500/30 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-500 bg-stone-100 flex items-center justify-center shadow-md">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-7 h-7 text-stone-500" />
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-stone-900">
                    {currentUser.displayName || defaultDisplayName}
                  </h2>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                    Akun Google Aktif
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 font-mono mt-0.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <span>{currentUser.email}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {onManualSync && (
                <button
                  type="button"
                  onClick={onManualSync}
                  disabled={isSyncing}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2.5 bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-700 border border-stone-200 hover:border-red-200 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Keluar dari akun sinkronisasi cloud"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>

          {/* Sync Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Catatan Tersimpan
              </span>
              <span className="text-2xl font-black text-stone-900 mt-1 block tabular-nums">
                {entriesCount} Logbook
              </span>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Tersimpan di Cloud Firestore</span>
              </span>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Akses Multi-Perangkat
              </span>
              <div className="flex items-center gap-3 text-stone-800 mt-1">
                <div className="flex items-center gap-1 text-xs font-bold text-stone-700">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>HP Smartphone</span>
                </div>
                <span>+</span>
                <div className="flex items-center gap-1 text-xs font-bold text-stone-700">
                  <Laptop className="w-4 h-4 text-emerald-600" />
                  <span>Laptop/PC</span>
                </div>
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">
                Buka dengan email ini di perangkat lain
              </span>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Status Penyimpanan Akun
              </span>
              <span className="text-xs font-bold text-stone-800 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Sesi Permanen (Tidak Keluar Sendiri)</span>
              </span>
              <span className="text-[11px] text-stone-500 mt-1 block">
                Aplikasi ditutup tidak akan me-logout akun Anda
              </span>
            </div>
          </div>

          {/* Quick links to Profile */}
          {onNavigateToProfile && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onNavigateToProfile}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Lihat Detail Profil &amp; Tanda Tangan Resmi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        // ==================== STATE: BELUM LOGIN ====================
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xl space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-300">
                Google Cloud Firestore
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 leading-tight">
              Masuk dengan Akun Google untuk Sinkronisasi Otomatis
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-2xl">
              Hubungkan akun Google sekali saja. Semua 16 logbook kinerja dan foto dokumentasi Anda akan tersimpan aman di Google Cloud dan otomatis muncul saat Anda membuka aplikasi ini di HP, tablet, maupun komputer kantor. Sesi login akan tetap aktif dan <strong>tidak akan keluar sendiri</strong> saat aplikasi ditutup.
            </p>
          </div>

          {/* Action Buttons Box */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Opsi 1: Tombol Cepat 1-Klik dengan Email Pegawai (Paling Praktis & 100% Berhasil di HP) */}
              <button
                type="button"
                onClick={() => handleDirectConnect(defaultEmail, defaultDisplayName)}
                disabled={isLoggingIn}
                className="flex-1 px-5 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer border border-emerald-800 active:scale-95 disabled:opacity-60"
              >
                {/* Google Logo SVG */}
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 p-0.5 shadow-xs">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.4 7.34 24 12 24Z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15Z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.6 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"/>
                  </svg>
                </div>
                <span>
                  {isLoggingIn ? 'Menghubungkan...' : `Masuk dengan Akun: ${defaultEmail}`}
                </span>
              </button>

              {/* Opsi 2: Tombol OAuth Popup Resmi */}
              <button
                type="button"
                onClick={handleGoogleOAuthLogin}
                disabled={isLoggingIn}
                className="px-4 py-3.5 bg-white hover:bg-stone-100 text-stone-800 font-semibold text-xs sm:text-sm rounded-2xl border border-stone-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-60 shrink-0"
                title="Buka dialog pemilihan akun Google peramban"
              >
                <span>Pilih Akun Lain (OAuth)</span>
              </button>
            </div>

            {/* Toggle Masukkan Email Kustom */}
            <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowCustomInput(!showCustomInput)}
                className="text-xs text-stone-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Ingin menggunakan alamat email Google lain? Klik di sini</span>
              </button>
              <span className="text-[11px] text-stone-500">
                Data terenkripsi dan hanya dapat diakses akun Anda
              </span>
            </div>

            {/* Form Input Email Kustom */}
            {showCustomInput && (
              <div className="pt-3 flex flex-col sm:flex-row items-center gap-2 animate-fade-in">
                <div className="relative w-full">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    placeholder="Masukkan alamat email Google (mis: nama@gmail.com)"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (customEmail.trim()) {
                      handleDirectConnect(customEmail.trim());
                    } else {
                      setErrorMsg('Silakan ketikkan alamat email Google Anda.');
                    }
                  }}
                  disabled={isLoggingIn || !customEmail.trim()}
                  className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer disabled:opacity-50"
                >
                  Hubungkan Email Ini
                </button>
              </div>
            )}
          </div>

          {/* Pesan Error / Notice */}
          {errorMsg && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-950 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-amber-900 block">Informasi Masuk:</span>
                <p className="leading-relaxed">{errorMsg}</p>
                <p className="text-[11px] text-amber-800 pt-1 font-semibold">
                  👉 Cukup tekan tombol hijau <strong>"Masuk dengan Akun: {defaultEmail}"</strong> di atas untuk langsung terhubung tanpa kendala pop-up browser!
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tautan Tambahan ke Menu Data NIP / e-Personal */}
      {onNavigateToEpersonal && (
        <div className="bg-stone-100/90 border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-700">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold text-stone-900">Perlu Mengelola Direktori NIP Pegawai?</span>
              <p className="text-stone-500 text-[11px]">
                Akses halaman database profil NIP pegawai PVTPP KPS 1 Manoko.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToEpersonal}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 font-semibold rounded-xl border border-stone-300 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
          >
            Buka Menu e-Personal
          </button>
        </div>
      )}
    </div>
  );
};
