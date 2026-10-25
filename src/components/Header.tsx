import React from 'react';
import { UserProfile } from '../types/logbook';
import { FileText, PlusCircle, List, User, ExternalLink } from 'lucide-react';

interface HeaderProps {
  activeTab: 'form' | 'list' | 'report' | 'profile';
  setActiveTab: (tab: 'form' | 'list' | 'report' | 'profile') => void;
  profile: UserProfile;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, profile }) => {
  return (
    <header className="sticky top-0 z-40 bg-stone-950/85 backdrop-blur-md border-b border-emerald-500/25 shadow-lg no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Zone 1: Brand Wordmark with User Logo */}
          <div 
            onClick={() => setActiveTab('form')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <img
              src="/assets/aistudio/Black_and_White_Simple_Typographic_Nochnick_Design_Studio_Logo_20261020_000522_0000_46128b6c.png"
              alt="Logo Logbook Kinerja KPS 1 Manoko"
              className="h-10 w-10 rounded-lg object-contain border border-emerald-400/40 shadow-xs bg-emerald-950/80 p-0.5 group-hover:border-emerald-300 transition-colors"
            />
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-white group-hover:text-emerald-300 transition-colors whitespace-nowrap">
                Logbook Kinerja KPS 1 Manoko
              </span>
              <span className="text-[11px] text-emerald-300/80 font-medium tracking-tight whitespace-nowrap">
                PVTPP · Kementerian Pertanian RI
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2 text-sm font-medium">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'form'
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 font-semibold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Isi Logbook</span>
            </button>

            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'list'
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 font-semibold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <List className="w-4 h-4 text-emerald-400" />
              <span>Rekap Harian</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'report'
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 font-semibold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Laporan Resmi</span>
            </button>

            {/* Link e-Personal Kementan RI */}
            <a
              href="https://epersonal.pertanian.go.id/login/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-600/25 border border-emerald-500/35 transition-colors whitespace-nowrap shrink-0 group text-sm font-medium"
              title="Buka Portal e-Personal Kementerian Pertanian RI (Tab Baru)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>e-Personal</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100 transition-opacity" />
            </a>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 font-semibold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>Profil Pegawai</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action / Active Officer Pill */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full border border-emerald-500/30 bg-white/10 hover:bg-white/15 transition-colors"
              title="Kelola Profil Pegawai"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-700 flex items-center justify-center text-white text-xs font-bold border border-emerald-400">
                {profile.fotoProfil ? (
                  <img
                    src={profile.fotoProfil}
                    alt={profile.nama}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profile.nama.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-white truncate max-w-[130px]">
                  {profile.nama}
                </span>
                <span className="text-[10px] text-emerald-300 truncate max-w-[130px]">
                  {profile.jabatan}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sub Navigation */}
      <div className="md:hidden flex items-center justify-around border-t border-emerald-500/20 bg-stone-950/90 px-2 py-1.5">
        <button
          onClick={() => setActiveTab('form')}
          className={`flex flex-col items-center gap-0.5 text-xs py-1 px-2 rounded ${
            activeTab === 'form' ? 'text-emerald-300 font-semibold' : 'text-stone-400'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Isi</span>
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex flex-col items-center gap-0.5 text-xs py-1 px-2 rounded ${
            activeTab === 'list' ? 'text-emerald-300 font-semibold' : 'text-stone-400'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Rekap</span>
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex flex-col items-center gap-0.5 text-xs py-1 px-2 rounded ${
            activeTab === 'report' ? 'text-emerald-300 font-semibold' : 'text-stone-400'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Laporan</span>
        </button>
        <a
          href="https://epersonal.pertanian.go.id/login/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-0.5 text-xs py-1 px-2 rounded text-emerald-400 hover:text-white"
          title="Buka Portal e-Personal Kementan RI"
        >
          <ExternalLink className="w-4 h-4" />
          <span>e-Personal</span>
        </a>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-0.5 text-xs py-1 px-2 rounded ${
            activeTab === 'profile' ? 'text-emerald-300 font-semibold' : 'text-stone-400'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profil</span>
        </button>
      </div>
    </header>
  );
};
