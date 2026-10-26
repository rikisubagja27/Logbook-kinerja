import React from 'react';
import { UserProfile } from '../types/logbook';

interface HeaderProps {
  activeTab: 'form' | 'list' | 'report' | 'profile';
  setActiveTab: (tab: 'form' | 'list' | 'report' | 'profile') => void;
  profile: UserProfile;
}

export function Header({ activeTab, setActiveTab, profile }: HeaderProps) {
  // Mengambil NIP dari profil aktif untuk link e-Personal otomatis
  const currentNip = profile?.nip || "";
  const ePersonalUrl = currentNip 
    ? `https://epersonal.pertanian.go.id/login?nip=${currentNip}` 
    : `https://epersonal.pertanian.go.id/login`;

  return (
    <header className="bg-stone-900 border-b border-emerald-500/20 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Bagian Logo dan Judul */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Logo Logbook Kinerja" 
              className="w-10 h-10 object-contain rounded-lg border border-emerald-500/30 bg-emerald-950 p-1"
            />
            <div>
              <h1 className="font-bold text-emerald-400 text-base sm:text-lg">Logbook Kinerja Kps 1 Manoko</h1>
              <p className="text-xs text-stone-400">PVTPP Kementerian Pertanian</p>
            </div>
          </div>
        </div>

        {/* Bagian Menu Navigasi & Link e-Personal */}
        <div className="flex items-center gap-2 sm:gap-4 text-sm font-medium overflow-x-auto w-full md:w-auto justify-center pb-1 md:pb-0">
          
          <button
            onClick={() => setActiveTab('form')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'form' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <span>+</span> Isi
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'list' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <span>≡</span> Rekap
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'report' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <span>📄</span> Laporan
          </button>

          {/* Link e-Personal Otomatis NIP */}
          <a 
            href={ePersonalUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg transition flex items-center gap-1 text-emerald-400 hover:bg-stone-800 hover:text-emerald-300"
            title="Buka e-Personal dengan NIP aktif"
          >
            <span>e-Personal</span>
            <span className="text-xs">↗</span>
          </a>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'profile' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <span>👤</span> Profil
          </button>

        </div>

      </div>
    </header>
  );
}
