import React, { useState, useEffect } from 'react';
import { useAppUpdate, forceRefreshApp, APP_VERSION } from '../hooks/useAppUpdate';
import { RefreshCw, CheckCircle2, X, Sparkles, ShieldCheck } from 'lucide-react';

export const AppUpdateNotification: React.FC = () => {
  const { needRefresh, isUpdating, updateApp, dismissUpdate } = useAppUpdate();
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    // Check if the page just refreshed after an update
    try {
      if (sessionStorage.getItem('app_just_updated_feedback') === 'true') {
        setShowSuccessToast(true);
        sessionStorage.removeItem('app_just_updated_feedback');
        const timer = setTimeout(() => {
          setShowSuccessToast(false);
        }, 6000);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  return (
    <>
      {/* 1. Post-Update Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-stone-900 border border-emerald-500/80 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 backdrop-blur-md animate-fade-in no-print">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Aplikasi Berhasil Diperbarui</span>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                {APP_VERSION}
              </span>
            </p>
            <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
              Fitur dan perbaikan terbaru telah aktif. Seluruh data logbook kegiatan dan profil Anda tetap aman 100%.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSuccessToast(false)}
            className="text-stone-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Update Available Floating Banner */}
      {needRefresh && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xl bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 border-2 border-emerald-400 rounded-2xl shadow-2xl p-4 text-white backdrop-blur-lg animate-bounce-once no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 text-amber-300">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Pembaruan Aplikasi Tersedia!
                  </h4>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.2 rounded-full font-semibold">
                    Versi Baru
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Ada pembaruan fitur & perbaikan sistem. Ketuk perbarui sekarang tanpa perlu bongkar pasang aplikasi.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-medium pt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Data logbook, foto & profil Anda dijamin tetap aman 100%.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-center shrink-0 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={dismissUpdate}
                disabled={isUpdating}
                className="px-3 py-2 text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
              >
                Nanti
              </button>
              <button
                type="button"
                onClick={() => updateApp()}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-emerald-900/50 transition-all border border-emerald-300/40 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isUpdating ? 'Memperbarui...' : 'Perbarui Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const ManualRefreshAppButton: React.FC<{
  variant?: 'header' | 'button' | 'card';
  className?: string;
}> = ({ variant = 'header', className = '' }) => {
  const { needRefresh } = useAppUpdate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleExecuteRefresh = async () => {
    setIsRefreshing(true);
    await forceRefreshApp();
  };

  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowConfirmModal(true)}
          className={`relative px-2.5 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-200 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-stone-700/60 active:scale-95 ${className}`}
          title="Segarkan / Perbarui Aplikasi ke Versi Terbaru (Data Tetap Aman)"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Perbarui</span>
          
          {needRefresh && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 border border-stone-900"></span>
            </span>
          )}
        </button>

        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in no-print">
            <div className="w-full max-w-sm rounded-2xl bg-stone-900 border border-emerald-500/40 p-5 shadow-2xl text-white space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Segarkan / Perbarui Aplikasi</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="p-1 text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                Tindakan ini akan mengunduh versi aplikasi dan perbaikan terbaru dari server tanpa perlu menginstal ulang aplikasi.
              </p>

              <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Jaminan Keamanan Data:</span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Data catatan logbook, foto kegiatan, dan profil Anda <strong>100% aman dan tidak akan terhapus</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isRefreshing}
                  className="w-1/2 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRefresh}
                  disabled={isRefreshing}
                  className="w-1/2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Memuat...' : 'Segarkan Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Card Variant for Profile Page
  return (
    <div className={`p-4 bg-stone-900 border border-emerald-500/30 rounded-2xl text-white space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white">Pembaruan &amp; Versi Aplikasi</h4>
            <p className="text-[11px] text-stone-400">Versi Aktif: {APP_VERSION}</p>
          </div>
        </div>
        {needRefresh && (
          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
            Update Tersedia
          </span>
        )}
      </div>

      <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1.5">
        <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Data Tetap Terjaga 100%</span>
        </div>
        <p className="text-[11px] text-stone-300 leading-relaxed">
          Pembaruan fitur atau memuat ulang aplikasi hanya memperbarui kode sistem. Seluruh data kegiatan, foto, dan profil Anda tetap tersimpan utuh di memori HP dan Cloud Firebase.
        </p>
      </div>

      <button
        type="button"
        onClick={handleExecuteRefresh}
        disabled={isRefreshing}
        className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer border border-emerald-400/30"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>{isRefreshing ? 'Memperbarui Aplikasi...' : 'Periksa Pembaruan & Muat Ulang Versi Terbaru'}</span>
      </button>
    </div>
  );
};
