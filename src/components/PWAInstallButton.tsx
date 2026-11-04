import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  Download, 
  Smartphone, 
  X, 
  CheckCircle2, 
  Monitor, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Store,
  Layers,
  ArrowRight
} from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'prominent' | 'banner';
}

const GooglePlayLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" fill="#00E676"/>
    <path d="M47 40.1c-5.8 9.9-9 21.6-9 34.6v362.6c0 13 3.2 24.7 9 34.6l216.4-215.9L47 40.1z" fill="#00B0FF"/>
    <path d="M325.3 277.7l60.1 60.1L104.6 499l220.7-221.3z" fill="#FF3D00"/>
    <path d="M441.7 232.3l-56.3-32.3-60.1 60.1 60.1 60.1 56.3-32.3c16.1-9.2 26.3-26.3 26.3-44.8 0-18.4-10.2-35.6-26.3-44.8z" fill="#FFC107"/>
  </svg>
);

const AppleLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 170 170" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.7-7.94-12.04-14.58-6.19-9.5-11.02-20.3-14.49-32.4-3.47-12.1-5.21-23.36-5.21-33.78 0-14.9 3.65-27.23 10.95-37 7.3-9.76 16.63-14.74 27.99-14.94 4.8 0 10.22 1.34 16.27 4.02 6.05 2.68 10.02 4.06 11.91 4.14 1.57-.1 5.64-1.5 12.21-4.22 6.57-2.72 12.02-3.9 16.35-3.56 12.56.84 22.84 5.56 30.82 14.16-11.04 6.72-16.44 15.9-16.21 27.54.23 9.4 3.84 17.26 10.83 23.58 6.99 6.32 15.22 9.87 24.69 10.65-2.24 6.73-4.94 13.84-8.1 21.32zm-32.99-106.18c0 4.14-1.07 8.35-3.21 12.63-2.14 4.28-5.11 7.9-8.91 10.86-3.8 2.96-7.85 4.87-12.15 5.73-.55-.65-.89-1.39-1.02-2.22-.55-4.14.38-8.52 2.79-13.14 2.41-4.62 5.57-8.31 9.49-11.07 3.92-2.76 8.26-4.48 13.01-5.16 0 .84 0 1.63 0 2.37z" />
  </svg>
);

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showStoreHubModal, setShowStoreHubModal] = useState(false);
  const [activeStoreTab, setActiveStoreTab] = useState<'instant' | 'playstore' | 'appstore'>('instant');
  const [isInstalling, setIsInstalling] = useState(false);
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);

  const getCleanAppUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://ais-pre-ex6e3a46x7tolrvvjuzs7j-965365984971.asia-east1.run.app';
  };

  const handleCopyUrl = async () => {
    const url = getCleanAppUrl();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedAppUrl(true);
      setTimeout(() => setCopiedAppUrl(false), 3000);
    } catch (_) {}
  };

  const handleTriggerNativeInstall = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else {
      setShowStoreHubModal(true);
      setActiveStoreTab('instant');
    }
  };

  return (
    <>
      {variant === 'banner' ? (
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 border border-emerald-500/40 p-3.5 sm:p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 text-emerald-400 shadow-inner">
              <Download className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-white">
                  Download &amp; Pasang Aplikasi
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-500/30 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Play Store &amp; App Store Ready
                </span>
              </div>
              <p className="text-[11px] text-stone-300">
                Pasang langsung ke layar utama HP Android &amp; iPhone tanpa address bar, atau unduh paket rilis resmi Store.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowStoreHubModal(true);
                setActiveStoreTab('instant');
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md transition-all border border-emerald-400/40 cursor-pointer active:scale-95 shrink-0"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Download &amp; Pasang</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setShowStoreHubModal(true);
            setActiveStoreTab('instant');
          }}
          className="group relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-900/60 via-stone-900 to-emerald-950 hover:bg-stone-800 text-emerald-100 hover:text-white text-xs sm:text-[13px] font-semibold transition-all border border-emerald-500/40 shadow-xs cursor-pointer active:scale-95 shrink-0"
          title="Pusat Download Aplikasi (Play Store, App Store & Layar Utama HP)"
        >
          <span className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/30 transition-colors">
            <Download className="w-3.5 h-3.5 text-amber-300 stroke-[2.2]" />
          </span>
          <span className="hidden sm:inline">Download</span>
          <span className="font-bold text-white">App</span>
          <div className="hidden lg:flex items-center gap-1 opacity-75 group-hover:opacity-100">
            <GooglePlayLogo className="w-3 h-3" />
            <AppleLogo className="w-3 h-3 text-stone-300" />
          </div>
        </button>
      )}

      {/* ========================================================================= */}
      {/* PUSAT UNDUH & PASANG APLIKASI (APP STORE & PLAY STORE READY HUB) */}
      {/* ========================================================================= */}
      {showStoreHubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-fade-in no-print overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-stone-900 border border-emerald-500/40 shadow-2xl text-white my-4 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 bg-stone-950/80 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img 
                  src="/app_logo.png" 
                  alt="Logo" 
                  className="w-12 h-12 rounded-xl border border-emerald-400/50 object-cover shadow-md shrink-0" 
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Pusat Download Aplikasi
                    </h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.2 rounded-full border border-emerald-500/40">
                      Store Ready
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 mt-0.5">
                    Logbook Kinerja Kps 1 Manoko · Kementerian Pertanian
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowStoreHubModal(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation: Instant Install vs Play Store vs App Store */}
            <div className="grid grid-cols-3 p-2 bg-stone-950 border-b border-stone-800 gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveStoreTab('instant')}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  activeStoreTab === 'instant'
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Instal di HP</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveStoreTab('playstore')}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  activeStoreTab === 'playstore'
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                <GooglePlayLogo className="w-3.5 h-3.5" />
                <span>Play Store</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveStoreTab('appstore')}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  activeStoreTab === 'appstore'
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                <AppleLogo className="w-3.5 h-3.5" />
                <span>App Store</span>
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">

              {/* TAB 1: INSTAL LANGSUNG KE HP (CARA TERCEPAT & 100% BEBAS BIAYA) */}
              {activeStoreTab === 'instant' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Cara Termudah &amp; Langsung Terpasang</span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      Anda dan rekan kerja tidak perlu membayar biaya pendaftaran akun developer Google ($25) atau Apple ($99/tahun). Aplikasi dapat langsung diunduh dan dipasang seketika di semua tipe HP Android &amp; iPhone.
                    </p>
                  </div>

                  {/* Android Chrome Flow */}
                  <div className="p-4 bg-stone-950 border border-stone-800 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <GooglePlayLogo className="w-4 h-4" />
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Untuk Pengguna HP Android (Samsung, Xiaomi, Oppo, Vivo, dll)
                      </h4>
                    </div>

                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      Buka link aplikasi di browser Google Chrome, lalu ketuk tombol pasang di bawah ini untuk menginstal ikon resmi ke layar utama:
                    </p>

                    <button
                      type="button"
                      onClick={handleTriggerNativeInstall}
                      disabled={isInstalling}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer border border-emerald-400/40"
                    >
                      <Download className="w-4 h-4 text-amber-300" />
                      <span>{isInstalling ? 'Memasang Aplikasi...' : 'Pasang Aplikasi di HP Android'}</span>
                    </button>
                  </div>

                  {/* iPhone iOS Flow */}
                  <div className="p-4 bg-stone-950 border border-stone-800 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <AppleLogo className="w-4 h-4 text-stone-300" />
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Untuk Pengguna iPhone / iPad (Apple iOS)
                      </h4>
                    </div>

                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      Buka aplikasi di peramban <strong>Safari</strong> pada iPhone Anda, kemudian:
                    </p>

                    <ol className="space-y-2 text-stone-200 bg-stone-900/90 p-3 rounded-xl border border-stone-800">
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-emerald-400 shrink-0">1.</span>
                        <span>Ketuk tombol <strong>Bagikan (ikon kotak panah ke atas)</strong> di bagian bawah Safari.</span>
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

                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 pt-0.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Aplikasi langsung muncul di layar utama iPhone tanpa bilah URL Safari.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PAKET RILIS GOOGLE PLAY STORE (ANDROID TWA / APK / AAB) */}
              {activeStoreTab === 'playstore' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                      <GooglePlayLogo className="w-4 h-4" />
                      <span>Google Play Store (Trusted Web Activity / TWA)</span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      Aplikasi ini telah memenuhi <strong>100% spesifikasi resmi PWA &amp; Play Store</strong>: Web App Manifest v3, Icon 192x192 &amp; 512x512 maskable, 2 screenshot layar (mobile &amp; desktop), serta berkas verifikasi <code>.well-known/assetlinks.json</code>.
                    </p>
                  </div>

                  <div className="p-4 bg-stone-950 border border-stone-800 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>Cara Mengemas Menjadi Berkas Play Store (.aab / .apk)</span>
                    </h4>

                    <ol className="space-y-2.5 text-stone-200">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                        <span>
                          Salin tautan resmi aplikasi ini menggunakan tombol di bawah.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                        <span>
                          Buka <strong>PWABuilder.com</strong> (alat resmi Microsoft &amp; Google untuk membuat paket Google Play).
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                        <span>
                          Tempelkan tautan, lalu klik tombol <strong>"Package for Google Play"</strong> untuk mengunduh berkas <code>.aab</code> (Android App Bundle).
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
                        <span>
                          Unggah berkas <code>.aab</code> ke konsol <strong>Google Play Console</strong> instansi Anda.
                        </span>
                      </li>
                    </ol>

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-stone-700 cursor-pointer active:scale-95"
                      >
                        {copiedAppUrl ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-300 font-bold">Link Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-stone-400" />
                            <span>Salin Link Aplikasi</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`https://www.pwabuilder.com?url=${encodeURIComponent(getCleanAppUrl())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
                      >
                        <GooglePlayLogo className="w-4 h-4" />
                        <span>Buka Generator PWABuilder</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PAKET RILIS APPLE APP STORE (iOS / XCODE) */}
              {activeStoreTab === 'appstore' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                      <AppleLogo className="w-4 h-4 text-white" />
                      <span>Apple App Store (iOS WebKit Standalone)</span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      Aplikasi telah dilengkapi konfigurasi Apple Touch Icon 180x180 PNG, status bar transparan iOS, serta kompatibilitas penuh WebKit WKWebView untuk siap dipaketkan ke App Store.
                    </p>
                  </div>

                  <div className="p-4 bg-stone-950 border border-stone-800 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-emerald-400" />
                      <span>Cara Mengemas untuk Apple App Store</span>
                    </h4>

                    <ol className="space-y-2.5 text-stone-200">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                        <span>
                          Gunakan <strong>PWABuilder iOS</strong> atau <strong>Capacitor</strong> untuk membuat proyek Xcode native iOS.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                        <span>
                          Buka proyek di Xcode pada komputer Mac, hubungkan dengan <strong>Apple Developer Account</strong> organisasi Anda.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                        <span>
                          Kirim ke <strong>TestFlight</strong> untuk pengujian internal, lalu submit ke <strong>App Store Connect</strong> untuk persetujuan publikasi.
                        </span>
                      </li>
                    </ol>

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-stone-700 cursor-pointer active:scale-95"
                      >
                        {copiedAppUrl ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-300 font-bold">Link Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-stone-400" />
                            <span>Salin Link Aplikasi</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`https://www.pwabuilder.com?url=${encodeURIComponent(getCleanAppUrl())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-emerald-500/40 shadow-md cursor-pointer active:scale-95"
                      >
                        <AppleLogo className="w-4 h-4" />
                        <span>Buka PWABuilder iOS Package</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>PWA Standar W3C, Android TWA &amp; Apple WebKit</span>
              </div>
              <button
                type="button"
                onClick={() => setShowStoreHubModal(false)}
                className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
