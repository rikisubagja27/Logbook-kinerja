import React, { useState, useEffect } from 'react';
import { useAppUpdate, forceRefreshApp, APP_VERSION } from '../hooks/useAppUpdate';
import { RefreshCw, CheckCircle2, X, Sparkles, ShieldCheck, Share2, Copy, Check } from 'lucide-react';

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
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const getCleanShareUrl = () => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      return `${origin}/?mode=baru`;
    }
    return 'https://ais-pre-ex6e3a46x7tolrvvjuzs7j-965365984971.asia-east1.run.app/?mode=baru';
  };

  const handleShareApp = async () => {
    const shareUrl = getCleanShareUrl();
    const shareData = {
      title: 'Logbook Kinerja Kps 1 Manoko',
      text: 'Aplikasi resmi Logbook Kinerja KPS PVT 1 Manoko. Tautan ini siap dipakai oleh pengguna baru dalam keadaan kosong (0 logbook).',
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShareFeedback('Tautan berhasil dibagikan!');
        setTimeout(() => setShareFeedback(null), 3000);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback salin ke clipboard
    handleCopyShareUrl();
  };

  const handleCopyShareUrl = async () => {
    const shareUrl = getCleanShareUrl();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedShareUrl(true);
      setShareFeedback('Tautan aplikasi berhasil disalin! Aplikasi otomatis kosong saat dibuka rekan kerja.');
      setTimeout(() => {
        setCopiedShareUrl(false);
        setShareFeedback(null);
      }, 4000);
    } catch (err) {
      console.warn('Salin link error:', err);
    }
  };

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
          className={`group relative px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-stone-900/90 hover:bg-stone-800 text-stone-200 hover:text-white text-xs sm:text-[13px] font-semibold transition-all flex items-center gap-2 cursor-pointer border border-stone-700/60 shadow-xs active:scale-95 shrink-0 ${className}`}
          title="Menu Perbarui & Bagikan Aplikasi (Data Tetap Aman)"
        >
          <span className="w-6 h-6 rounded-md bg-stone-800 border border-stone-700/60 flex items-center justify-center shrink-0 group-hover:text-emerald-300 group-hover:border-emerald-500/40 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 stroke-[2.2] ${isRefreshing ? 'animate-spin' : ''}`} />
          </span>
          <span className="hidden sm:inline">Perbarui</span>
          
          {needRefresh && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 border border-stone-900"></span>
            </span>
          )}
        </button>

        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in no-print">
            <div className="w-full max-w-md rounded-3xl bg-stone-900 border border-emerald-500/40 p-5 sm:p-6 shadow-2xl text-white space-y-4">
              
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">Perbarui &amp; Bagikan Aplikasi</h3>
                    <p className="text-[11px] text-stone-400">Versi Sistem: {APP_VERSION}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Toast Feedback */}
              {shareFeedback && (
                <div className="p-3 bg-emerald-950 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-fade-in font-medium">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{shareFeedback}</span>
                </div>
              )}

              {/* FITUR 1: BAGIKAN APLIKASI (OTOMATIS KOSONG UNTUK PENGGUNA BARU) */}
              <div className="p-4 bg-gradient-to-br from-stone-950 to-stone-900 border border-emerald-500/30 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
                    <Share2 className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Bagikan Aplikasi ke Rekan Kerja
                  </h4>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded-full font-bold">
                    Otomatis Kosong
                  </span>
                </div>

                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Ketika tautan ini dibuka oleh rekan kerja lain di perangkat mereka, aplikasi <strong>otomatis kosong (0 data logbook)</strong> sehingga siap digunakan dari awal untuk akun baru tanpa membawa data lama Anda.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleShareApp}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer border border-emerald-400/40"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Bagikan Aplikasi</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyShareUrl}
                    className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-stone-700 cursor-pointer"
                    title="Salin tautan bersih ke papan klip"
                  >
                    {copiedShareUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300 font-bold">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-400" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* FITUR 2: SEGARKAN / PERBARUI APLIKASI DI PERANGKAT INI */}
              <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Segarkan Aplikasi di Perangkat Ini
                  </h4>
                </div>

                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Mengunduh perbaikan sistem dan fitur terbaru ke perangkat ini. Data logbook, foto, dan profil Anda <strong>100% aman dan tidak akan terhapus</strong>.
                </p>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleExecuteRefresh}
                    disabled={isRefreshing}
                    className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-300 hover:text-emerald-200 text-xs font-bold transition flex items-center justify-center gap-2 border border-emerald-500/30 cursor-pointer active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'Memperbarui Versi...' : 'Perbarui Versi Sekarang'}</span>
                  </button>
                </div>
              </div>

              {/* Tombol Tutup */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full py-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white text-xs font-semibold transition"
                >
                  Tutup
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
    <div className={`p-5 bg-stone-900 border border-emerald-500/30 rounded-2xl text-white space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white">Pembaruan &amp; Bagikan Aplikasi</h4>
            <p className="text-[11px] text-stone-400">Versi Aktif: {APP_VERSION}</p>
          </div>
        </div>
        {needRefresh && (
          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
            Update Tersedia
          </span>
        )}
      </div>

      {shareFeedback && (
        <div className="p-3 bg-emerald-950 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center gap-2 font-medium">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{shareFeedback}</span>
        </div>
      )}

      {/* Bagikan Aplikasi ke Pengguna Lain */}
      <div className="p-3.5 bg-stone-950/80 border border-stone-800 rounded-xl space-y-2">
        <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-bold">
          <Share2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Bagikan Aplikasi ke Pengguna Lain (Otomatis Bersih &amp; Kosong)</span>
        </div>
        <p className="text-[11px] text-stone-300 leading-relaxed">
          Tautan berbagi resmi ini otomatis mengatur aplikasi dalam keadaan kosong (0 data logbook) saat dibuka rekan kerja lain, siap digunakan untuk akun baru mereka.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleShareApp}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Bagikan Aplikasi</span>
          </button>
          <button
            type="button"
            onClick={handleCopyShareUrl}
            className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-stone-700"
          >
            {copiedShareUrl ? (
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Tersalin
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Copy className="w-3.5 h-3.5" /> Salin Link
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1.5">
        <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Keamanan Data Logbook &amp; Foto</span>
        </div>
        <p className="text-[11px] text-stone-300 leading-relaxed">
          Pembaruan fitur sistem tidak menghapus data. Seluruh catatan kegiatan, foto, dan profil Anda tetap tersimpan utuh di perangkat dan Cloud Firebase.
        </p>
      </div>

      <button
        type="button"
        onClick={handleExecuteRefresh}
        disabled={isRefreshing}
        className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-emerald-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer border border-emerald-500/30"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>{isRefreshing ? 'Memperbarui Aplikasi...' : 'Periksa Pembaruan & Muat Ulang Versi Terbaru'}</span>
      </button>
    </div>
  );
};
