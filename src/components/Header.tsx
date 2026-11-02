import React, { useState } from 'react';
import { UserProfile } from '../types/logbook';
import { cleanNipDigits } from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';
import { ManualRefreshAppButton } from './AppUpdateNotification';
import { 
  User, 
  ChevronDown, 
  CheckCircle2, 
  PenLine, 
  ClipboardList,
  FileCheck2,
  RefreshCw, 
  X, 
  Building2, 
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Cloud,
  IdCard,
  UserCheck,
  PlusCircle
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'form' | 'list' | 'report' | 'cloudsync' | 'profile' | 'epersonal';
  setActiveTab: (tab: 'form' | 'list' | 'report' | 'cloudsync' | 'profile' | 'epersonal') => void;
  profile: UserProfile;
  officers?: UserProfile[];
  onSelectProfile?: (profile: UserProfile) => void;
  onRefreshOfficers?: () => Promise<void>;
  isRefreshingOfficers?: boolean;
}

export function Header({ 
  activeTab, 
  setActiveTab, 
  profile,
  officers = [],
  onSelectProfile,
  onRefreshOfficers,
  isRefreshingOfficers = false
}: HeaderProps) {
  const [isNipModalOpen, setIsNipModalOpen] = useState(false);
  const [copiedNip, setCopiedNip] = useState<string | null>(null);

  // Mengambil NIP & nama dari profil aktif
  const currentNip = cleanNipDigits(profile?.nip);
  const currentName = profile?.nama || 'Pegawai';
  const profilePhoto = profile?.fotoProfil;

  const handleSelectOfficer = (officer: UserProfile) => {
    if (onSelectProfile) {
      onSelectProfile(officer);
    }
    const clean = cleanNipDigits(officer.nip);
    if (clean) {
      try {
        navigator.clipboard.writeText(clean);
        setCopiedNip(clean);
        setTimeout(() => setCopiedNip(null), 3000);
      } catch {}
    }
    setIsNipModalOpen(false);
  };

  // Element Profil di Pojok Kanan Atas: Foto tanpa frame luar pembungkus, di bawahnya Icon Hijau Aktif & Nama & tombol ganti NIP
  const userProfileBadgeElement = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setIsNipModalOpen(true)}
        className="flex flex-col items-center justify-center text-center cursor-pointer group active:scale-95 transition-transform focus:outline-none"
        title={`Profil Pegawai: ${currentName} (Ketuk untuk memilih NIP / ganti pegawai)`}
      >
        {/* Foto Profil Pengguna */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 aspect-square rounded-xl border border-emerald-400/60 overflow-hidden bg-stone-800 flex items-center justify-center shadow-md shrink-0 group-hover:border-emerald-300 transition-colors">
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={currentName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-stone-800 text-emerald-400/90 group-hover:text-emerald-300">
              <User className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Di bawah foto: Icon hijau yang menandakan aktif dan Nama Pegawai */}
        <div className="flex items-center justify-center gap-1 mt-1 max-w-[110px] sm:max-w-[130px]">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-white truncate group-hover:text-emerald-300 uppercase leading-tight">
            {currentName}
          </span>
          <ChevronDown className="w-3 h-3 text-emerald-400 shrink-0 group-hover:translate-y-0.5 transition-transform" />
        </div>
      </button>
    </div>
  );

  return (
    <>
      <header 
        className="bg-stone-900 border-b border-emerald-500/20 text-white sticky top-0 z-50 no-print print:hidden relative before:content-[''] before:absolute before:bottom-full before:left-0 before:right-0 before:h-[100vh] before:bg-stone-900 before:pointer-events-none"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-2.5">
          
          {/* Bagian Logo Kiri & Badge Profil Kanan (Khusus Mobile: Berada di baris atas sejajar) */}
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <div className="flex items-center gap-3">
              <img 
                src="/app_logo.png" 
                alt="Logo Logbook Kinerja" 
                className="w-11 h-11 sm:w-12 sm:h-12 object-cover rounded-xl border border-emerald-400/60 shadow-lg shrink-0"
                loading="eager"
              />
              <div>
                <h1 className="font-bold text-emerald-400 text-sm sm:text-base leading-tight">Logbook Kinerja Kps 1 Manoko</h1>
                <p className="text-[11px] text-stone-400">PVTPP Kementerian Pertanian</p>
              </div>
            </div>

            {/* Profil di Pojok Kanan Atas untuk Layar Mobile */}
            <div className="md:hidden flex items-center gap-2">
              {userProfileBadgeElement}
            </div>
          </div>

          {/* Bagian Menu Navigasi Utama: Menu Mandiri dengan Ikon Profesional Modern */}
          <nav 
            aria-label="Menu Navigasi Utama" 
            className="flex items-center gap-1 sm:gap-1.5 p-1 bg-stone-950/80 border border-stone-800/90 rounded-xl sm:rounded-2xl shadow-inner backdrop-blur-md overflow-x-auto w-full md:w-auto justify-start md:justify-center scrollbar-none"
          >
            {/* Menu Mandiri: Isi Logbook */}
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`group relative px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 font-medium text-xs sm:text-[13px] ${
                activeTab === 'form' 
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/60 border border-emerald-400/40 font-semibold' 
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/80 border border-transparent'
              }`}
              title="Menu Form: Isi Catatan Logbook Kinerja Harian"
            >
              <span className={`w-6 h-6 rounded-md flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'form'
                  ? 'bg-emerald-500/30 text-emerald-100 shadow-inner'
                  : 'bg-stone-800/90 text-stone-400 border border-stone-700/60 group-hover:text-emerald-300 group-hover:bg-stone-800 group-hover:border-emerald-500/40'
              }`}>
                <PenLine className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="tracking-tight">Isi Logbook</span>
              {activeTab === 'form' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-xs shadow-emerald-300 shrink-0" />
              )}
            </button>

            {/* Menu Mandiri: Rekap Logbook */}
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`group relative px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 font-medium text-xs sm:text-[13px] ${
                activeTab === 'list' 
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/60 border border-emerald-400/40 font-semibold' 
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/80 border border-transparent'
              }`}
              title="Menu Rekap: Riwayat & Rekap Seluruh Catatan Logbook"
            >
              <span className={`w-6 h-6 rounded-md flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'list'
                  ? 'bg-emerald-500/30 text-emerald-100 shadow-inner'
                  : 'bg-stone-800/90 text-stone-400 border border-stone-700/60 group-hover:text-emerald-300 group-hover:bg-stone-800 group-hover:border-emerald-500/40'
              }`}>
                <ClipboardList className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="tracking-tight">Rekap Logbook</span>
              {activeTab === 'list' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-xs shadow-emerald-300 shrink-0" />
              )}
            </button>

            {/* Menu Mandiri: Laporan Resmi */}
            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`group relative px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 font-medium text-xs sm:text-[13px] ${
                activeTab === 'report' 
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/60 border border-emerald-400/40 font-semibold' 
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/80 border border-transparent'
              }`}
              title="Menu Laporan Resmi: Cetak PDF & Ekspor Word Dokumen"
            >
              <span className={`w-6 h-6 rounded-md flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'report'
                  ? 'bg-emerald-500/30 text-emerald-100 shadow-inner'
                  : 'bg-stone-800/90 text-stone-400 border border-stone-700/60 group-hover:text-emerald-300 group-hover:bg-stone-800 group-hover:border-emerald-500/40'
              }`}>
                <FileCheck2 className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="tracking-tight">Laporan Resmi</span>
              {activeTab === 'report' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-xs shadow-emerald-300 shrink-0" />
              )}
            </button>

            {/* Menu Sinkronisasi Cloud Antarperangkat */}
            <button
              type="button"
              onClick={() => setActiveTab('cloudsync')}
              className={`group relative px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 font-medium text-xs sm:text-[13px] ${
                activeTab === 'cloudsync'
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/60 border border-emerald-400/40 font-semibold'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/80 border border-transparent'
              }`}
              title="Menu Sinkronisasi Cloud Antarperangkat & Status Akun"
            >
              <span className={`w-6 h-6 rounded-md flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'cloudsync'
                  ? 'bg-emerald-500/30 text-emerald-100 shadow-inner'
                  : 'bg-stone-800/90 text-stone-400 border border-stone-700/60 group-hover:text-emerald-300 group-hover:bg-stone-800 group-hover:border-emerald-500/40'
              }`}>
                <Cloud className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="tracking-tight">Sinkron Cloud</span>
              {activeTab === 'cloudsync' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-xs shadow-emerald-300 shrink-0" />
              )}
            </button>

            {/* Menu E-Personal & Data NIP */}
            <button
              type="button"
              onClick={() => setActiveTab('epersonal')}
              className={`group relative px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 font-medium text-xs sm:text-[13px] ${
                activeTab === 'epersonal' 
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/60 border border-emerald-400/40 font-semibold' 
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/80 border border-transparent'
              }`}
              title="Portal SIMPEG E-Personal & Data NIP Pegawai"
            >
              <span className={`w-6 h-6 rounded-md flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'epersonal'
                  ? 'bg-emerald-500/30 text-emerald-100 shadow-inner'
                  : 'bg-stone-800/90 text-stone-400 border border-stone-700/60 group-hover:text-emerald-300 group-hover:bg-stone-800 group-hover:border-emerald-500/40'
              }`}>
                <IdCard className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="tracking-tight">Data NIP</span>
              {activeTab === 'epersonal' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-xs shadow-emerald-300 shrink-0" />
              )}
            </button>

            {/* Menu Profil Pegawai */}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`group relative px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 font-medium text-xs sm:text-[13px] ${
                activeTab === 'profile' 
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/60 border border-emerald-400/40 font-semibold' 
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/80 border border-transparent'
              }`}
              title="Menu Pengaturan Profil Pegawai"
            >
              <span className={`w-6 h-6 rounded-md flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-emerald-500/30 text-emerald-100 shadow-inner'
                  : 'bg-stone-800/90 text-stone-400 border border-stone-700/60 group-hover:text-emerald-300 group-hover:bg-stone-800 group-hover:border-emerald-500/40'
              }`}>
                <UserCheck className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="tracking-tight">Profil</span>
              {activeTab === 'profile' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-xs shadow-emerald-300 shrink-0" />
              )}
            </button>

            {/* Pemisah Halus antara Menu Utama & Tombol Utilitas */}
            <div className="h-5 w-px bg-stone-800/90 shrink-0 mx-0.5 hidden sm:block" />

            {/* Tombol Pasang Aplikasi Native / PWA */}
            <PWAInstallButton variant="compact" />

            {/* Tombol Segarkan / Perbarui Versi Aplikasi */}
            <ManualRefreshAppButton variant="header" />

          </nav>

          {/* Profil di Pojok Kanan Atas untuk Layar Desktop (md ke atas) */}
          <div className="hidden md:flex items-center gap-3">
            {userProfileBadgeElement}
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* QUICK NIP SELECTOR MODAL: DAFTAR KARYAWAN TERDAFTAR (CLOUD SYNCHRONIZED) */}
      {/* Memudahkan rekan kerja saat link dibagikan atau dibuka di Layar Utama */}
      {/* ========================================================================= */}
      {isNipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-stone-900 border border-emerald-500/30 rounded-2xl max-w-lg w-full shadow-2xl text-white overflow-hidden my-6">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-stone-800 bg-stone-950/70 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>KPS PVT I Manoko · Lembang</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Pilih NIP / Karyawan
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Ketuk nama atau nomor NIP Anda di bawah untuk langsung aktif. Data tersinkron dari Cloud Firebase sehingga otomatis tersedia di semua perangkat.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNipModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
                title="Tutup dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Toolbar */}
            <div className="px-5 py-3 bg-stone-950/40 border-b border-stone-800 flex items-center justify-between text-xs">
              <span className="text-stone-400 font-medium">
                {officers.length > 0 ? `${officers.length} Karyawan Terdaftar` : 'Memuat data...'}
              </span>

              <div className="flex items-center gap-2">
                {onRefreshOfficers && (
                  <button
                    type="button"
                    onClick={onRefreshOfficers}
                    disabled={isRefreshingOfficers}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                    title="Perbarui daftar dari Cloud Firestore"
                  >
                    <RefreshCw className={`w-3 h-3 text-emerald-400 ${isRefreshingOfficers ? 'animate-spin' : ''}`} />
                    <span>{isRefreshingOfficers ? 'Sinkron...' : 'Sinkron Cloud'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsNipModalOpen(false);
                    setActiveTab('epersonal');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-[11px] font-bold transition cursor-pointer"
                  title="Daftarkan rekan baru"
                >
                  <PlusCircle className="w-3 h-3 text-amber-300" />
                  <span>+ Karyawan Baru</span>
                </button>
              </div>
            </div>

            {/* Officers List */}
            <div className="p-4 sm:p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
              {officers.map((officer) => {
                const isSelected = cleanNipDigits(officer.nip) === currentNip;
                return (
                  <div
                    key={officer.nip}
                    onClick={() => handleSelectOfficer(officer)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/80 border-emerald-400 ring-1 ring-emerald-400 shadow-md'
                        : 'bg-stone-950/80 border-stone-800 hover:border-emerald-500/50 hover:bg-stone-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-800 border border-emerald-400/50 shrink-0 flex items-center justify-center">
                        {officer.fotoProfil ? (
                          <img src={officer.fotoProfil} alt={officer.nama} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-stone-300" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-white truncate uppercase">{officer.nama}</p>
                          {isSelected && (
                            <span className="text-[9px] bg-emerald-500 text-stone-950 font-black px-1.5 py-0.2 rounded-full uppercase">Aktif</span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-emerald-300 mt-0.5">{officer.nip}</p>
                        <p className="text-[10px] text-stone-400 truncate">{officer.statusKepegawaian || officer.jabatan}</p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {isSelected ? (
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-900/60 px-2.5 py-1.5 rounded-lg border border-emerald-500/40">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Dipilih</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectOfficer(officer);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          Pilih NIP Ini
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-950/80 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-stone-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>NIP otomatis disalin saat nama diketuk</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNipModalOpen(false);
                    setActiveTab('cloudsync');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold cursor-pointer transition"
                >
                  Masuk Akun Google ➔
                </button>
                <button
                  type="button"
                  onClick={() => setIsNipModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer transition"
                >
                  Selesai
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
