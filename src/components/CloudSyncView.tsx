import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { loginWithGoogle, logoutUser } from '../firebase';
import { 
  Cloud, 
  CloudCheck, 
  RefreshCw, 
  LogOut, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  HardDrive,
  User,
  Mail,
  Building2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface CloudSyncViewProps {
  currentUser: FirebaseUser | null;
  isSyncing: boolean;
  entriesCount: number;
  onManualSync?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToEpersonal?: () => void;
}

export const CloudSyncView: React.FC<CloudSyncViewProps> = ({
  currentUser,
  isSyncing,
  entriesCount,
  onManualSync,
  onNavigateToProfile,
  onNavigateToEpersonal,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'logbook-kinerja.vercel.app';
  const projectId = 'plucky-resource-wv4kj';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setErrorMsg(null);
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google login error:', err);
      const code = err.code || '';
      const msg = err.message || '';

      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setErrorMsg('Domain belum diizinkan di Firebase Console (auth/unauthorized-domain). Ikuti panduan di bawah untuk mengaktifkannya.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Jendela pop-up Google terblokir. Harap izinkan pop-up di peramban Anda.');
      } else if (code === 'auth/cancelled-popup-request') {
        setErrorMsg(null);
      } else {
        setErrorMsg(msg || 'Gagal masuk dengan Google. Pastikan koneksi internet aktif.');
      }
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

  const handleCopyDomain = () => {
    navigator.clipboard.writeText(currentHost);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6 animate-fade-in text-stone-900">
      {/* Top Header Card */}
      <div className="bg-stone-950/85 backdrop-blur-md p-6 rounded-2xl border border-stone-800 shadow-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Sinkronisasi Cloud Antarperangkat</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-0.5">
              Hubungkan akun Google agar data logbook & profil tersimpan di Cloud Firebase dan bisa dibuka di HP atau laptop mana saja.
            </p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl">
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
        // STATE: SUDAH LOGIN & CLOUD AKTIF
        <div className="bg-white rounded-2xl p-6 border border-emerald-500/30 shadow-lg space-y-6">
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
                    <User className="w-7 h-7 text-stone-400" />
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-stone-900">
                    {currentUser.displayName || 'Pegawai KPS 1 Manoko'}
                  </h2>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    Akun Google Aktif
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-mono mt-0.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <span>{currentUser.email}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {onManualSync && (
                <button
                  type="button"
                  onClick={onManualSync}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-2 bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-700 border border-stone-200 hover:border-red-200 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Keluar dari akun sinkronisasi cloud"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>

          {/* Sync Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Catatan Tersinkron
              </span>
              <span className="text-2xl font-black text-stone-900 mt-1 block tabular-nums">
                {entriesCount} Logbook
              </span>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Tersimpan di Cloud Firestore</span>
              </span>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Akses Multi-Perangkat
              </span>
              <div className="flex items-center gap-3 text-stone-800 mt-1">
                <div className="flex items-center gap-1 text-xs font-bold text-stone-700">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Smartphone</span>
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

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Keamanan &amp; Privasi
              </span>
              <span className="text-xs font-bold text-stone-800 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Terenkripsi Akun Pribadi</span>
              </span>
              <span className="text-[11px] text-stone-500 mt-1 block">
                Hanya bisa dibaca oleh akun Google Anda
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
        // STATE: BELUM LOGIN
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-lg space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Google Cloud Firestore
                </span>
              </div>
              <h2 className="text-lg font-bold text-stone-900 leading-tight">
                Hubungkan Akun Google untuk Sinkronisasi Otomatis
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Saat ini data disimpan di memori peramban perangkat ini. Masuk dengan Akun Google sekali saja untuk menyinkronkan data secara otomatis. Dengan akun yang sama, logbook yang diisi di HP akan langsung muncul saat Anda membuka laptop atau komputer kantor.
              </p>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full sm:w-auto px-6 py-3.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer border border-stone-800 active:scale-95 disabled:opacity-60"
              >
                {/* Google Logo SVG */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.4 7.34 24 12 24Z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15Z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.6 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"/>
                </svg>
                <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
              </button>
            </div>
          </div>

          {/* Panduan jika muncul galat unauthorized domain */}
          {errorMsg && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 space-y-4 text-amber-950 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-amber-900">
                    Otorisasi Domain Diperlukan untuk Google Login di Vercel
                  </h3>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Google Firebase mewajibkan domain <strong>{currentHost}</strong> didaftarkan sekali saja ke daftar <em>Authorized Domains</em> proyek Firebase Anda.
                  </p>
                </div>
              </div>

              {/* Langkah Cepat */}
              <div className="bg-white border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                  <span className="text-xs font-bold text-stone-800">
                    1. Salin Domain Web Ini:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={currentHost}
                      className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-stone-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      {copiedDomain ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Domain</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-stone-700">
                  <span className="font-bold text-xs text-stone-800 block">
                    2. Tambahkan ke Firebase Console:
                  </span>
                  <p className="leading-relaxed">
                    Buka link Firebase Console di bawah, cari bagian <strong>Authorized domains</strong>, klik <strong>Add domain</strong>, tempel domain <code className="bg-stone-100 px-1 py-0.5 rounded font-mono font-bold">{currentHost}</code>, lalu klik <strong>Save</strong>.
                  </p>
                  <div className="pt-2">
                    <a
                      href={firebaseSettingsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
                    >
                      <span>Buka Firebase Console Settings</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <span className="text-[11px] text-stone-500 ml-3">
                      Project ID: <strong>{projectId}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-amber-800 leading-relaxed">
                💡 Setelah domain ditambahkan di Firebase Console, muat ulang halaman ini lalu klik <strong>"Masuk dengan Google"</strong>. Tombol langsung berfungsi normal!
              </p>
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
