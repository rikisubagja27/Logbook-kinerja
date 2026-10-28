import React from 'react';
import { UserProfile } from '../types/logbook';
import { cleanNipDigits } from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';
import { User } from 'lucide-react';

interface HeaderProps {
  activeTab: 'form' | 'list' | 'report' | 'epersonal' | 'profile';
  setActiveTab: (tab: 'form' | 'list' | 'report' | 'epersonal' | 'profile') => void;
  profile: UserProfile;
}

export function Header({ activeTab, setActiveTab, profile }: HeaderProps) {
  // Mengambil NIP & nama dari profil aktif
  const currentNip = cleanNipDigits(profile?.nip);
  const currentName = profile?.nama || 'Pegawai';
  const profilePhoto = profile?.fotoProfil;

  // Komponen Profil di Pojok Kanan Atas: Foto tanpa frame luar pembungkus, di bawahnya Icon Hijau Aktif & Nama
  const UserProfileBadge = () => (
    <button
      type="button"
      onClick={() => setActiveTab('profile')}
      className="flex flex-col items-center justify-center text-center cursor-pointer group active:scale-95 transition-transform focus:outline-none"
      title={`Profil Pegawai: ${currentName} (Klik untuk membuka profil / ganti foto)`}
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
      <div className="flex items-center justify-center gap-1.5 mt-1 max-w-[105px] sm:max-w-[130px]">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        <span className="text-[10px] sm:text-[11px] font-bold text-white truncate group-hover:text-emerald-300 uppercase leading-tight">
          {currentName}
        </span>
      </div>
    </button>
  );

  return (
    <header className="bg-stone-900 border-b border-emerald-500/20 text-white sticky top-0 z-50 no-print print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-2.5">
        
        {/* Bagian Logo Kiri & Badge Profil Kanan (Khusus Mobile: Berada di baris atas sejajar) */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-2.5">
            <img 
              src="/app_logo.png" 
              alt="Logo Logbook Kinerja" 
              className="w-10 h-10 object-contain rounded-xl border border-emerald-500/40 bg-[#022c1e] p-0.5 shadow-md"
            />
            <div>
              <h1 className="font-bold text-emerald-400 text-sm sm:text-base leading-tight">Logbook Kinerja Kps 1 Manoko</h1>
              <p className="text-[11px] text-stone-400">PVTPP Kementerian Pertanian</p>
            </div>
          </div>

          {/* Profil di Pojok Kanan Atas untuk Layar Mobile */}
          <div className="md:hidden">
            <UserProfileBadge />
          </div>
        </div>

        {/* Bagian Menu Navigasi (Isi, Rekap, Laporan, e-Personal, Profil) */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium overflow-x-auto w-full md:w-auto justify-center pb-1 md:pb-0">
          
          <button
            onClick={() => setActiveTab('form')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'form' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <span>+</span> Isi
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'list' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <span>≡</span> Rekap
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'report' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <span>📄</span> Laporan
          </button>

          {/* Menu Halaman e-Personal & Data NIP Pegawai */}
          <button
            type="button"
            onClick={() => setActiveTab('epersonal')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer font-semibold ${
              activeTab === 'epersonal'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
            title="Menu e-Personal & Pengelolaan Data NIP Karyawan"
          >
            <span>🏢</span>
            <span>e-Personal</span>
            {currentNip && (
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-1 py-0.2 rounded font-mono hidden xl:inline">
                {currentNip.slice(0, 8)}...
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profile' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <span>👤</span> Profil
          </button>

          {/* Tombol Pasang Aplikasi Native / PWA */}
          <PWAInstallButton variant="compact" />

        </div>

        {/* Profil di Pojok Kanan Atas untuk Layar Desktop (md ke atas) */}
        <div className="hidden md:flex items-center">
          <UserProfileBadge />
        </div>

      </div>
    </header>
  );
}
