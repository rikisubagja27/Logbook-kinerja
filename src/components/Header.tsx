import React, { useState } from 'react';
import { UserProfile } from '../types/logbook';
import { cleanNipDigits, getEpersonalUrlWithNip } from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: 'form' | 'list' | 'report' | 'epersonal' | 'profile';
  setActiveTab: (tab: 'form' | 'list' | 'report' | 'epersonal' | 'profile') => void;
  profile: UserProfile;
}

export function Header({ activeTab, setActiveTab, profile }: HeaderProps) {
  // Mengambil NIP & nama dari profil aktif
  const currentNip = cleanNipDigits(profile?.nip);
  const currentName = profile?.nama || 'Pegawai';

  return (
    <header className="bg-stone-900 border-b border-emerald-500/20 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Bagian Logo, Judul & Status Akun Aktif */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="Logo Logbook Kinerja" 
              className="w-10 h-10 object-contain rounded-lg border border-emerald-500/30 bg-emerald-950 p-1"
            />
            <div>
              <h1 className="font-bold text-emerald-400 text-sm sm:text-base leading-tight">Logbook Kinerja Kps 1 Manoko</h1>
              <p className="text-[11px] text-stone-400">PVTPP Kementerian Pertanian</p>
            </div>
          </div>

          {/* Quick Active Officer Badge -> Links to e-Personal tab */}
          <button
            type="button"
            onClick={() => setActiveTab('epersonal')}
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-stone-800/90 hover:bg-stone-700/80 border border-emerald-500/30 text-left transition-all cursor-pointer group shadow-xs"
            title="Klik untuk membuka menu e-Personal & ganti data NIP karyawan"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <div className="min-w-0">
              <span className="text-[10px] text-stone-400 block uppercase leading-none">Aktif:</span>
              <span className="text-xs font-bold text-white block truncate max-w-[120px] sm:max-w-[150px] group-hover:text-emerald-300">
                {currentName}
              </span>
            </div>
          </button>
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

      </div>
    </header>
  );
}
