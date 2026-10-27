import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2, Monitor } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'prominent' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showGenericGuide, setShowGenericGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed and running in standalone mode (without address bar), hide prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowGenericGuide(true);
    }
  };

  return (
    <>
      {variant === 'banner' ? (
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 border border-emerald-500/40 p-3.5 sm:p-4 rounded-xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Pasang Aplikasi (Tanpa Link / Address Bar)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-500/30 font-mono">PWA Native</span>
              </p>
              <p className="text-[11px] text-stone-300 mt-0.5">
                Buka aplikasi di layar penuh seperti aplikasi resmi Android &amp; Komputer tanpa bilah alamat browser.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all border border-emerald-400/40 cursor-pointer active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4 text-amber-300" />
            <span>{isInstalling ? 'Memasang...' : 'Pasang Aplikasi Sekarang'}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800/90 hover:bg-emerald-700 text-white text-xs font-bold transition-all border border-emerald-400/40 shadow-xs cursor-pointer active:scale-95"
          title="Pasang aplikasi ke layar utama (tanpa address bar browser)"
        >
          <Download className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden sm:inline">Pasang</span>
          <span>Aplikasi</span>
        </button>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-stone-900 border border-emerald-500/40 p-6 shadow-2xl text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Pasang di iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="mt-3 text-xs text-stone-300 leading-relaxed">
              Agar aplikasi berjalan tanpa tautan/address bar Safari, ikuti langkah mudah berikut:
            </p>

            <ol className="mt-3 space-y-2.5 text-xs text-stone-200 bg-stone-950 p-3.5 rounded-xl border border-stone-800">
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-400 shrink-0">1.</span>
                <span>Ketuk tombol <strong>Bagikan (Share / tanda kotak panah ke atas)</strong> di bilah navigasi Safari.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-400 shrink-0">2.</span>
                <span>Gulir ke bawah dan pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-400 shrink-0">3.</span>
                <span>Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas.</span>
              </li>
            </ol>

            <p className="mt-3 text-[11px] text-emerald-300">
              ✓ Ikon Logbook Kinerja akan muncul di layar utama Anda dan terbuka tanpa bilah alamat browser.
            </p>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 transition"
            >
              Mengerti &amp; Tutup
            </button>
          </div>
        </div>
      )}

      {/* Desktop / Android General Guide Modal */}
      {showGenericGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-stone-900 border border-emerald-500/40 p-6 shadow-2xl text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Jadikan Aplikasi PWA</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGenericGuide(false)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="mt-3 text-xs text-stone-300 leading-relaxed">
              Untuk membuka aplikasi ini di jendela bersih mandiri tanpa bilah URL / address bar:
            </p>

            <ol className="mt-3 space-y-2.5 text-xs text-stone-200 bg-stone-950 p-3.5 rounded-xl border border-stone-800">
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-400 shrink-0">1.</span>
                <span>Di Google Chrome / Edge, perhatikan ikon <strong>Pasang / Instal (Install icon)</strong> di sisi kanan bilah alamat (address bar).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-400 shrink-0">2.</span>
                <span>Atau klik tombol menu titik tiga (⋮) &rarr; pilih <strong>"Simpan dan Bagikan" / "Pasang Logbook KPS 1 Manoko"</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-400 shrink-0">3.</span>
                <span>Aplikasi akan langsung berjalan dalam jendela tersendiri layaknya software desktop / aplikasi HP native.</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowGenericGuide(false)}
              className="mt-4 w-full rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 transition"
            >
              Mengerti &amp; Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};
